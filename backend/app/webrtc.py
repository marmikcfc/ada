"""
Ada Interaction Engine - WebRTC Module

This module handles WebRTC connections for voice-based interactions.
It provides the necessary endpoints and connection management for the
fast path (speech-to-speech) processing pipeline.
"""

import logging
import uuid
from typing import Dict, List, Optional, Callable, Awaitable, Any
import asyncio

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection
from agent.voice_based_interaction_agent import VoiceInterfaceAgent

from app.config import config
# Connection mapper import removed - not needed for message routing
# NOTE:
# Import the *module* so we always access the current queue instances that are
# created during `initialize_queues()` inside the FastAPI lifespan.  Using
# `from app.queues import …` copies the reference at import-time (when the
# queues are still `None`) and breaks later runtime access.
import app.queues as queues
# Removed vis_processor imports - using per-connection processing only

logger = logging.getLogger(__name__)

# Router for WebRTC endpoints
router = APIRouter(prefix="/api", tags=["webrtc"])

# Store connections by pc_id
pcs_map: Dict[str, SmallWebRTCConnection] = {}

# Create ICE servers from configuration
ice_servers = [IceServer(urls=server["urls"]) for server in config.webrtc.ice_servers]

class WebRTCOffer(BaseModel):
    """WebRTC offer request model"""
    sdp: str
    type: str
    pc_id: Optional[str] = None
    restart_pc: Optional[bool] = False
    backend_connection_id: Optional[str] = None  # Backend WebSocket connection ID for message routing
    session_id: Optional[str] = None  # Session ID for session-based routing
    thread_id: Optional[str] = None  # Thread ID for current thread

class WebRTCAnswer(BaseModel):
    """WebRTC answer response model"""
    sdp: str
    type: str
    pc_id: str

async def create_webrtc_connection(
    sdp: str, 
    type_: str,
    on_closed: Optional[Callable[[SmallWebRTCConnection], Awaitable[None]]] = None
) -> SmallWebRTCConnection:
    """
    Create a new WebRTC connection
    
    Args:
        sdp: Session Description Protocol data
        type_: Offer type
        on_closed: Optional callback for when the connection is closed
        
    Returns:
        The initialized WebRTC connection
    """
    connection = SmallWebRTCConnection(ice_servers)
    await connection.initialize(sdp=sdp, type=type_)
    
    # Set up closed event handler if provided
    if on_closed:
        @connection.event_handler("closed")
        async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
            await on_closed(webrtc_connection)
    
    return connection

async def default_on_closed(webrtc_connection: SmallWebRTCConnection):
    """Default handler for WebRTC connection closure"""
    logger.info(f"Discarding peer connection for pc_id: {webrtc_connection.pc_id}")
    pcs_map.pop(webrtc_connection.pc_id, None)

