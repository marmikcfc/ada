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
    create_text_chat_response, create_c1_token, create_html_token, create_chat_done,
    create_enhancement_started, get_content_type_for_provider, create_voice_response,
    broadcast_voice_message
)
from utils.html_templates import create_simple_message_html, create_error_message_html, escape_html, ensure_html_wrapped
from schemas import EnhancementDecision
from app.viz_provider_factory import create_enhanced_system_prompt

logger = logging.getLogger(__name__)

async def send_message_to_frontend(message: dict, connection_context, source: str = "text_chat"):
    """
    Send message to frontend using appropriate method based on message type.
    Voice messages are broadcasted, other messages use per-connection queue.
    """
    if message.get('type') in ['voice_response', 'immediate_voice_response', 'user_transcription']:
        # Broadcast voice messages to all relevant connections
        delivery_count = await broadcast_voice_message(message)
        logger.info(f"Broadcasted {message.get('type')} to {delivery_count} subscribers (source: {source})")
    else:
        # Use per-connection queue for non-voice messages
        await connection_context.message_queue.put(message)
        logger.info(f"Enqueued {message.get('type')} to per-connection queue (source: {source})")

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
                assistant_response, conversation_history, metadata
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
        conversation_history: List[Dict[str, Any]],
        metadata: Dict[str, Any] = None
    ) -> EnhancementDecision:
        """Make enhancement decision using connection's MCP client"""
        
        # Check if we should bypass enhancement decision for text_chat
        if metadata and metadata.get("source") == "text_chat":
            logger.info(f"Bypassing enhancement decision for text_chat source in connection {self.connection_id}")
            return EnhancementDecision(
                displayEnhancement=True,  # Still show enhanced UI
                displayEnhancedText=assistant_response,
                voiceOverText=None
            )
        
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
            
            # For voice-agent sources, use voice injection callback for TTS
            voice_injection_callback = None
            if metadata and metadata.get("source") == "voice-agent":
                voice_injection_callback = self._inject_voice_over_callback
            
            # Use streaming enhancement decision for better performance
            decision = await self.context.mcp_client.make_enhancement_decision_streaming(
                assistant_response=assistant_response,
                conversation_history=conversation_history,
                voice_injection_callback=voice_injection_callback
            )
            
            return decision
            
        except Exception as e:
            logger.error(f"MCP enhancement decision failed for {self.connection_id}: {e}")
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=""
            )
    
    async def _inject_voice_over_callback(self, voice_text: str):
        """Callback for injecting voice-over text to this connection's voice agent"""
        try:
            # Get voice manager to inject TTS to this specific connection
            from app.voice_manager import voice_manager
            
            # Try to inject by connection ID first, then by voice thread if available
            success = await voice_manager.inject_tts_voice_over(
                voice_text=voice_text,
                target_connection_id=self.connection_id,
                target_thread_id=self.context.voice_thread_id
            )
            
            if success:
                logger.info(f"Injected voice-over to connection {self.connection_id}: '{voice_text[:50]}...'")
            else:
                logger.warning(f"Failed to inject voice-over to connection {self.connection_id}")
                
        except Exception as e:
            logger.error(f"Error in voice-over injection callback for {self.connection_id}: {e}")
    
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
                source = metadata.get("source", "text_chat")
                await self._send_simple_response(decision.displayEnhancedText, thread_id, source)
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
        source = metadata.get("source", "text_chat")
        await self._send_simple_response(assistant_response, thread_id, source)
    
    async def _prepare_visualization_messages(
        self, 
        enhanced_text: str, 
        conversation_history: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prepare messages for visualization provider"""
        # Get framework preference from client configuration
        framework = "inline"  # Default fallback
        if (hasattr(self.context, 'config') and 
            self.context.config and 
            hasattr(self.context.config, 'preferences') and 
            self.context.config.preferences):
            framework = self.context.config.preferences.get('ui_framework', 'inline')
        
        # Get base system prompt from provider (with framework support for OpenAI)
        provider_type = getattr(self.context.visualization_provider, 'provider_type', '').lower()
        if provider_type == 'openai' and hasattr(self.context.visualization_provider, 'get_system_prompt'):
            # OpenAI provider supports framework-specific prompts
            base_prompt = self.context.visualization_provider.get_system_prompt(framework)
        else:
            # Other providers use default prompts
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
                
                # Send chunk to frontend using appropriate token type based on provider
                provider_type = self.context.visualization_provider.provider_type.lower()
                if provider_type in ['openai', 'anthropic', 'google']:
                    # HTML-based providers
                    chunk_msg = create_html_token(id=message_id, content=chunk)
                else:
                    # C1-based providers (TheSys, Tomorrow, etc.)
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
                "Failed to generate enhanced visualization", thread_id, "text_chat"
            )
    
    async def _send_simple_response(self, content: str, thread_id: Optional[str], source: str = "text_chat"):
        """Send a simple text response without enhancement"""
        try:
            # Get provider type and framework preference
            provider_type = getattr(self.context.visualization_provider, 'provider_type', 'thesys')
            content_type = get_content_type_for_provider(provider_type)
            
            # Generate content based on provider type
            if content_type == "html":
                # For HTML providers (OpenAI, Anthropic), generate framework-specific HTML
                framework = "tailwind"  # Default framework
                if (hasattr(self.context, 'config') and 
                    self.context.config and 
                    hasattr(self.context.config, 'preferences') and 
                    self.context.config.preferences):
                    framework = self.context.config.preferences.get('ui_framework', 'tailwind')
                
                # Escape content to prevent XSS
                safe_content = escape_html(content)
                response_content = create_simple_message_html(safe_content, framework)
                # Ensure HTML is properly wrapped
                response_content = ensure_html_wrapped(response_content, framework)
            else:
                # For C1 providers (TheSys, Tomorrow), use C1Component format
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
            
            # Determine framework for response
            framework = None
            if content_type == "html":
                framework = "tailwind"  # Default framework
                if (hasattr(self.context, 'config') and 
                    self.context.config and 
                    hasattr(self.context.config, 'preferences') and 
                    self.context.config.preferences):
                    framework = self.context.config.preferences.get('ui_framework', 'tailwind')
            else:
                framework = "c1"  # C1 framework for C1Component content
            
            # Create appropriate response type based on source
            if source == "voice-agent":
                response_msg = create_voice_response(
                    content=response_content,
                    content_type=content_type,
                    framework=framework,
                    voice_text=""  # No voice text for simple responses
                )
            else:
                response_msg = create_text_chat_response(
                    content=response_content,
                    content_type=content_type,
                    framework=framework,
                    thread_id=thread_id
                )
            
            await self._send_to_frontend(response_msg)
            
        except Exception as e:
            logger.error(f"Failed to send simple response for {self.connection_id}: {e}")
    
    async def _send_error_response(self, error_message: str, metadata: Dict[str, Any]):
        """Send error response to frontend"""
        try:
            self.context.metrics.errors += 1
            
            # Get provider type and framework preference
            provider_type = getattr(self.context.visualization_provider, 'provider_type', 'thesys')
            content_type = get_content_type_for_provider(provider_type)
            thread_id = metadata.get("thread_id")
            
            # Generate content based on provider type
            if content_type == "html":
                # For HTML providers (OpenAI, Anthropic), generate framework-specific HTML
                framework = "tailwind"  # Default framework
                if (hasattr(self.context, 'config') and 
                    self.context.config and 
                    hasattr(self.context.config, 'preferences') and 
                    self.context.config.preferences):
                    framework = self.context.config.preferences.get('ui_framework', 'tailwind')
                
                # Escape error message to prevent XSS
                safe_error_message = escape_html(f"Failed to process your message: {error_message}")
                error_content = create_error_message_html(safe_error_message, framework)
                # Ensure HTML is properly wrapped
                error_content = ensure_html_wrapped(error_content, framework)
            else:
                # For C1 providers (TheSys, Tomorrow), use C1Component format
                error_card = {
                    "component": "Callout",
                    "props": {
                        "variant": "error",
                        "title": "Processing Error",
                        "description": f"Failed to process your message: {error_message}"
                    }
                }
                error_content = f'<content>{json.dumps(error_card)}</content>'
            
            # Determine framework for error response
            framework = None
            if content_type == "html":
                framework = "tailwind"  # Default framework
                if (hasattr(self.context, 'config') and 
                    self.context.config and 
                    hasattr(self.context.config, 'preferences') and 
                    self.context.config.preferences):
                    framework = self.context.config.preferences.get('ui_framework', 'tailwind')
            else:
                framework = "c1"  # C1 framework for C1Component content
            
            # Create appropriate response type based on source
            source = metadata.get("source", "text_chat")
            if source == "voice-agent":
                error_msg = create_voice_response(
                    content=error_content,
                    content_type=content_type,
                    framework=framework,
                    voice_text=""  # No voice text for error responses
                )
            else:
                error_msg = create_text_chat_response(
                    content=error_content,
                    content_type=content_type,
                    framework=framework,
                    thread_id=thread_id
                )
            
            await self._send_to_frontend(error_msg)
            
        except Exception as e:
            logger.error(f"Failed to send error response for {self.connection_id}: {e}")
    
    async def _send_to_frontend(self, message: Dict[str, Any]):
        """Send message to frontend via appropriate method based on message type"""
        try:
            await send_message_to_frontend(message, self.context, "per_connection_processor")
            self.context.metrics.messages_sent += 1
            
        except Exception as e:
            logger.error(f"Failed to send message for {self.connection_id}: {e}")
    
    def stop(self):
        """Stop the processor"""
        self.running = False