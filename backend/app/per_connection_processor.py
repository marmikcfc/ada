"""
Ada Interaction Engine - Per-Connection Processor

This module implements isolated message processing for each WebSocket connection,
handling MCP client interactions and visualization provider streaming.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Any, Optional

from app.models import ConnectionState
from app.queues import (
    create_text_chat_response, create_c1_token, create_chat_done,
    create_enhancement_started
)
from schemas import EnhancementDecision
from app.viz_provider_factory import create_enhanced_system_prompt

logger = logging.getLogger(__name__)

class PerConnectionProcessor:
    """
    Processor for handling messages within a single connection context.
    Each connection gets its own instance with isolated resources.
    """
    
    def __init__(self, context):
        self.context = context
        self.connection_id = context.connection_id
        self.running = False
        
    async def run(self):
        """Main processing loop for this connection"""
        self.running = True
        logger.info(f"Starting processor for connection {self.connection_id}")
        
        try:
            while self.running and self.context.state == ConnectionState.ACTIVE:
                await self._process_next_message()
                
        except asyncio.CancelledError:
            logger.info(f"Processor cancelled for connection {self.connection_id}")
        except Exception as e:
            logger.error(f"Processor error for connection {self.connection_id}: {e}", exc_info=True)
        finally:
            self.running = False
            logger.info(f"Processor stopped for connection {self.connection_id}")
    
    async def _process_next_message(self):
        """Process the next message from the raw output queue"""
        try:
            # Get next item from connection's raw output queue
            item = await asyncio.wait_for(
                self.context.raw_output_queue.get(), 
                timeout=1.0
            )
            
            await self._process_message_item(item)
            self.context.raw_output_queue.task_done()
            
        except asyncio.TimeoutError:
            # No message available, continue loop
            pass
        except Exception as e:
            logger.error(f"Error processing message for {self.connection_id}: {e}")
    
    async def _process_message_item(self, item: Dict[str, Any]):
        """Process a single message item"""
        try:
            assistant_response = item.get("assistant_response", "")
            conversation_history = item.get("history", [])
            metadata = item.get("metadata", {})
            
            if not assistant_response:
                logger.warning(f"Empty assistant response for connection {self.connection_id}")
                return
            
            logger.info(f"Processing message for {self.connection_id}: {assistant_response[:100]}...")
            
            # Update connection metrics
            self.context.metrics.messages_received += 1
            
            # Step 1: Make enhancement decision using connection's MCP client
            enhancement_decision = await self._make_enhancement_decision(
                assistant_response, conversation_history
            )
            
            logger.info(f"Enhancement decision for {self.connection_id}: {enhancement_decision.displayEnhancement}")
            
            # Step 2: Process based on enhancement decision
            if enhancement_decision.displayEnhancement:
                await self._process_with_enhancement(
                    enhancement_decision, conversation_history, metadata
                )
            else:
                await self._process_without_enhancement(
                    assistant_response, metadata
                )
                
        except Exception as e:
            logger.error(f"Error processing message item for {self.connection_id}: {e}", exc_info=True)
            await self._send_error_response(str(e), metadata)
    
    async def _make_enhancement_decision(
        self, 
        assistant_response: str, 
        conversation_history: List[Dict[str, Any]]
    ) -> EnhancementDecision:
        """Make enhancement decision using connection's MCP client"""
        try:
            if not self.context.mcp_client:
                logger.warning(f"No MCP client for connection {self.connection_id}")
                return EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText=assistant_response,
                    voiceOverText=""
                )
            
            # Update metrics
            self.context.metrics.mcp_calls += 1
            
            # Use streaming enhancement decision for better performance
            decision = await self.context.mcp_client.make_enhancement_decision_streaming(
                assistant_response=assistant_response,
                conversation_history=conversation_history,
                voice_injection_callback=None  # No voice injection for text chat
            )
            
            return decision
            
        except Exception as e:
            logger.error(f"MCP enhancement decision failed for {self.connection_id}: {e}")
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=""
            )
    
    async def _process_with_enhancement(
        self, 
        decision: EnhancementDecision, 
        conversation_history: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ):
        """Process message with visual enhancement"""
        try:
            # Send enhancement started indicator
            enhancement_msg = create_enhancement_started("Generating enhanced display...")
            await self._send_to_frontend(enhancement_msg)
            
            # Get message ID for streaming correlation
            message_id = metadata.get("message_id", str(uuid.uuid4()))
            thread_id = metadata.get("thread_id")
            
            # Check if we have a visualization provider
            if not self.context.visualization_provider:
                logger.warning(f"No visualization provider for connection {self.connection_id}")
                await self._send_simple_response(decision.displayEnhancedText, thread_id)
                return
            
            # Update metrics
            self.context.metrics.viz_requests += 1
            
            # Prepare messages for visualization
            messages_for_viz = await self._prepare_visualization_messages(
                decision.displayEnhancedText, conversation_history
            )
            
            # Stream visualization response
            await self._stream_visualization_response(
                messages_for_viz, message_id, thread_id
            )
            
        except Exception as e:
            logger.error(f"Enhancement processing failed for {self.connection_id}: {e}")
            await self._send_error_response(str(e), metadata)
    
    async def _process_without_enhancement(
        self, 
        assistant_response: str, 
        metadata: Dict[str, Any]
    ):
        """Process message without enhancement"""
        thread_id = metadata.get("thread_id")
        await self._send_simple_response(assistant_response, thread_id)
    
    async def _prepare_visualization_messages(
        self, 
        enhanced_text: str, 
        conversation_history: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prepare messages for visualization provider"""
        # Get base system prompt from provider
        base_prompt = self.context.visualization_provider.get_system_prompt()
        
        # Enhance with MCP tools if available
        mcp_tools = []
        if self.context.mcp_client:
            mcp_tools = self.context.mcp_client.get_tools()
        
        system_prompt = create_enhanced_system_prompt(base_prompt, mcp_tools)
        
        # Build message chain
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add relevant conversation history
        if conversation_history:
            for msg in conversation_history[-3:]:  # Last 3 messages for context
                if msg.get("role") in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"], 
                        "content": msg["content"]
                    })
        
        # Add the enhanced response
        messages.append({"role": "assistant", "content": enhanced_text})
        
        return messages
    
    async def _stream_visualization_response(
        self, 
        messages: List[Dict[str, Any]], 
        message_id: str, 
        thread_id: Optional[str]
    ):
        """Stream visualization response to frontend"""
        try:
            chunk_count = 0
            
            # Stream chunks from visualization provider
            async for chunk in self.context.visualization_provider.stream_response(messages):
                chunk_count += 1
                
                # Send chunk to frontend
                chunk_msg = create_c1_token(id=message_id, content=chunk)
                await self._send_to_frontend(chunk_msg)
                
                # Small delay for smooth streaming
                await asyncio.sleep(0.01)
            
            # Send completion signal
            done_msg = create_chat_done(id=message_id)
            await self._send_to_frontend(done_msg)
            
            logger.info(f"Streamed {chunk_count} chunks for connection {self.connection_id}")
            
        except Exception as e:
            logger.error(f"Visualization streaming failed for {self.connection_id}: {e}")
            # Send fallback simple response
            await self._send_simple_response(
                "Failed to generate enhanced visualization", thread_id
            )
    
    async def _send_simple_response(self, content: str, thread_id: Optional[str]):
        """Send a simple text response without enhancement"""
        try:
            # Create simple card component
            simple_card = {
                "component": {
                    "component": "Card",
                    "props": {
                        "children": [{
                            "component": "TextContent",
                            "props": {
                                "textMarkdown": content
                            }
                        }]
                    }
                }
            }
            
            response_content = f'<content>{json.dumps(simple_card)}</content>'
            
            response_msg = create_text_chat_response(
                content=response_content,
                thread_id=thread_id
            )
            
            await self._send_to_frontend(response_msg)
            
        except Exception as e:
            logger.error(f"Failed to send simple response for {self.connection_id}: {e}")
    
    async def _send_error_response(self, error_message: str, metadata: Dict[str, Any]):
        """Send error response to frontend"""
        try:
            self.context.metrics.errors += 1
            
            error_card = {
                "component": "Callout",
                "props": {
                    "variant": "error",
                    "title": "Processing Error",
                    "description": f"Failed to process your message: {error_message}"
                }
            }
            
            error_content = f'<content>{json.dumps(error_card)}</content>'
            thread_id = metadata.get("thread_id")
            
            error_msg = create_text_chat_response(
                content=error_content,
                thread_id=thread_id
            )
            
            await self._send_to_frontend(error_msg)
            
        except Exception as e:
            logger.error(f"Failed to send error response for {self.connection_id}: {e}")
    
    async def _send_to_frontend(self, message: Dict[str, Any]):
        """Send message to frontend via connection's queue"""
        try:
            await self.context.message_queue.put(message)
            self.context.metrics.messages_sent += 1
            
        except Exception as e:
            logger.error(f"Failed to enqueue message for {self.connection_id}: {e}")
    
    def stop(self):
        """Stop the processor"""
        self.running = False