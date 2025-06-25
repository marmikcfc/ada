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
5. NEW: Inject voice-over text into TTS pipeline using TTSSpeakFrame
"""

import asyncio
import logging
import json
import uuid
import difflib
from typing import Dict, List, Any, Optional, Set, AsyncGenerator
from weakref import WeakSet

from openai import AsyncOpenAI
from schemas import EnhancementDecision
from app.config import config
from app.queues import (
    get_raw_llm_output,
    mark_raw_llm_output_done,
    enqueue_llm_message,
    create_enhancement_started,   # NEW – interim loading indicator
    create_voice_response,
    create_text_chat_response,
    create_c1_token,
    create_chat_done
)
from utils.thesys_prompts import format_thesys_messages_for_visualize, load_thesys_prompt

logger = logging.getLogger(__name__)

# Global registry for active voice agents - using WeakSet for automatic cleanup
_active_voice_agents: WeakSet = WeakSet()


def register_voice_agent(agent):
    """Register a voice agent so the visualization processor can inject TTS"""
    _active_voice_agents.add(agent)
    logger.info(f"Registered voice agent. Total active agents: {len(_active_voice_agents)}")


def unregister_voice_agent(agent):
    """Unregister a voice agent"""
    _active_voice_agents.discard(agent)
    logger.info(f"Unregistered voice agent. Total active agents: {len(_active_voice_agents)}")


async def inject_voice_over_to_all_agents(voice_text: str):
    """Inject voice-over text to all active voice agents"""
    if not voice_text or not voice_text.strip():
        logger.debug("No voice text to inject")
        return

    if not _active_voice_agents:
        logger.warning("No active voice agents to inject TTS voice-over")
        return

    logger.info(f"Injecting voice-over text to {len(_active_voice_agents)} active voice agents")

    # Inject to all active agents
    injection_tasks = []
    for agent in list(_active_voice_agents):  # Create list to avoid modification during iteration
        try:
            injection_tasks.append(agent.inject_tts_voice_over(voice_text))
        except Exception as e:
            logger.error(f"Error preparing TTS injection for agent: {e}")

    if injection_tasks:
        # Execute all injections concurrently
        try:
            await asyncio.gather(*injection_tasks, return_exceptions=True)
            logger.info(f"Voice-over text injected to {len(injection_tasks)} agents")
        except Exception as e:
            logger.error(f"Error during concurrent TTS injection: {e}")


def is_significantly_different(text1: str, text2: str, threshold: float = 0.2) -> bool:
    """
    Determine if two text strings are significantly different.

    Args:
        text1: First text string
        text2: Second text string
        threshold: Difference threshold (0.0 to 1.0) where higher means more difference required

    Returns:
        True if texts are significantly different, False if similar
    """
    # Normalize texts for comparison
    text1 = text1.strip().lower()
    text2 = text2.strip().lower()

    # Quick check for identical texts
    if text1 == text2:
        return False

    # Use difflib to calculate similarity ratio (0.0 to 1.0)
    similarity = difflib.SequenceMatcher(None, text1, text2).ratio()

    # Lower similarity means higher difference
    difference = 1.0 - similarity

    logger.debug(f"Text similarity: {similarity:.2f}, difference: {difference:.2f}, threshold: {threshold}")

    # Return True if difference exceeds threshold
    return difference > threshold


class VisualizationProcessor:
    """
    Processor for enhancing voice messages with rich UI components.

    This class handles the slow path processing pipeline:
    - Takes raw LLM output from the fast path
    - Determines if enhancement is needed via MCP agent
    - Conditionally calls Thesys Visualize API
    - Formats and enqueues the final response
    - NEW: Injects voice-over text into TTS pipeline via TTSSpeakFrame
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

    # ------------------------------------------------------------------ #
    #  Streaming helper                                                  #
    # ------------------------------------------------------------------ #
    async def stream_thesys_response(
        self,
        messages_for_thesys: List[Dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """
        Stream a Thesys Visualize API response and yield payload chunks.

        Args:
            messages_for_thesys: OpenAI-compatible message list prepared
                                 for the Thesys model.

        Yields:
            str – incremental fragments of the C1Component payload.
        """
        if not self.thesys_client:
            logger.warning("Thesys client not initialised – cannot stream UI.")
            return

        try:
            stream = await self.thesys_client.chat.completions.create(
                messages=messages_for_thesys,
                model=config.model.thesys_model,
                stream=True,
            )

            async for chunk in stream:
                # Thesys returns delta objects identical to OpenAI format
                if chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            # Log and silently terminate the generator so callers can fall back
            logger.error(
                f"Visualization processor: Error while streaming Thesys response: {e}",
                exc_info=True,
            )
            return

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
                logger.info("Visualization processor: Waiting for item from raw_llm_output_queue...")
                item = await get_raw_llm_output()
                bypass_enhancement = False
                got_item = True  # Flag to indicate we got an item from the queue
                if item["metadata"]["source"] == "text_chat":
                    logger.info("Visualization processor: Received text chat item from raw_llm_output_queue so bypassing it directly for enhancement")
                    bypass_enhancement = True
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

                    # Create voice injection callback for real-time TTS
                    async def voice_injection_callback(voice_text: str):
                        """Inject voice text immediately to active voice agents"""
                        if voice_text and voice_text.strip():
                            logger.info(f"Injecting streaming voice text: '{voice_text}'")
                            await inject_voice_over_to_all_agents(voice_text.strip())
                   
                    # Use streaming enhancement decision for better latency
                    if not bypass_enhancement:
                        logger.info(f"Visualization processor: Making enhancement decision with streaming")
                        enhancement_decision = await self.enhanced_mcp_client.make_enhancement_decision_streaming(
                            assistant_response=assistant_response,
                            conversation_history=conversation_history,
                            voice_injection_callback=voice_injection_callback
                        )
                    else:
                        logger.info(f"Visualization processor: Bypassing enhancement decision, {assistant_response}")
                        enhancement_decision = EnhancementDecision(
                            displayEnhancement=True,
                            displayEnhancedText=assistant_response,
                            voiceOverText=None
                        )
                        logger.info("Visualization processor: Used streaming enhancement decision")

                    logger.info(f"Visualization processor: MCP agent decision - Enhancement: {enhancement_decision}")

                except Exception as e:
                    logger.error(f"Visualization processor: Error in MCP agent call: {e}", exc_info=True)

                    enhancement_decision = EnhancementDecision(
                        displayEnhancement=False,
                        displayEnhancedText=assistant_response,
                        voiceOverText=""  # Empty voice-over to avoid duplicate audio
                    )
                    logger.info("Visualization processor: Using fallback decision (no enhancement)")

                # Extract decision components
                display_enhancement = enhancement_decision.displayEnhancement
                display_text = enhancement_decision.displayEnhancedText
                voice_text = enhancement_decision.voiceOverText

                # Check if this is a voice message where an immediate response was already sent
                source = metadata.get("source", "voice-agent")  # Default to voice for backward compatibility

                # ------------------------------------------------------------------ #
                #  NEW: Notify frontend that visual enhancement has started
                # ------------------------------------------------------------------ #
                # We do this **only** for the voice path and **only** when the MCP
                # agent asked for `displayEnhancement=True`.  The frontend uses
                # this interim message to show a subtle "Generating enhanced
                # display…" indicator until the final <voice_response> arrives.
                if(display_enhancement):
                    enhancement_started_msg = create_enhancement_started()
                    await enqueue_llm_message(enhancement_started_msg)
                    logger.info(
                        "Visualization processor: Sent enhancement_started "
                        "indicator (id=%s) to frontend",
                        enhancement_started_msg["id"],
                    )
                else:
                    logger.info("Visualization processor: No enhancement needed")
                    continue

                # ------------------------------------------------------------------ #
                #  Extra DEBUG: log values before early-exit decision
                # ------------------------------------------------------------------ #
                logger.debug(
                    "Early-exit evaluation → source=%s (type=%s) | "
                    "display_enhancement=%s (type=%s)",
                    source,
                    type(source).__name__,
                    display_enhancement,
                    type(display_enhancement).__name__,
                )

                # ------------------------------------------------------------------ #
                #  EARLY-EXIT RULE  (lowest-latency, no duplicates, no extra TTS)
                # ------------------------------------------------------------------ #
                # If this came from the voice path *and* the agent decided there is
                # NO visual enhancement, we have already shown the immediate bubble
                # and streamed the audio.  Nothing more to do – skip the rest of the
                # slow-path entirely.
                if source == "voice-agent" and display_enhancement is False:
                    logger.info(
                        "Visualization processor: displayEnhancement=False for voice turn – "
                        "bypassing further processing to avoid duplicate UI / audio."
                    )
                    # Mark queue task done and move to next item
                    #mark_raw_llm_output_done()
                    logger.info("Visualization processor: Marked queue task done and moving to next item")
                    continue
                # From this point onwards we always want to continue normal
                # processing; duplication has been avoided already.  Ensure the
                # legacy `skip_sending` flag is defined so the remainder of the
                # method can reference it safely without a NameError.
                skip_sending = False
                visualized_ui_payload = ""

                # Step 2: Conditionally process with Thesys or create simple card
                if not skip_sending and display_enhancement and self.thesys_client:
                    logger.info("Visualization processor: Enhancement requested, sending to Thesys Visualize API...")

                    try:
                        # Format messages for Thesys Visualize API with dynamic tool list
                        tools = self.enhanced_mcp_client.get_tools()
                        # Build markdown list of tools with descriptions
                        tool_lines = "\n".join([
                            f"- **{t.name}**: {t.description}"
                            for t in tools
                        ])
                        base_prompt = load_thesys_prompt("visualization_system_prompt")
                        dynamic_system_prompt = (
                            f"{base_prompt}\n\n"
                            "Available server-side tools for interactivity:\n"
                            f"{tool_lines}"
                        )
                        # Construct messages for Thesys API
                        messages_for_thesys = [
                            {"role": "system", "content": dynamic_system_prompt}
                        ]
                        if conversation_history:
                            for msg in conversation_history:
                                if msg.get("role") in ["user", "assistant"]:
                                    messages_for_thesys.append({"role": msg["role"], "content": msg["content"]})
                        messages_for_thesys.append({"role": "assistant", "content": display_text})
                        
                        # Get a unique message_id for correlation (use from metadata if available)
                        assistant_message_id = metadata.get("message_id", str(uuid.uuid4()))
                        
                        # Always use streaming mode
                        logger.info(f"Visualization processor: Using streaming mode for Thesys API (message_id={assistant_message_id})")
                        
                        # Initialize an empty payload to accumulate chunks
                        visualized_ui_payload = ""
                        
                        # Stream chunks from Thesys API
                        chunk_count = 0
                        async for chunk in self.stream_thesys_response(messages_for_thesys):
                            chunk_count += 1
                            # Accumulate the full payload for final response
                            visualized_ui_payload += chunk
                            
                            # Send chunk to frontend via WebSocket
                            await enqueue_llm_message(create_c1_token(
                                id=assistant_message_id,
                                content=chunk
                            ))
                            
                            # Respect chunk delay setting if configured
                            if config.streaming.c1_streaming_chunk_delay > 0:
                                await asyncio.sleep(config.streaming.c1_streaming_chunk_delay)
                        
                        logger.info(f"Visualization processor: Streamed {chunk_count} chunks for message_id={assistant_message_id}")
                        
                        # Send completion signal
                        await enqueue_llm_message(create_chat_done(id=assistant_message_id))
                        logger.info(f"Visualization processor: Sent chat_done for message_id={assistant_message_id}")

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
                        
                        # Send error message directly since streaming failed
                        if source == "text_chat":
                            thread_id = metadata.get("thread_id")
                            message_for_frontend = create_text_chat_response(
                                content=visualized_ui_payload,
                                thread_id=thread_id
                            )
                        else:
                            message_for_frontend = create_voice_response(
                                content=visualized_ui_payload,
                                voice_text=""
                            )
                        
                        await enqueue_llm_message(message_for_frontend)
                        logger.info(f"Visualization processor: Sent error message due to streaming failure")
                elif not skip_sending:
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
                    
                    # For simple cards, send directly without streaming
                    if source == "text_chat":
                        thread_id = metadata.get("thread_id")
                        message_for_frontend = create_text_chat_response(
                            content=visualized_ui_payload,
                            thread_id=thread_id
                        )
                    else:
                        message_for_frontend = create_voice_response(
                            content=visualized_ui_payload,
                            voice_text=""
                        )
                    
                    await enqueue_llm_message(message_for_frontend)
                    logger.info(f"Visualization processor: Sent simple card message")

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

                # Use appropriate message type based on source
                source = item.get("metadata", {}).get("source", "voice-agent") if item else "voice-agent"
                if source == "text_chat":
                    thread_id = item.get("metadata", {}).get("thread_id") if item else None
                    error_message = create_text_chat_response(
                        content=f'<content>{json.dumps(error_card)}</content>',
                        thread_id=thread_id
                    )
                else:
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
