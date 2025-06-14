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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import config
from app.queues import (
    enqueue_llm_message,
    get_llm_message,
    mark_llm_message_done,
    create_chat_token,
    create_c1_token,
    create_chat_done,
    create_voice_response
)
from utils.thesys_prompts import format_thesys_messages_for_visualize

logger = logging.getLogger(__name__)

# Router for chat endpoints
router = APIRouter(prefix="/api", tags=["chat"])

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

@router.post("/websocket-bridge")
async def websocket_bridge(request: ThesysBridgeRequest, fastapi_req: Request):
    """
    Bridge endpoint for Thesys C1Chat to send messages through the enhancement pipeline
    and receive responses in the expected format.
    
    This endpoint:
    1. Extracts the user message from the prompt
    2. Processes the message through the MCP enhancement agent
    3. Conditionally enhances the response with Thesys Visualize API
    4. Returns the response in streaming format for Thesys C1Chat
    
    Args:
        request: The Thesys bridge request
        fastapi_req: FastAPI request object
        
    Returns:
        StreamingResponse with the enhanced content
    """
    try:
        logger.info(f"WebSocket Bridge: Received request from Thesys C1Chat")
        logger.debug(f"Prompt: {request.prompt}")
        logger.debug(f"Thread ID: {request.threadId}")
        logger.debug(f"Response ID: {request.responseId}")

        # Extract user message from prompt
        user_message = request.prompt.get('content', '')
        
        if not user_message:
            logger.warning("WebSocket Bridge: Empty user message received")
            error_response = format_thesys_error_response("Empty message received")
            return create_streaming_response(error_response)
        
        # Get the enhanced MCP client from request state
        enhanced_mcp_client = fastapi_req.app.state.enhanced_mcp_client
        if not enhanced_mcp_client:
            logger.error("WebSocket Bridge: Enhanced MCP client not available")
            error_response = format_thesys_error_response("Enhancement service not available")
            return create_streaming_response(error_response)
        
        # Get the Thesys client from request state
        thesys_client = fastapi_req.app.state.thesys_client
        
        # Use thread ID from request or generate new one
        thread_id = request.threadId or str(uuid.uuid4())
        
        try:
            logger.info(f"WebSocket Bridge: Processing message through MCP client for thread {thread_id}")
            
            # Process the message through the MCP client
            response = await enhanced_mcp_client.chat_with_tools(
                user_message=user_message,
                conversation_history=[]  # Could be extended to maintain history
            )
            
            logger.info(f"WebSocket Bridge: MCP client response: {response[:100]}...")
            
            # Get minimal conversation history for context
            # In a real implementation, this would come from a database
            conversation_history = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": response}
            ]
            
            # Process through enhancement pipeline
            enhancement_decision = await enhanced_mcp_client.make_enhancement_decision(
                assistant_response=response,
                conversation_history=conversation_history
            )
            
            display_enhancement = enhancement_decision.displayEnhancement
            display_text = enhancement_decision.displayEnhancedText
            
            if display_enhancement and thesys_client:
                # Process through Thesys Visualize API
                logger.info(f"WebSocket Bridge: Sending enhanced response to Thesys Visualize API")
                visualized_content = await get_thesys_visualization(
                    thesys_client=thesys_client,
                    assistant_response=response,
                    conversation_history=conversation_history,
                    enhanced_response=display_text
                )
            else:
                # Create simple card for non-enhanced responses
                simple_card = {
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
                visualized_content = f'{json.dumps(simple_card)}'
            
            logger.info(f"WebSocket Bridge: Returning response to C1Chat component")

            # ------------------------------------------------------------------
            # ALSO stream the assistant response via the /ws/messages socket so
            # the React client shows the AI message immediately.
            # ------------------------------------------------------------------
            try:
                await enqueue_llm_message(
                    {
                        "id": request.responseId or str(uuid.uuid4()),
                        "role": "assistant",
                        "type": "voice_response",  # handled by useWebSocketChat
                        "content": visualized_content,
                    }
                )
                logger.debug("Assistant response enqueued to llm_message_queue")
            except Exception as q_err:
                logger.error(f"Failed to enqueue assistant response: {q_err}", exc_info=True)
            
            # Return the response in streaming format for Thesys C1Chat
            return create_streaming_response(visualized_content)
            
        except Exception as agent_error:
            logger.error(f"WebSocket Bridge: Error processing message: {agent_error}", exc_info=True)
            error_response = format_thesys_error_response(f"Processing error: {str(agent_error)}")
            return create_streaming_response(error_response)
        
    except Exception as e:
        logger.error(f"WebSocket Bridge Error: {e}", exc_info=True)
        error_response = format_thesys_error_response(str(e))
        return create_streaming_response(error_response)

@router.post("/chat")
async def chat(request: ChatRequest, fastapi_req: Request):
    """
    Process a chat message and return the response
    
    This endpoint:
    1. Processes the message through the MCP client
    2. Returns the response as JSON
    
    Args:
        request: The chat request
        fastapi_req: FastAPI request object
        
    Returns:
        JSON response with the processed message
    """
    try:
        # Get the enhanced MCP client from request state
        enhanced_mcp_client = fastapi_req.app.state.enhanced_mcp_client
        if not enhanced_mcp_client:
            raise HTTPException(status_code=500, detail="Chat service not available")
        
        # Use thread ID from request or generate new one
        thread_id = request.thread_id or str(uuid.uuid4())
        
        # Process the message through the MCP client
        response = await enhanced_mcp_client.chat_with_tools(
            user_message=request.message,
            conversation_history=[]  # Could be extended to maintain history
        )
        
        return {
            "response": response,
            "thread_id": thread_id
        }
        
    except Exception as e:
        logger.error(f"Chat Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@ws_router.websocket("/ws/messages")
async def websocket_llm_messages(websocket: WebSocket):
    """
    WebSocket endpoint for streaming LLM messages to the client
    
    This endpoint:
    1. Accepts a WebSocket connection
    2. Continuously streams messages from the LLM message queue to the client
    3. Handles disconnection and errors
    
    Args:
        websocket: The WebSocket connection
    """
    await websocket.accept()
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"WebSocket /ws/messages connection accepted from {client_info}")
    
    try:
        # Send an initial test message to the client
        await websocket.send_text(json.dumps({
            "type": "connection_ack", 
            "message": "WebSocket connection established!"
        }))
        logger.info(f"Sent connection_ack to {client_info}")

        while True:
            logger.debug(f"WebSocket waiting for message from llm_message_queue for {client_info}")
            msg = await get_llm_message()
            
            try:
                serialized_msg = msg if isinstance(msg, str) else json.dumps(msg)
                await websocket.send_text(serialized_msg)
                logger.debug(f"WebSocket successfully sent message to {client_info}")
            except Exception as send_error:
                # Network hiccups or malformed frames should not kill the
                # whole stream – log and keep waiting for the next item.
                logger.error(
                    f"WebSocket error sending message to {client_info}: {send_error}",
                    exc_info=True,
                )
            finally:
                # Always mark a queue task as done so the queue does not get
                # stuck and back-pressure stays accurate.
                mark_llm_message_done()

            # Yield control to allow other tasks to run before the next get().
            # (Behaviour identical to the old main.py loop.)
            await asyncio.sleep(0)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_info} disconnected.")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket for {client_info}: {e}", exc_info=True)
    finally:
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
