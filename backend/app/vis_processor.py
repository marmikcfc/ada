"""
Ada Interaction Engine - Visualization Processor Module

This module implements the Slow Path enhancement pipeline for voice messages.
It processes raw LLM output from the fast path, determines if enhancement is needed,
conditionally calls the Thesys Visualize API, and formats the response for the frontend.

Flow:
1. Dequeue raw LLM output from voice interface
2. Process through MCP Enhancement Agent to determine if enhancement is needed
3. If enhancement is needed, call Thesys Visualize API
4. Format and enqueue the final response for the frontend
"""

import asyncio
import logging
import json
import uuid
from typing import Dict, List, Any, Optional

from openai import AsyncOpenAI

from app.config import config
from app.queues import (
    get_raw_llm_output,
    mark_raw_llm_output_done,
    enqueue_llm_message,
    create_voice_response
)
from utils.thesys_prompts import format_thesys_messages_for_visualize

logger = logging.getLogger(__name__)

class VisualizationProcessor:
    """
    Processor for enhancing voice messages with rich UI components.
    
    This class handles the slow path processing pipeline:
    - Takes raw LLM output from the fast path
    - Determines if enhancement is needed via MCP agent
    - Conditionally calls Thesys Visualize API
    - Formats and enqueues the final response
    """
    
    def __init__(self, enhanced_mcp_client, thesys_client: Optional[AsyncOpenAI] = None):
        """
        Initialize the visualization processor
        
        Args:
            enhanced_mcp_client: The enhanced MCP client for making enhancement decisions
            thesys_client: Optional Thesys client for visualization
        """
        self.enhanced_mcp_client = enhanced_mcp_client
        self.thesys_client = thesys_client
        self.running = False
        self.task = None
        
    async def start(self):
        """Start the visualization processor as a background task"""
        if self.running:
            logger.warning("Visualization processor already running")
            return
            
        self.running = True
        self.task = asyncio.create_task(self.process_loop())
        logger.info("Visualization processor started")
        
    async def stop(self):
        """Stop the visualization processor"""
        if not self.running:
            logger.warning("Visualization processor not running")
            return
            
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                logger.info("Visualization processor loop cancelled")
            self.task = None
        logger.info("Visualization processor stopped")
        
    async def process_loop(self):
        """
        Main processing loop for the visualization processor
        
        This loop:
        1. Dequeues raw LLM output from the fast path
        2. Processes it through the MCP Enhancement Agent
        3. Conditionally calls Thesys Visualize API
        4. Formats and enqueues the final response
        """
        logger.info("Visualization processor loop started for VOICE messages")
        
        while self.running:
            item = None
            got_item = False
            try:
                # Wait for item from raw_llm_output_queue
                logger.debug("Visualization processor: Waiting for item from raw_llm_output_queue...")
                item = await get_raw_llm_output()
                got_item = True  # Flag to indicate we got an item from the queue
                logger.info("Visualization processor: Received item from raw_llm_output_queue")
                
                # Extract data from the queue item
                conversation_history: List[Dict[str, Any]] = item.get("history", [])
                assistant_response: str = item.get("assistant_response")
                metadata: Dict[str, Any] = item.get("metadata", {})
                
                if not assistant_response:
                    logger.warning("Visualization processor received empty assistant response")
                    continue
                    
                logger.info(f"Visualization processor: Original voice response length: {len(assistant_response)} chars")
                
                # Step 1: Process through MCP agent to determine if enhancement is needed
                try:
                    logger.info("Visualization processor: Processing assistant response through MCP agent...")
                    
                    enhancement_decision = await self.enhanced_mcp_client.make_enhancement_decision(
                        assistant_response=assistant_response,
                        conversation_history=conversation_history
                    )
                    
                    logger.info(f"Visualization processor: MCP agent decision - Enhancement: {enhancement_decision.displayEnhancement}")
                    
                except Exception as e:
                    logger.error(f"Visualization processor: Error in MCP agent call: {e}", exc_info=True)
                    # Fallback decision - no enhancement
                    from src.mcp.enhanced_mcp_client import EnhancementDecision
                    enhancement_decision = EnhancementDecision(
                        displayEnhancement=False,
                        displayEnhancedText=assistant_response,
                        voiceOverText=assistant_response
                    )
                    logger.info("Visualization processor: Using fallback decision (no enhancement)")
                
                # Extract decision components
                display_enhancement = enhancement_decision.displayEnhancement
                display_text = enhancement_decision.displayEnhancedText
                voice_text = enhancement_decision.voiceOverText
                
                # Step 2: Conditionally process with Thesys or create simple card
                if display_enhancement and self.thesys_client:
                    logger.info("Visualization processor: Enhancement requested, sending to Thesys Visualize API...")
                    
                    try:
                        # Format messages for Thesys Visualize API
                        messages_for_thesys = format_thesys_messages_for_visualize(
                            display_text, 
                            conversation_history
                        )
                        
                        # Call Thesys Visualize API
                        completion = await self.thesys_client.chat.completions.create(
                            messages=messages_for_thesys,
                            model=config.model.thesys_model,
                            stream=False
                        )
                        
                        visualized_ui_payload = completion.choices[0].message.content
                        logger.info(f"Visualization processor: Received UI payload from Thesys")
                        
                    except Exception as e:
                        logger.error(f"Visualization processor: Error calling Thesys Visualize API: {e}", exc_info=True)
                        # Fallback to simple card
                        error_component = {
                            "component": "Callout",
                            "props": {
                                "variant": "warning",
                                "title": "Visualization Error", 
                                "description": f"Failed to generate UI: {str(e)}"
                            }
                        }
                        visualized_ui_payload = f'<content>{json.dumps(error_component)}</content>'
                else:
                    logger.info("Visualization processor: No enhancement needed or Thesys unavailable, creating simple text card...")
                    
                    # Create a simple card with text content
                    # NOTE: The frontend expects the same nested structure that
                    # legacy main.py produced: a top-level "component" whose value
                    # is *another* component definition.  Keep this exact shape
                    # to avoid empty-bubble issues.
                    simple_card = {
                        "component": {
                            "component": "Card",
                            "props": {
                                "children": [
                                    {
                                        "component": "TextContent",
                                        "props": {
                                            "textMarkdown": display_text
                                        }
                                    }
                                ]
                            }
                        }
                    }
                    visualized_ui_payload = f'<content>{json.dumps(simple_card)}</content>'
                
                # Step 3: Prepare message for frontend
                voice_over_text = voice_text if voice_text != display_text else None
                message_for_frontend = create_voice_response(
                    content=visualized_ui_payload,
                    voice_text=voice_over_text
                )
                
                logger.info(f"Visualization processor: Prepared message for frontend with ID: {message_for_frontend['id']}")
                
                # Step 4: Enqueue the message for the frontend
                await enqueue_llm_message(message_for_frontend)
                logger.info(f"Visualization processor: Successfully sent payload to frontend queue")
                
            except asyncio.CancelledError:
                # Don't mark task as done when cancelled - just propagate the cancellation
                raise
            except Exception as e:
                logger.error(f"Critical error in visualization_processor loop: {e}", exc_info=True)
                
                # Put an error message on llm_message_queue for the client
                error_card = {
                    "component": "Callout",
                    "props": {
                        "variant": "warning",
                        "title": "System Error",
                        "description": "A system error occurred while generating UI for voice response."
                    }
                }
                
                error_message = create_voice_response(
                    content=f'<content>{json.dumps(error_card)}</content>'
                )
                
                try:
                    await enqueue_llm_message(error_message)
                except Exception as enqueue_error:
                    logger.error(f"Failed to enqueue error message: {enqueue_error}", exc_info=True)
            finally:
                # Only mark the task as done if we actually got an item from the queue
                if got_item:
                    # Mark the task as done
                    mark_raw_llm_output_done()
        
        logger.info("Visualization processor loop ended")

async def create_visualization_processor(enhanced_mcp_client, thesys_client=None):
    """
    Create and start a visualization processor
    
    Args:
        enhanced_mcp_client: The enhanced MCP client
        thesys_client: Optional Thesys client
        
    Returns:
        The started visualization processor
    """
    processor = VisualizationProcessor(
        enhanced_mcp_client=enhanced_mcp_client,
        thesys_client=thesys_client
    )
    await processor.start()
    return processor
