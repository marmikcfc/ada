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
    voiceText: Optional[str]  # TTS text if different from display

class TextChatResponse(TypedDict):
    """Complete text chat response with UI payload"""
    id: str
    role: str  # "assistant"
    type: str  # "text_chat_response"
    content: str  # UI payload
    threadId: Optional[str]  # Thread ID for conversation tracking

class RawLLMOutput(TypedDict):
    """Raw output from the LLM in the fast path"""
    assistant_response: str
    history: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]

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

async def enqueue_llm_message(message: Union[UserTranscription, ChatToken, C1Token, ChatDone, VoiceResponse, TextChatResponse]):
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

def create_chat_done(id: str, content: Optional[str] = None) -> ChatDone:
    """Create a chat done message"""
    return {
        "id": id,
        "type": "chat_done",
        "content": content
    }

def create_voice_response(content: str, voice_text: Optional[str] = None) -> VoiceResponse:
    """Create a voice response message"""
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "voice_response",
        "content": content,
        "voiceText": voice_text
    }

def create_text_chat_response(content: str, thread_id: Optional[str] = None) -> TextChatResponse:
    """Create a text chat response message"""
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "type": "text_chat_response",
        "content": content,
        "threadId": thread_id
    }
