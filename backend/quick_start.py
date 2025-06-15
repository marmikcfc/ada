#!/usr/bin/env python3
"""
Ada Interaction Engine - Quick Start Script

This script provides a simplified version of the Ada backend that starts quickly
by skipping or mocking slow initialization steps like MCP client setup.

Usage:
    python quick_start.py

This is ideal for frontend development when you don't need full backend functionality.
"""

import os
import asyncio
import logging
import json
import uuid
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create queues for message passing
llm_message_queue = asyncio.Queue(maxsize=100)
raw_llm_output_queue = asyncio.Queue(maxsize=100)

class ChatRequest(BaseModel):
    """Request model for chat messages"""
    message: str
    thread_id: Optional[str] = None

class ThesysBridgeRequest(BaseModel):
    """Request model for Thesys C1Chat bridge"""
    prompt: dict
    threadId: Optional[str] = None
    responseId: str

class WebRTCOffer(BaseModel):
    """WebRTC offer request model"""
    sdp: str
    type: str
    pc_id: Optional[str] = None
    restart_pc: Optional[bool] = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application
    
    This is a simplified version that skips slow initialization steps.
    """
    # Initialize minimal state
    app.state.initialized = True
    logger.info("Quick start mode: Skipping MCP and Thesys initialization")
    
    # Application runs here
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down quick start server")

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application
    
    Returns:
        The configured FastAPI application
    """
    # Create the FastAPI application
    app = FastAPI(
        title="Ada Interaction Engine - Quick Start",
        description="A simplified version of the Ada backend for quick testing",
        version="0.1.0",
        lifespan=lifespan
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add health check endpoint
    @app.get("/health", tags=["health"])
    def health_check():
        """Health check endpoint"""
        return {"status": "ok", "mode": "quick_start"}
    
    # Add root redirect
    @app.get("/", include_in_schema=False)
    def root_redirect():
        """Redirect root to health check"""
        return RedirectResponse(url="/health")
    
    # Add basic chat endpoint
    @app.post("/api/chat", tags=["chat"])
    async def chat(request: ChatRequest):
        """
        Process a chat message and return a mock response
        
        This is a simplified version that returns a mock response.
        """
        # Use thread ID from request or generate new one
        thread_id = request.thread_id or str(uuid.uuid4())
        
        # Create a simple mock response
        response = f"Quick start mode: I received your message: '{request.message}'"
        
        return {
            "response": response,
            "thread_id": thread_id
        }
    
    # Add WebSocket endpoint for streaming messages
    @app.websocket("/ws/messages")
    async def websocket_messages(websocket: WebSocket):
        """
        WebSocket endpoint for streaming messages to the client
        
        This is a simplified version that sends a welcome message and echoes user messages.
        """
        await websocket.accept()
        client_info = f"{websocket.client.host}:{websocket.client.port}"
        logger.info(f"WebSocket connection accepted from {client_info}")
        
        try:
            # Send a welcome message
            await websocket.send_text(json.dumps({
                "type": "connection_ack",
                "message": "WebSocket connection established in quick start mode!"
            }))
            
            # Echo messages back to the client
            while True:
                try:
                    # Wait for a message from the client
                    message = await websocket.receive_text()
                    
                    # Parse the message
                    try:
                        data = json.loads(message)
                        message_type = data.get("type", "unknown")
                        message_id = data.get("id", str(uuid.uuid4()))
                        content = data.get("content", "")
                        
                        # Echo the message back with a quick response
                        if message_type == "chat_request":
                            # Send tokens to simulate streaming
                            await websocket.send_text(json.dumps({
                                "id": message_id,
                                "type": "chat_token",
                                "content": "Quick "
                            }))
                            await asyncio.sleep(0.1)
                            await websocket.send_text(json.dumps({
                                "id": message_id,
                                "type": "chat_token",
                                "content": "start "
                            }))
                            await asyncio.sleep(0.1)
                            await websocket.send_text(json.dumps({
                                "id": message_id,
                                "type": "chat_token",
                                "content": "mode: "
                            }))
                            await asyncio.sleep(0.1)
                            await websocket.send_text(json.dumps({
                                "id": message_id,
                                "type": "chat_token",
                                "content": f"I received your message: '{content}'"
                            }))
                            await asyncio.sleep(0.1)
                            
                            # Send done message
                            await websocket.send_text(json.dumps({
                                "id": message_id,
                                "type": "chat_done"
                            }))
                    except json.JSONDecodeError:
                        # Not JSON, just echo it back
                        await websocket.send_text(f"Echo: {message}")
                        
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Error processing message: {str(e)}"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket client {client_info} disconnected")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
    
    # Add mock WebRTC offer endpoint
    @app.post("/api/offer", tags=["webrtc"])
    async def handle_offer(request: WebRTCOffer):
        """
        Mock WebRTC offer endpoint
        
        This returns a fake SDP answer to allow the frontend to continue.
        """
        pc_id = request.pc_id or str(uuid.uuid4())
        
        # Return a mock SDP answer
        return {
            "sdp": "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:mock\r\na=ice-pwd:mockpwd\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\n",
            "type": "answer",
            "pc_id": pc_id
        }
    
    # Add mock websocket-bridge endpoint
    @app.post("/api/websocket-bridge", tags=["chat"])
    async def websocket_bridge(request: ThesysBridgeRequest):
        """
        Mock websocket-bridge endpoint
        
        This returns a simple card with the user's message.
        """
        # Extract user message from prompt
        user_message = request.prompt.get('content', '')
        
        if not user_message:
            # Return an error card
            error_card = {
                "component": "Callout",
                "props": {
                    "variant": "warning",
                    "title": "Quick Start Mode",
                    "description": "Empty message received"
                }
            }
            return create_streaming_response(f'<content>{json.dumps(error_card)}</content>')
        
        # Create a simple card with the user's message
        card = {
            "component": "Card",
            "props": {
                "children": [
                    {
                        "component": "TextContent",
                        "props": {
                            "textMarkdown": f"**Quick Start Mode**\n\nI received your message: '{user_message}'"
                        }
                    }
                ]
            }
        }
        
        return create_streaming_response(f'<content>{json.dumps(card)}</content>')
    
    # Add mock MCP tools endpoint
    @app.get("/api/mcp/tools", tags=["mcp"])
    async def list_mcp_tools():
        """Mock MCP tools endpoint"""
        return {
            "enhanced_client": [
                "weather:get_weather",
                "search_engine:search"
            ]
        }
    
    return app

def create_streaming_response(content: str):
    """Helper function to create streaming response for Thesys C1Chat"""
    from fastapi.responses import StreamingResponse
    
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

# Create application instance for ASGI servers
app = create_application()

if __name__ == "__main__":
    import uvicorn
    
    host = "0.0.0.0"
    port = 8000
    
    print(f"""
    ╔════════════════════════════════════════════════╗
    ║                                                ║
    ║       Ada Interaction Engine - Quick Start     ║
    ║                                                ║
    ║           Development Server Starting          ║
    ║                                                ║
    ╚════════════════════════════════════════════════╝
    
    Server running at: http://{host}:{port}
    
    This is a simplified version for frontend testing.
    It skips MCP initialization and returns mock responses.
    
    Press Ctrl+C to stop the server.
    """)
    
    uvicorn.run(
        "quick_start:app",
        host=host,
        port=port,
        reload=True
    )