@router.post("/offer", response_model=WebRTCAnswer)
async def handle_offer(request: WebRTCOffer, background_tasks: BackgroundTasks, fastapi_req: Request) -> WebRTCAnswer:
    """
    Handle WebRTC offer and establish connection
    
    This endpoint:
    1. Creates or reuses a WebRTC connection
    2. Sets up the VoiceInterfaceAgent for audio processing
    3. Registers the agent for TTS voice-over injection
    4. Returns the SDP answer to complete the connection
    
    Args:
        request: The WebRTC offer
        background_tasks: FastAPI background tasks
        fastapi_req: FastAPI request object
        
    Returns:
        WebRTC answer with connection details
    """
    pc_id = request.pc_id
    
    # Reuse existing connection if pc_id is provided and exists
    if pc_id and pc_id in pcs_map:
        pipecat_connection = pcs_map[pc_id]
        logger.info(f"Reusing existing connection for pc_id: {pc_id}")
        await pipecat_connection.renegotiate(
            sdp=request.sdp, 
            type=request.type, 
            restart_pc=request.restart_pc
        )
    else:
        # Create new connection with custom close handler for agent cleanup
        async def on_closed_with_agent_cleanup(webrtc_connection: SmallWebRTCConnection):
            """Handle connection close and unregister any associated agent"""
            logger.info(f"WebRTC connection closed for pc_id: {webrtc_connection.pc_id}")
            
            # Look for and unregister any associated agent
            # Note: This is a best-effort cleanup. The WeakSet will handle most cleanup automatically
            for agent in list(getattr(webrtc_connection, '_associated_agents', [])):
                try:
                    # Unregister from session manager
                    from app.session_manager import session_manager
                    rtc_connection_id = webrtc_connection.pc_id
                    await session_manager.unregister_rtc_connection(rtc_connection_id)
                    logger.info(f"Unregistered RTC {rtc_connection_id} from session manager")
                    
                    # Also try to unregister from connection manager if connection_id is available
                    if hasattr(agent, 'connection_id') and agent.connection_id:
                        from app.voice_manager import voice_manager
                        await voice_manager.unregister_voice_agent(agent.connection_id)
                    
                    logger.info(f"Unregistered voice agent on connection close")
                except Exception as e:
                    logger.error(f"Error unregistering voice agent: {e}")
            
            # Standard cleanup
            await default_on_closed(webrtc_connection)
        
        pipecat_connection = await create_webrtc_connection(
            sdp=request.sdp,
            type_=request.type,
            on_closed=on_closed_with_agent_cleanup
        )
        
        # Validate that queues are initialized before creating the agent
        if queues.llm_message_queue is None:
            logger.error("Queues not initialized - cannot create VoiceInterfaceAgent")
            raise RuntimeError("Voice processing not available - queues not initialized")
        
        # Create voice interface agent with backend connection ID (passed directly from frontend)
        backend_connection_id = request.backend_connection_id
        session_id = request.session_id
        thread_id = request.thread_id or 'default-thread'
        
        logger.info(f"WebRTC offer - backend_connection_id: {backend_connection_id}, session_id: {session_id}, thread_id: {thread_id}")
        
        # Register RTC connection with session manager if session_id provided
        if session_id:
            from app.session_manager import session_manager
            rtc_connection_id = pipecat_connection.pc_id
            await session_manager.register_rtc_connection(
                session_id=session_id,
                rtc_connection_id=rtc_connection_id,
                thread_id=thread_id
            )
            logger.info(f"Registered RTC {rtc_connection_id} with session {session_id}, thread {thread_id}")
            
            # Get the linked WebSocket connection for this session
            linked_ws_id = await session_manager.get_linked_ws_for_rtc(rtc_connection_id)
            if linked_ws_id:
                # Use linked WebSocket ID for message routing
                backend_connection_id = linked_ws_id
                logger.info(f"Using linked WebSocket {linked_ws_id} for RTC {rtc_connection_id}")
            else:
                logger.warning(f"No linked WebSocket found for RTC {rtc_connection_id} in session {session_id}")
        
        agent = VoiceInterfaceAgent(
            pipecat_connection,
            queues.llm_message_queue,
            connection_id=backend_connection_id  # Use linked WebSocket ID for routing
        )
        
        # Register with connection manager for proper message routing
        if backend_connection_id:
            await agent.register_with_connection_manager()
            logger.info(f"Registered voice agent with connection manager for backend connection {backend_connection_id}")
        else:
            logger.warning("No backend connection ID available, voice message routing may not work properly")
        
        # Store reference for cleanup
        if not hasattr(pipecat_connection, '_associated_agents'):
            pipecat_connection._associated_agents = []
        pipecat_connection._associated_agents.append(agent)
        
        # Run the agent
        background_tasks.add_task(agent.run)
        
        # Store the connection
        answer = pipecat_connection.get_answer()
        pc_id = answer["pc_id"]
        pcs_map[pc_id] = pipecat_connection
    
    # Get the answer for the client
    answer = pipecat_connection.get_answer()
    
    return WebRTCAnswer(
        sdp=answer["sdp"],
        type=answer["type"],
        pc_id=answer["pc_id"]
    )

async def close_all_connections():
    """Close all WebRTC connections"""
    logger.info(f"Closing {len(pcs_map)} WebRTC connections")
    coros = [pc.close() for pc in pcs_map.values() if hasattr(pc, 'close')]
    await asyncio.gather(*coros, return_exceptions=True)
    pcs_map.clear()
    logger.info("All WebRTC connections closed")

# Prebuilt UI mount point (optional)
def get_prebuilt_ui():
    """Get the prebuilt UI for WebRTC if available"""
    try:
        from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI
        return SmallWebRTCPrebuiltUI
    except ImportError:
        logger.warning("SmallWebRTCPrebuiltUI not available")
        return None
