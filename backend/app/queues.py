"""
Ada Interaction Engine - Queue Management Module

This module centralizes the creation and management of asyncio queues used for
inter-component communication between the fast path (voice processing) and
slow path (enhancement pipeline) components of the Ada system.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, TypedDict, List, Union
import json
import uuid
from dataclasses import dataclass, asdict

from app.config import config

logger = logging.getLogger(__name__)

# Type definitions for queue items
class UserTranscription(TypedDict):
    """User voice transcription message format"""
    id: str
    type: str  # "user_transcription"
    content: str

class ChatToken(TypedDict):
    """Incremental text token for streaming responses"""
    id: str
    type: str  # "chat_token"
    content: str

class C1Token(TypedDict):
    """Incremental UI token for streaming responses"""
    id: str
    type: str  # "c1_token"
    content: str

class HTMLToken(TypedDict):
    """Incremental HTML token for streaming HTML responses"""
    id: str
    type: str  # "html_token"
    content: str

class ChatDone(TypedDict):
    """Marker for completed text response"""
    id: str
    type: str  # "chat_done"
    content: Optional[str]

class VoiceResponse(TypedDict):
    """Complete voice response with UI payload"""
    id: str
    role: str  # "assistant"
    type: str  # "voice_response"
    content: str  # UI payload
    contentType: str  # "c1" or "html" - indicates how to render content
    framework: Optional[str]  # Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
    voiceText: Optional[str]  # TTS text if different from display
    isVoiceOverOnly: bool  # Flag indicating if voiceText should not be displayed in UI

class TextChatResponse(TypedDict):
    """Complete text chat response with UI payload"""
    id: str
    role: str  # "assistant"
    type: str  # "text_chat_response"
    content: str  # UI payload
    contentType: str  # "c1" or "html" - indicates how to render content
    framework: Optional[str]  # Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
    threadId: Optional[str]  # Thread ID for conversation tracking

class RawLLMOutput(TypedDict):
    """Raw output from the LLM in the fast path"""
    assistant_response: str
    history: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]

# --------------------------------------------------------------------------- #
#  NEW: Immediate voice response (sent before slow-path enhancement)
# --------------------------------------------------------------------------- #
class ImmediateVoiceResponse(TypedDict):
    """
    A lightweight assistant message pushed to the UI *immediately* after the
    full LLM text is available but before the visualization/enhancement
    pipeline finishes.  Structure is identical to VoiceResponse except for
    the `type` discriminator.
    """
    id: str
    role: str              # "assistant"
    type: str              # "immediate_voice_response"
    content: str           # Simple C1Component payload (usually a basic card)
    contentType: str       # "c1" or "html" - indicates how to render content
    framework: Optional[str]  # Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
    voiceText: Optional[str]  # Optionally override spoken text
    isVoiceOverOnly: bool  # Flag indicating if voiceText should not be displayed in UI

# --------------------------------------------------------------------------- #
#  NEW: Enhancement loading indicator (slow-path in progress)
# --------------------------------------------------------------------------- #
class EnhancementStarted(TypedDict):
    """
    Interim assistant message sent only during voice interactions to tell the
    client that the slow-path (visualisation / Thesys) has decided an enhanced
    UI is required and is currently generating it.
    """
    id: str
    role: str            # "assistant"
    type: str            # "enhancement_started"
    content: str         # Friendly note, e.g. "Generating enhanced display…"

# Import voice broadcast manager
from app.voice_broadcast_manager import voice_broadcast_manager

# Queue instances
llm_message_queue: Optional[asyncio.Queue] = None
raw_llm_output_queue: Optional[asyncio.Queue] = None

def initialize_queues():
    """Initialize all global queues with configured sizes"""
    global llm_message_queue, raw_llm_output_queue
    
    logger.info("Initializing communication queues...")
    llm_message_queue = asyncio.Queue(maxsize=config.queue.llm_message_queue_maxsize)
    raw_llm_output_queue = asyncio.Queue(maxsize=config.queue.raw_llm_output_queue_maxsize)
    logger.info("Communication queues initialized successfully")
    logger.info("Voice broadcast manager ready for subscriptions")

async def enqueue_llm_message(message: Union[
    UserTranscription,
    ChatToken,
    C1Token,
    HTMLToken,              # NEW: HTML token for OpenAI/HTML providers
    ChatDone,
    VoiceResponse,
    TextChatResponse,
    ImmediateVoiceResponse,  # fast-path interim
    EnhancementStarted       # NEW: enhancement loading indicator
]):
    """
    Enqueue a message to be sent to the frontend via WebSocket
    
    Args:
        message: The message to enqueue
    
    Raises:
        RuntimeError: If the queue is not initialized
    """
    global llm_message_queue
    if llm_message_queue is None:
        raise RuntimeError("LLM message queue not initialized")
    
    try:
        await llm_message_queue.put(message)
        logger.debug(f"Enqueued message to llm_message_queue: {message.get('type')} with ID {message.get('id')}")
    except Exception as e:
        logger.error(f"Error enqueuing message to llm_message_queue: {e}")
        raise

async def broadcast_voice_message(message: Union[
    UserTranscription,
    ImmediateVoiceResponse,
    VoiceResponse
]) -> int:
    """
    Broadcast a voice message to all relevant subscribers via the voice broadcast manager.
    
    This function should be used instead of enqueue_llm_message for messages that are
    specifically intended for voice connections to ensure proper distribution to all tabs.
    
    Args:
        message: Voice message to broadcast
        
    Returns:
        Number of subscribers that received the message
        
    Raises:
        RuntimeError: If the broadcast manager is not available
    """
    try:
        delivery_count = await voice_broadcast_manager.broadcast(message)
        logger.debug(f"Broadcasted voice message {message.get('type')} to {delivery_count} subscribers")
        return delivery_count
    except Exception as e:
        logger.error(f"Error broadcasting voice message: {e}")
        raise

async def enqueue_raw_llm_output(assistant_response: str, history: List[Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None):
    """
    Enqueue raw LLM output from the fast path to the slow path for enhancement
    
    Args:
        assistant_response: The raw text response from the LLM
        history: The conversation history
        metadata: Optional metadata about the response
    
    Raises:
        RuntimeError: If the queue is not initialized
    """
    global raw_llm_output_queue
    if raw_llm_output_queue is None:
        raise RuntimeError("Raw LLM output queue not initialized")
    
    try:
        item: RawLLMOutput = {
            "assistant_response": assistant_response,
            "history": history,
            "metadata": metadata
        }
        await raw_llm_output_queue.put(item)
        logger.debug(f"Enqueued raw LLM output to raw_llm_output_queue: {assistant_response[:50]}...")
    except Exception as e:
        logger.error(f"Error enqueuing raw LLM output to raw_llm_output_queue: {e}")
        raise

async def get_llm_message():
    """
    Get the next message from the LLM message queue
    
    Returns:
        The next message in the queue
    
    Raises:
        RuntimeError: If the queue is not initialized
    """
    global llm_message_queue
    if llm_message_queue is None:
        raise RuntimeError("LLM message queue not initialized")
    
    try:
        message = await llm_message_queue.get()
        logger.debug(f"Got message from llm_message_queue: {message.get('type')} with ID {message.get('id')}")
        return message
    except Exception as e:
        logger.error(f"Error getting message from llm_message_queue: {e}")
        raise

async def get_raw_llm_output():
    """
    Get the next raw LLM output from the queue
    
    Returns:
        The next raw LLM output in the queue
    
    Raises:
        RuntimeError: If the queue is not initialized
    """
    global raw_llm_output_queue
    if raw_llm_output_queue is None:
        raise RuntimeError("Raw LLM output queue not initialized")
    
    try:
        item = await raw_llm_output_queue.get()
        logger.debug(f"Got raw LLM output from raw_llm_output_queue: {item['assistant_response'][:50]}...")
        return item
    except Exception as e:
        logger.error(f"Error getting raw LLM output from raw_llm_output_queue: {e}")
        raise

def mark_llm_message_done():
    """Mark the last retrieved LLM message as done"""
    global llm_message_queue
    if llm_message_queue is None:
        raise RuntimeError("LLM message queue not initialized")
    
    llm_message_queue.task_done()

def mark_raw_llm_output_done():
    """Mark the last retrieved raw LLM output as done"""
    global raw_llm_output_queue
    if raw_llm_output_queue is None:
        raise RuntimeError("Raw LLM output queue not initialized")
    
    raw_llm_output_queue.task_done()

# Helper functions for creating common message types
def get_content_type_for_provider(provider_type: str) -> str:
    """
    Determine the appropriate content type based on the visualization provider
    
    Args:
        provider_type: The provider type (e.g., "thesys", "openai", "anthropic")
    
    Returns:
        Content type: "html" for HTML-based providers, "c1" for C1-based providers
    """
    provider_lower = provider_type.lower()
    if provider_lower in ['openai', 'anthropic', 'google']:
        return "html"
    else:
        # Default to C1 for TheSys, Tomorrow, and any unknown providers
        return "c1"

def create_user_transcription(content: str, id: Optional[str] = None) -> UserTranscription:
    """Create a user transcription message"""
    return {
        "id": id or str(uuid.uuid4()),
        "type": "user_transcription",
        "content": content
    }

def create_chat_token(id: str, content: str) -> ChatToken:
    """Create a chat token message"""
    return {
        "id": id,
        "type": "chat_token",
        "content": content
    }

def create_c1_token(id: str, content: str) -> C1Token:
    """Create a C1 token message"""
    return {
        "id": id,
        "type": "c1_token",
        "content": content
    }

def create_html_token(id: str, content: str) -> HTMLToken:
    """Create an HTML token message"""
    return {
        "id": id,
        "type": "html_token",
        "content": content
    }

def create_chat_done(id: str, content: Optional[str] = None) -> ChatDone:
    """Create a chat done message"""
    return {
        "id": id,
        "type": "chat_done",
        "content": content
    }

def create_voice_response(
    content: str, 
    content_type: str = "c1",
    framework: Optional[str] = None,
    voice_text: Optional[str] = None,
    is_voice_over_only: bool = True
) -> VoiceResponse:
    """
    Create a voice response message
    
    Args:
        content: The UI content payload
        content_type: Type of content - "c1" for C1Components, "html" for HTML (defaults to "c1")
        framework: Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
        voice_text: Optional text for TTS that differs from display text
        is_voice_over_only: Flag indicating if voice_text should not be displayed in UI
                           (defaults to True since voice-over is typically for audio only)
    
    Returns:
        A VoiceResponse object
    """
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "voice_response",
        "content": content,
        "contentType": content_type,
        "framework": framework,
        "voiceText": voice_text,
        "isVoiceOverOnly": is_voice_over_only if voice_text else False
    }

def create_text_chat_response(
    content: str, 
    content_type: str = "c1",
    framework: Optional[str] = None,
    thread_id: Optional[str] = None
) -> TextChatResponse:
    """
    Create a text chat response message
    
    Args:
        content: The UI content payload
        content_type: Type of content - "c1" for C1Components, "html" for HTML (defaults to "c1")
        framework: Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
        thread_id: Optional thread ID for conversation tracking
    
    Returns:
        A TextChatResponse object
    """
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "text_chat_response",
        "content": content,
        "contentType": content_type,
        "framework": framework,
        "threadId": thread_id
    }

# --------------------------------------------------------------------------- #
# Helper for building a plain Card/TextContent payload
# --------------------------------------------------------------------------- #
def create_simple_card_content(text_markdown: str) -> str:
    """
    Create the minimal C1-compatible payload used when no visual enhancement
    is requested.  The structure exactly mirrors the fallback built inside
    `vis_processor.py` so that the UI receives consistent markup whether the
    payload is produced eagerly (fast-path) or later (slow-path).

    Args:
        text_markdown: The raw assistant text to embed in the card.

    Returns:
        A `<content> … </content>` string ready to be placed in a message.
    """
    simple_card = {
        "component": {
            "component": "Card",
            "props": {
                "children": [
                    {
                        "component": "TextContent",
                        "props": {
                            "textMarkdown": text_markdown
                        },
                    }
                ]
            },
        }
    }
    return f"<content>{json.dumps(simple_card)}</content>"

# --------------------------------------------------------------------------- #
# Helper for immediate voice responses
# --------------------------------------------------------------------------- #
def create_immediate_voice_response(
    content: str,
    content_type: str = "c1",
    framework: Optional[str] = None,
    voice_text: Optional[str] = None,
    is_voice_over_only: bool = True
) -> ImmediateVoiceResponse:
    """
    Create an *immediate* voice response that can be displayed as soon as the
    fast-path LLM finishes (before enhancement).  The caller is expected to
    supply a simple C1-compatible payload, typically the same "simple card"
    structure used as a fallback in `vis_processor.py`.
    
    Args:
        content: The UI content payload
        content_type: Type of content - "c1" for C1Components, "html" for HTML (defaults to "c1")
        framework: Framework used for HTML content (e.g., "tailwind", "shadcn", "c1")
        voice_text: Optional text for TTS that differs from display text
        is_voice_over_only: Flag indicating if voice_text should not be displayed in UI
                           (defaults to True since voice-over is typically for audio only)
    
    Returns:
        An ImmediateVoiceResponse object
    """
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "immediate_voice_response",
        "content": content,
        "contentType": content_type,
        "framework": framework,
        "voiceText": voice_text,
        "isVoiceOverOnly": is_voice_over_only if voice_text else False
    }


# --------------------------------------------------------------------------- #
# Helper for enhancement loading indicator
# --------------------------------------------------------------------------- #
def create_enhancement_started(note: str = "Generating enhanced display…") -> EnhancementStarted:
    """
    Build an `enhancement_started` message to inform the frontend that the slow
    path is working on a richer UI.  `note` can be customised but defaults to a
    friendly generic text.
    """
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "enhancement_started",
        "content": note,
    }
