"""
Ada Interaction Engine - Server Module

This module initializes and configures the FastAPI application for the Ada system.
It replaces the monolithic main.py with a clean, modular structure that:

1. Initializes the FastAPI application with proper middleware
2. Sets up resource management via lifespan
3. Mounts all route modules
4. Initializes clients, queues, and background tasks
5. Provides health check endpoints
6. Includes a run function for starting the server
"""

import os
import asyncio
import logging
import json
from contextlib import asynccontextmanager
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from openai import AsyncOpenAI

# Import configuration
from app.config import config

# Import queue management
from app.queues import initialize_queues

# Import route modules
from app.routes.chat import router as chat_router, ws_router
from app.routes.per_connection_chat import router as per_connection_router
from app.webrtc import router as webrtc_router, close_all_connections, get_prebuilt_ui

# Import visualization processor
from app.vis_processor import create_visualization_processor

# Import MCP client
from agent.enhanced_mcp_client_agent import EnhancedMCPClient

# Import chat history manager (shared across the whole backend)
from app.chat_history_manager import chat_history_manager
logger = logging.getLogger(__name__)

async def get_or_create_mcp_client(app_state):
    """
    Get existing MCP client or create new one if needed (lazy initialization)
    
    Args:
        app_state: The FastAPI app state object
        
    Returns:
        EnhancedMCPClient instance or None if initialization fails
    """
    if app_state.enhanced_mcp_client is not None:
        return app_state.enhanced_mcp_client
    
    # Initialize the MCP client lazily
    try:
        logger.info("Lazy initializing Enhanced MCP Client...")
        enhanced_mcp_client = EnhancedMCPClient(config.mcp.mcp_config_path)
        # Prevent hanging forever if a remote MCP server is slow
        MCP_INIT_TIMEOUT = int(os.getenv("MCP_INIT_TIMEOUT", "30"))  # seconds
        try:
            await asyncio.wait_for(enhanced_mcp_client.initialize(), timeout=MCP_INIT_TIMEOUT)
        except asyncio.TimeoutError:
            logger.error(
                "Timed-out while initialising Enhanced MCP Client "
                f"(>{MCP_INIT_TIMEOUT}s). Continuing without MCP."
            )
            enhanced_mcp_client = None
        app_state.enhanced_mcp_client = enhanced_mcp_client
        if enhanced_mcp_client:
            logger.info("Enhanced MCP Client initialized successfully.")
            
            # Start the visualization processor now that MCP client is available
            if not getattr(app_state, 'visualization_processor', None):
                try:
                    logger.info("Starting Visualization Processor...")
                    visualization_processor = await create_visualization_processor(
                        enhanced_mcp_client=enhanced_mcp_client,
                        thesys_client=getattr(app_state, 'thesys_client', None),
                        app_state=app_state
                    )
                    app_state.visualization_processor = visualization_processor
                    logger.info("Visualization Processor started successfully.")
                except Exception as e:
                    logger.error(f"Failed to start Visualization Processor: {e}", exc_info=True)
                    
        return enhanced_mcp_client
    except Exception as e:
        logger.error(f"Failed to initialize MCP Client: {e}", exc_info=True)
        app_state.enhanced_mcp_client = None
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application
    
    This handles:
    1. Initialization of Thesys client (if API key available)
    2. Initialization of queues
    3. Lazy initialization of MCP client and visualization processor
    4. Cleanup on shutdown
    
    Args:
        app: The FastAPI application
    """
    # Initialize global state
    app.state.enhanced_mcp_client = None
    app.state.thesys_client = None
    app.state.visualization_processor = None
    # Make chat history manager available everywhere via app.state
    app.state.chat_history_manager = chat_history_manager
    
    # Initialize queues
    initialize_queues()
    
    # Initialize Thesys Client if API key is available
    if config.api.thesys_api_key:
        try:
            logger.info("Initializing Thesys Client...")
            thesys_client = AsyncOpenAI(
                api_key=config.api.thesys_api_key,
                base_url=config.thesys.thesys_base_url,
            )
            app.state.thesys_client = thesys_client
            logger.info("Thesys Client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Thesys Client during startup: {e}", exc_info=True)
            app.state.thesys_client = None
    else:
        logger.warning("THESYS_API_KEY not found. Visualization features will be disabled.")
    
    # Start the visualization processor immediately with app_state for lazy MCP initialization
    try:
        logger.info("Starting Visualization Processor with lazy MCP client initialization...")
        visualization_processor = await create_visualization_processor(
            enhanced_mcp_client=None,  # Will be initialized lazily
            thesys_client=app.state.thesys_client,
            app_state=app.state
        )
        app.state.visualization_processor = visualization_processor
        logger.info("Visualization Processor started successfully with lazy initialization.")
    except Exception as e:
        logger.error(f"Failed to start Visualization Processor: {e}", exc_info=True)
    
    # Note: MCP client will be initialized lazily when first needed
    logger.info("Server startup complete - MCP client will be initialized on first use")
    
    # Application runs here
    yield
    
    # Cleanup on shutdown
    
    # Stop the visualization processor
    if app.state.visualization_processor:
        try:
            logger.info("Stopping Visualization Processor...")
            await app.state.visualization_processor.stop()
            logger.info("Visualization Processor stopped successfully.")
        except Exception as e:
            logger.error(f"Failed to stop Visualization Processor: {e}", exc_info=True)
    
    # Close the MCP client
    if app.state.enhanced_mcp_client:
        try:
            logger.info("Closing Enhanced MCP Client...")
            await app.state.enhanced_mcp_client.close()
            logger.info("Enhanced MCP Client closed successfully.")
        except Exception as e:
            logger.error(f"Failed to close MCP Client: {e}", exc_info=True)
    
    # Close all WebRTC connections
    try:
        await close_all_connections()
    except Exception as e:
        logger.error(f"Failed to close WebRTC connections: {e}", exc_info=True)

    # Cleanup inactive chat threads
    try:
        removed = await chat_history_manager.cleanup_inactive_threads()
        logger.info(f"Cleaned up {removed} inactive chat threads on shutdown.")
    except Exception as e:
        logger.error(f"Failed cleaning up chat history threads: {e}", exc_info=True)

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application
    
    Returns:
        The configured FastAPI application
    """
    # Create the FastAPI application
    app = FastAPI(
        title="Ada Interaction Engine",
        description="A dual-path voice and chat interaction system with dynamic UI generation",
        version="0.1.0",
        lifespan=lifespan
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.fastapi.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(chat_router)
    app.include_router(ws_router)
    app.include_router(per_connection_router)
    app.include_router(webrtc_router)
    
    # Mount prebuilt UI if available
    prebuilt_ui = get_prebuilt_ui()
    if prebuilt_ui:
        app.mount("/prebuilt", prebuilt_ui)
    
    # Add health check endpoint
    @app.get("/health", tags=["health"])
    def health_check():
        """Health check endpoint"""
        return {"status": "ok"}
    
    # Add root redirect
    @app.get("/", include_in_schema=False)
    def root_redirect():
        """Redirect root to health check"""
        return RedirectResponse(url="/health")
    
    # Add MCP tools info endpoint
    @app.get("/api/mcp/tools", tags=["mcp"])
    async def list_mcp_tools(request: Request):
        """List all available MCP tools from the enhanced client"""
        tools_info = {
            "enhanced_client": []
        }
        
        # Get tools from enhanced client (with lazy initialization)
        try:
            enhanced_mcp_client = await get_or_create_mcp_client(request.app.state)
            if enhanced_mcp_client:
                enhanced_tools = enhanced_mcp_client.get_available_tools()
                tools_info["enhanced_client"] = enhanced_tools
        except Exception as e:
            logger.error(f"Error getting enhanced tools: {e}")
        
        return tools_info

    # ------------------------------------------------------------------ #
    # Chat-history debugging / inspection endpoints (internal use only)
    # ------------------------------------------------------------------ #

    @app.get("/api/chat/threads", tags=["debug"])
    async def list_threads():
        """Return all active thread IDs (debug only)."""
        return await chat_history_manager.get_all_threads()

    @app.get("/api/chat/history/{thread_id}", tags=["debug"])
    async def get_thread_history(thread_id: str, max_messages: int | None = None):
        """
        Return conversation history for a specific thread ID.
        `max_messages` can limit the number of recent messages returned.
        """
        if max_messages:
            return await chat_history_manager.get_recent_history(thread_id, max_messages=max_messages)
        return await chat_history_manager.get_history(thread_id)
    
   
    return app

def run():
    """Run the FastAPI application using uvicorn"""
    import uvicorn
    
    # Configure logging
    log_level = config.logging.log_level.lower()
    
    logger.info(f"Starting Ada Interaction Engine server on {config.fastapi.host}:{config.fastapi.port}")
    
    # Run the application
    uvicorn.run(
        "app.server:create_application",
        host=config.fastapi.host,
        port=config.fastapi.port,
        log_level=log_level,
        reload=config.fastapi.reload,
        factory=True
    )

# Create application instance for ASGI servers
app = create_application()

# Run the application if executed directly
if __name__ == "__main__":
    run()
