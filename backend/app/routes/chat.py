"""
Ada Interaction Engine - Chat Routes Module

This module handles text-based chat interactions and bridges to the Thesys system.
It provides endpoints for:
1. WebSocket streaming of messages
2. WebSocket bridge for Thesys C1Chat integration
3. Chat message processing and enhancement
"""

import logging
import json
import uuid
from typing import Dict, List, Any, Optional

import asyncio  # Needed for asyncio.sleep used in WebSocket loop

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException
from typing import Union
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import config
from app.queues import (
    enqueue_llm_message,
    get_llm_message,
    mark_llm_message_done,
    create_user_transcription,
    enqueue_raw_llm_output,
    create_text_chat_response
)
from agent.enhanced_mcp_client_agent import EnhancedMCPClient
from utils.thesys_prompts import format_thesys_messages_for_visualize

logger = logging.getLogger(__name__)

# Router for chat endpoints
router = APIRouter(prefix="/api", tags=["chat"])

# --------------------------------------------------------------------------- #
# Chat history integration
# --------------------------------------------------------------------------- #
from app.chat_history_manager import chat_history_manager  # noqa: E402

# WebSocket router (needs different prefix)
ws_router = APIRouter(tags=["websocket"])

class ThesysBridgeRequest(BaseModel):
    """Request model for Thesys C1Chat bridge"""
    prompt: dict  # Contains the user message in OpenAI format
    threadId: Optional[str] = None
    responseId: str

class ChatRequest(BaseModel):
    """Request model for chat messages"""
    message: str
    thread_id: Optional[str] = None

def extract_message_and_thread_id(request: Union[ChatRequest, ThesysBridgeRequest]) -> tuple[str, Optional[str]]:
    """
    Extract message and thread_id from either ChatRequest or ThesysBridgeRequest
    
    Args:
        request: Either ChatRequest or ThesysBridgeRequest
        
    Returns:
        Tuple of (message, thread_id)
    """
    if isinstance(request, ChatRequest):
        return request.message, request.thread_id
    elif isinstance(request, ThesysBridgeRequest):
        # Extract message from prompt["content"] and thread_id from threadId
        message = request.prompt.get("content", "")
        thread_id = request.threadId
        return message, thread_id
    else:
        raise ValueError(f"Unsupported request type: {type(request)}")


async def _process_chat_logic(message: str, thread_id: str, *, is_c1_action: bool, app_state) -> None:
    """Internal helper to process a chat message just like the POST endpoint."""

    # Use lazy initialization for MCP client
    from app.server import get_or_create_mcp_client
    enhanced_mcp_client: EnhancedMCPClient = await get_or_create_mcp_client(app_state)
    if not enhanced_mcp_client:
        raise HTTPException(status_code=500, detail="Chat service not available")

    # ------------------------------------------------------------------- #
    # 1. Persist USER message in history
    # ------------------------------------------------------------------- #
    if is_c1_action:
        await chat_history_manager.add_c1_action(thread_id, message)
    else:
        await chat_history_manager.add_user_message(thread_id, message)

    # Step 1: Send user message to WebSocket immediately
    # For text chat, don't echo user message back (frontend already displays it)
    # Only voice transcriptions need to be sent back to frontend as user_transcription

    # Gather recent history for context
    conversation_history = await chat_history_manager.get_recent_history(thread_id)

    # Step 2: Process the message through the MCP client
    response = await enhanced_mcp_client.chat_with_tools(
        user_message=message,
        conversation_history=conversation_history  # real history
    )
    logger.info(f"MCP client response: {response[:100]}...")

    # ------------------------------------------------------------------- #
    # 3. Persist ASSISTANT response in history
    # ------------------------------------------------------------------- #
    await chat_history_manager.add_assistant_message(thread_id, response)

    # Fetch updated conversation history for downstream processors
    conversation_history = await chat_history_manager.get_recent_history(thread_id)

    # Generate a unique message_id for streaming correlation
    message_id = str(uuid.uuid4())

    # Step 4: Send response through enhancement pipeline (like voice messages)
    await enqueue_raw_llm_output(
        assistant_response=response,
        history=conversation_history,
        metadata={
            "source": "text_chat",
            "thread_id": thread_id,
            "message_id": message_id  # Add message_id for streaming correlation
        }
    )
    logger.info(f"Enqueued response to enhancement pipeline with message_id: {message_id}")


