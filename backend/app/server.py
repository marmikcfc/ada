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
# from app.routes.chat import router as chat_router, ws_router
from app.routes.chat import router as per_connection_router
from app.webrtc import router as webrtc_router, close_all_connections, get_prebuilt_ui

# Import MCP client
from agent.enhanced_mcp_client_agent import EnhancedMCPClient

# Import chat history manager (shared across the whole backend)
from app.chat_history_manager import chat_history_manager
logger = logging.getLogger(__name__)

# Removed global MCP client - now using per-connection MCP clients only


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
    # Initialize global state (removed enhanced_mcp_client - using per-connection only)
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
    
    # Start the visualization processor without global MCP client
    try:
        logger.info("Starting Visualization Processor (per-connection MCP only)...")
        # visualization_processor = await create_visualization_processor(
        #     enhanced_mcp_client=None,  # No global MCP client
        #     thesys_client=app.state.thesys_client,
        #     app_state=app.state
        # )
        app.state.visualization_processor = None #visualization_processor
        logger.info("Visualization Processor started successfully (per-connection MCP only).")
    except Exception as e:
        logger.error(f"Failed to start Visualization Processor: {e}", exc_info=True)
    
    logger.info("Server startup complete - using per-connection MCP clients only")
    
    # Application runs here
    yield
    
    # Cleanup on shutdown
    
    # Visualization processor removed - using per-connection processing only
    
    # Global MCP client removed - per-connection clients are cleaned up automatically
    
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
    # app.include_router(chat_router)
    # app.include_router(ws_router)
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