@router.post("/chat")
async def chat_enhanced(request: Union[ChatRequest, ThesysBridgeRequest], fastapi_req: Request):
    """
    Process a chat message through the full enhancement pipeline
    
    This endpoint accepts both ChatRequest and ThesysBridgeRequest formats:
    - ChatRequest: Direct message format
    - ThesysBridgeRequest: Thesys interactive element format
    
    This endpoint:
    1. Extracts message and thread_id from the request
    2. Enqueues the user message to the WebSocket stream
    3. Processes the message through the MCP client
    4. Sends the response through the enhancement pipeline (like voice messages)
    5. Returns a simple acknowledgment
    
    Args:
        request: Either ChatRequest or ThesysBridgeRequest
        fastapi_req: FastAPI request object
        
    Returns:
        JSON response with thread_id and status
    """
    # Extract message and thread_id from either request format
    message, thread_id = extract_message_and_thread_id(request)
    
    # Initialize thread_id early so it's available in error handling
    thread_id = thread_id or str(uuid.uuid4())
    
    # Log the request type and extracted data
    request_type = "ThesysBridgeRequest" if isinstance(request, ThesysBridgeRequest) else "ChatRequest"
    logger.info(f"Processing {request_type} - Message: {message[:100]}..., Thread ID: {thread_id}")
    
    try:
        await _process_chat_logic(
            message,
            thread_id,
            is_c1_action=isinstance(request, ThesysBridgeRequest),
            app_state=fastapi_req.app.state,
        )
        return {
            "status": "processing",
            "thread_id": thread_id,
            "message": "Message sent for processing. Response will be delivered via WebSocket."
        }
    except Exception as e:
        logger.error(f"Enhanced Chat Error: {e}", exc_info=True)
        # Send error message to WebSocket
        try:
            error_response = create_text_chat_response(
                content=f'<content>{{"component": "Callout", "props": {{"variant": "error", "title": "Chat Error", "description": "Failed to process your message: {str(e)}"}} }}</content>',
                thread_id=thread_id
            )
            await enqueue_llm_message(error_response)
        except Exception as enqueue_error:
            logger.error(f"Failed to enqueue error message: {enqueue_error}", exc_info=True)
        
        raise HTTPException(status_code=500, detail=str(e))

@ws_router.websocket("/ws/messages")
async def websocket_llm_messages(websocket: WebSocket):
    """Bidirectional WebSocket for chat messages and streaming responses."""
    await websocket.accept()
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"WebSocket /ws/messages connection accepted from {client_info}")

    async def sender():
        while True:
            msg = await get_llm_message()
            try:
                serialized = msg if isinstance(msg, str) else json.dumps(msg)
                await websocket.send_text(serialized)
            except Exception as send_error:
                logger.error(
                    f"WebSocket error sending message to {client_info}: {send_error}",
                    exc_info=True,
                )
                break
            finally:
                mark_llm_message_done()
            await asyncio.sleep(0)

    async def receiver():
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            try:
                payload = json.loads(data)
            except Exception:
                logger.warning(f"Invalid WS payload from {client_info}: {data}")
                continue
            mtype = payload.get("type")
            if mtype in ("chat", "chat_request"):
                text = payload.get("message") or payload.get("content", "")
                thread_id = payload.get("thread_id") or payload.get("threadId")
                is_c1 = False
            elif mtype in ("thesys_bridge", "c1_action"):
                text = payload.get("prompt", {}).get("content", "")
                thread_id = payload.get("thread_id") or payload.get("threadId")
                is_c1 = True
            else:
                logger.warning(f"Unknown WS message type from {client_info}: {mtype}")
                continue
            thread_id = thread_id or str(uuid.uuid4())
            try:
                await _process_chat_logic(text, thread_id, is_c1_action=is_c1, app_state=websocket.scope["app"].state)
            except Exception as e:
                logger.error(f"WS chat processing error for {client_info}: {e}", exc_info=True)

    await websocket.send_text(json.dumps({"type": "connection_ack", "message": "WebSocket connection established!"}))

    send_task = asyncio.create_task(sender())
    recv_task = asyncio.create_task(receiver())
    done, pending = await asyncio.wait({send_task, recv_task}, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    logger.info(f"Closing WebSocket connection for {client_info}")

def create_streaming_response(content: str):
    """
    Helper function to create streaming response for Thesys C1Chat
    
    Args:
        content: The content to stream
        
    Returns:
        StreamingResponse with the content
    """
    def generate_response():
        yield content
        
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

def format_thesys_error_response(error_message: str) -> str:
    """
    Format error response in Thesys component format
    
    Args:
        error_message: The error message
        
    Returns:
        Formatted error response
    """
    component = {
        "component": "Callout",
        "props": {
            "variant": "warning",
            "title": "WebSocket Bridge Error",
            "description": error_message
        }
    }
    
    return f'<content>{json.dumps(component)}</content>'

async def get_thesys_visualization(
    thesys_client,
    assistant_response: str, 
    conversation_history: List[Dict[str, Any]] = None, 
    enhanced_response: str = None
) -> str:
    """
    Call Thesys Visualize API to get a UI representation for the given text
    
    Args:
        thesys_client: The Thesys client
        assistant_response: The original assistant response
        conversation_history: Optional conversation history
        enhanced_response: Optional enhanced response from MCP agent
        
    Returns:
        Visualized content as string
    """
    if not thesys_client:
        logger.error("Thesys client not initialized. Cannot visualize.")
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning", 
                "title": "Visualization Error",
                "description": "Visualization service not available."
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'

    # Use enhanced response if available, otherwise use original
    final_response = enhanced_response if enhanced_response else assistant_response
    
    # Format messages for Thesys Visualize API
    messages_for_thesys = format_thesys_messages_for_visualize(final_response, conversation_history)

    try:
        logger.info(f"Sending to Thesys Visualize API (content: {final_response[:100]}...)...")
        
        # Use the visualize endpoint
        completion = await thesys_client.chat.completions.create(
            messages=messages_for_thesys,
            model=config.model.thesys_model,
            stream=False
        )
        
        visualized_content = completion.choices[0].message.content
        logger.info(f"Received visualization from Thesys Visualize API")
        logger.debug(f"Visualization content: {visualized_content}")
        
        # Return the content directly as it should already be in the proper format
        return visualized_content

    except Exception as e:
        logger.error(f"Error calling Thesys Visualize API: {e}", exc_info=True)
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning",
                "title": "Visualization Error", 
                "description": f"Failed to generate UI: {str(e)}"
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'
