"""
Ada Interaction Engine - Connection Manager

This module manages per-connection resources including MCP clients,
visualization providers, queues, and state management for multi-tenant
WebSocket connections.
"""

import os
import json
import time
import uuid
import asyncio
import logging
import tempfile
from typing import Dict, Optional, List, Any
from dataclasses import dataclass, field
from urllib.parse import urlparse
from weakref import WeakSet

from fastapi import WebSocket

from app.models import (
    ConnectionConfig, ConnectionState, ConnectionStateMessage,
    ConnectionMetrics, VisualizationProviderConfig, MCPClientConfig
)
from app.viz_provider_factory import VisualizationProviderFactory, VisualizationProvider
from agent.enhanced_mcp_client_agent import EnhancedMCPClient

logger = logging.getLogger(__name__)

@dataclass
class ConnectionContext:
    """Context for a single WebSocket connection"""
    connection_id: str
    websocket: WebSocket
    config: Optional[ConnectionConfig] = None
    state: ConnectionState = ConnectionState.CONNECTING
    mcp_client: Optional[EnhancedMCPClient] = None
    visualization_provider: Optional[VisualizationProvider] = None
    message_queue: Optional[asyncio.Queue] = None
    raw_output_queue: Optional[asyncio.Queue] = None
    processor_task: Optional[asyncio.Task] = None
    temp_mcp_config_path: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    metrics: ConnectionMetrics = field(init=False)
    conversation_histories: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    # Voice-related fields
    voice_agent: Optional[Any] = None  # Will be VoiceInterfaceAgent when connected
    webrtc_connection: Optional[Any] = None  # Will be SmallWebRTCConnection when active
    voice_thread_id: Optional[str] = None  # Thread ID for voice conversations
    
    def __post_init__(self):
        """Initialize metrics after dataclass creation"""
        self.metrics = ConnectionMetrics(
            connection_id=self.connection_id,
            client_id=self.config.client_id if self.config else "unknown",
            state=self.state,
            created_at=self.created_at,
            last_activity=self.last_activity
        )

class ConnectionManager:
    """Manager for all WebSocket connections and their resources"""
    
    def __init__(self):
        self.connections: Dict[str, ConnectionContext] = {}
        self.viz_factory = VisualizationProviderFactory()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._authorized_clients: WeakSet = WeakSet()
        
    async def start(self):
        """Start the connection manager"""
        # Start periodic cleanup task
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        logger.info("Connection manager started")
    
    async def stop(self):
        """Stop the connection manager and cleanup all connections"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Cleanup all connections
        connection_ids = list(self.connections.keys())
        for connection_id in connection_ids:
            await self.cleanup_connection(connection_id)
        
        logger.info("Connection manager stopped")
    
    async def register_connection(self, websocket: WebSocket) -> str:
        """Register a new WebSocket connection"""
        connection_id = str(uuid.uuid4())
        
        context = ConnectionContext(
            connection_id=connection_id,
            websocket=websocket,
            message_queue=asyncio.Queue(maxsize=100),
            raw_output_queue=asyncio.Queue(maxsize=100)
        )
        
        self.connections[connection_id] = context
        logger.info(f"Registered connection {connection_id} from {websocket.client.host}")
        return connection_id
    
    async def update_state(
        self, 
        connection_id: str, 
        state: ConnectionState, 
        message: str, 
        progress: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update connection state and notify frontend"""
        if connection_id not in self.connections:
            logger.warning(f"Attempted to update state for unknown connection: {connection_id}")
            return False
        
        context = self.connections[connection_id]
        old_state = context.state
        context.state = state
        context.last_activity = time.time()
        context.metrics.state = state
        context.metrics.last_activity = context.last_activity
        
        # Create state message
        state_message = ConnectionStateMessage(
            state=state,
            message=message,
            progress=progress,
            connection_id=connection_id,
            metadata=metadata
        )
        
        try:
            await context.websocket.send_text(state_message.model_dump_json())
            logger.info(f"Connection {connection_id}: {old_state} → {state} - {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to send state update to {connection_id}: {e}")
            # Mark connection for cleanup if websocket is broken
            if state != ConnectionState.ERROR:
                await self.update_state(connection_id, ConnectionState.ERROR, 
                                       f"Communication error: {str(e)}")
            return False
    
    async def configure_connection(self, connection_id: str, config: ConnectionConfig) -> bool:
        """Configure connection with MCP and visualization settings"""
        if connection_id not in self.connections:
            return False
        
        context = self.connections[connection_id]
        context.config = config
        context.metrics.client_id = config.client_id
        
        try:
            await self.update_state(
                connection_id, 
                ConnectionState.CONFIG_RECEIVED, 
                "Configuration received, validating..."
            )
            
            # Validate configuration
            if not await self._validate_config(config):
                await self.update_state(
                    connection_id, 
                    ConnectionState.ERROR, 
                    "Configuration validation failed"
                )
                return False
            
            await self.update_state(
                connection_id, 
                ConnectionState.VALIDATING, 
                "Configuration validated, initializing MCP client...", 
                25
            )
            
            # Initialize MCP client
            try:
                context.mcp_client = await self._initialize_mcp_client(connection_id, config.mcp_config)
                await self.update_state(
                    connection_id, 
                    ConnectionState.MCP_INITIALIZING,
                    f"MCP client ready with {len(context.mcp_client.sessions)} servers, setting up visualization...", 
                    50
                )
            except Exception as e:
                logger.error(f"MCP initialization failed for {connection_id}: {e}", exc_info=True)
                await self.update_state(
                    connection_id, 
                    ConnectionState.ERROR,
                    f"MCP initialization failed: {str(e)}"
                )
                return False
            
            # Initialize visualization provider
            try:
                context.visualization_provider = await self._initialize_viz_provider(
                    connection_id, config.visualization_provider
                )
                await self.update_state(
                    connection_id, 
                    ConnectionState.VIZ_INITIALIZING,
                    f"Visualization provider ({config.visualization_provider.provider_type}) ready, finalizing setup...", 
                    75
                )
            except Exception as e:
                logger.error(f"Visualization setup failed for {connection_id}: {e}", exc_info=True)
                await self.update_state(
                    connection_id, 
                    ConnectionState.ERROR,
                    f"Visualization setup failed: {str(e)}"
                )
                return False
            
            await self.update_state(
                connection_id, 
                ConnectionState.READY,
                "Connection ready for chat!", 
                100
            )
            
            # Start per-connection processor
            await self._start_processor(connection_id)
            
            await self.update_state(
                connection_id, 
                ConnectionState.ACTIVE,
                "Connection active and processing messages"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Configuration error for {connection_id}: {e}", exc_info=True)
            await self.update_state(
                connection_id, 
                ConnectionState.ERROR,
                f"Configuration error: {str(e)}"
            )
            return False
    
    async def _validate_config(self, config: ConnectionConfig) -> bool:
        """Validate connection configuration"""
        try:
            # Basic validation is handled by Pydantic models
            
            # Validate client authorization
            if not await self._validate_client_auth(config.client_id, config.auth_token):
                logger.warning(f"Unauthorized client: {config.client_id}")
                return False
            
            # Validate MCP server URLs for security
            for server in config.mcp_config.servers:
                if not await self._validate_mcp_server_url(server.url):
                    logger.warning(f"Invalid MCP server URL: {server.url}")
                    return False
            
            # Validate visualization provider
            if not await self._validate_viz_provider_config(config.visualization_provider):
                logger.warning(f"Invalid visualization provider: {config.visualization_provider.provider_type}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Configuration validation error: {e}")
            return False
    
    async def _validate_client_auth(self, client_id: str, auth_token: Optional[str]) -> bool:
        """Validate client credentials"""
        # TODO: Implement proper authentication
        # For now, allow all clients
        return True
    
    async def _validate_mcp_server_url(self, url: str) -> bool:
        """Validate MCP server URL for security (prevent SSRF)"""
        try:
            parsed = urlparse(url)
            
            # Block localhost and internal IPs
            forbidden_hosts = [
                "localhost", "127.0.0.1", "0.0.0.0",
                "169.254.169.254",  # AWS metadata service
                "::1"  # IPv6 localhost
            ]
            
            if parsed.hostname in forbidden_hosts:
                return False
            
            # Block private IP ranges (basic check)
            if parsed.hostname and parsed.hostname.startswith(("10.", "172.", "192.168.")):
                return False
            
            return True
            
        except Exception:
            return False
    
    async def _validate_viz_provider_config(self, config: VisualizationProviderConfig) -> bool:
        """Validate visualization provider configuration"""
        # Check if required environment variables exist
        if config.api_key_env:
            api_key = os.getenv(config.api_key_env)
            if not api_key:
                logger.warning(f"API key not found in environment: {config.api_key_env}")
                return False
        
        return True
    
    async def _initialize_mcp_client(self, connection_id: str, mcp_config: MCPClientConfig) -> EnhancedMCPClient:
        """Initialize MCP client with progress updates"""
        await self.update_state(
            connection_id, 
            ConnectionState.MCP_INITIALIZING,
            "Creating MCP client configuration...", 
            30
        )
        
        # Create temporary config file for this connection
        config_data = {
            "config": {
                "model": mcp_config.model,
                "openai_api_key_env": mcp_config.api_key_env
            },
            "servers": {}
        }
        
        for server in mcp_config.servers:
            config_data["servers"][server.name] = {
                "url": server.url,
                "transport": server.transport,
                "description": server.description
            }
            if server.headers:
                config_data["servers"][server.name]["headers"] = server.headers
        
        # Write to temporary file
        temp_file = tempfile.NamedTemporaryFile(
            mode='w', 
            suffix=f'_mcp_config_{connection_id}.json',
            delete=False
        )
        
        with temp_file as f:
            json.dump(config_data, f, indent=2)
            temp_path = f.name
        
        # Store temp path for cleanup
        context = self.connections[connection_id]
        context.temp_mcp_config_path = temp_path
        
        await self.update_state(
            connection_id, 
            ConnectionState.MCP_INITIALIZING,
            "Connecting to MCP servers...", 
            40
        )
        
        try:
            client = EnhancedMCPClient(temp_path, max_tool_calls=mcp_config.max_tool_calls)
            await asyncio.wait_for(client.initialize(), timeout=mcp_config.timeout)
            
            await self.update_state(
                connection_id, 
                ConnectionState.MCP_INITIALIZING,
                f"Connected to {len(client.sessions)} MCP servers", 
                45
            )
            
            return client
            
        except asyncio.TimeoutError:
            raise Exception(f"MCP client initialization timed out after {mcp_config.timeout}s")
        except Exception as e:
            raise Exception(f"MCP client initialization failed: {str(e)}")
    
    async def _initialize_viz_provider(
        self, 
        connection_id: str, 
        viz_config: VisualizationProviderConfig
    ) -> VisualizationProvider:
        """Initialize visualization provider"""
        await self.update_state(
            connection_id, 
            ConnectionState.VIZ_INITIALIZING,
            f"Setting up {viz_config.provider_type} visualization provider...", 
            60
        )
        
        try:
            provider = await self.viz_factory.create_provider(viz_config)
            if not provider:
                raise Exception(f"Failed to create {viz_config.provider_type} provider")
            
            await self.update_state(
                connection_id, 
                ConnectionState.VIZ_INITIALIZING,
                f"{viz_config.provider_type} provider ready", 
                70
            )
            
            return provider
            
        except Exception as e:
            raise Exception(f"Visualization provider setup failed: {str(e)}")
    
    async def _start_processor(self, connection_id: str):
        """Start per-connection message processor"""
        context = self.connections[connection_id]
        
        # Import here to avoid circular imports
        from app.connection_processor import PerConnectionProcessor
        
        processor = PerConnectionProcessor(context)
        context.processor_task = asyncio.create_task(processor.run())
        
        logger.info(f"Started processor for connection {connection_id}")
    
    async def cleanup_connection(self, connection_id: str):
        """Clean up all resources for a connection"""
        if connection_id not in self.connections:
            return
        
        context = self.connections[connection_id]
        logger.info(f"Cleaning up connection {connection_id}")
        
        try:
            await self.update_state(
                connection_id, 
                ConnectionState.DISCONNECTING, 
                "Cleaning up connection..."
            )
        except:
            pass  # Websocket might already be closed
        
        # Stop processor task
        if context.processor_task:
            context.processor_task.cancel()
            try:
                await asyncio.wait_for(context.processor_task, timeout=5.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
        
        # Cleanup voice agent and broadcast subscriptions
        if context.voice_agent:
            try:
                logger.info(f"Cleaning up voice agent for connection {connection_id}")
                # Cleanup broadcast subscription
                from app.voice_broadcast_manager import voice_broadcast_manager
                await voice_broadcast_manager.unsubscribe(connection_id)
                
                # The voice agent cleanup will be handled by WebRTC connection closure
                context.voice_agent = None
                context.webrtc_connection = None
                context.voice_thread_id = None
            except Exception as e:
                logger.error(f"Error cleaning up voice agent for {connection_id}: {e}")
        
        # Close MCP client
        if context.mcp_client:
            try:
                await context.mcp_client.close()
            except Exception as e:
                logger.error(f"Error closing MCP client for {connection_id}: {e}")
        
        # Cleanup visualization provider
        if context.visualization_provider:
            try:
                await context.visualization_provider.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up viz provider for {connection_id}: {e}")
        
        # Remove temporary MCP config file
        if context.temp_mcp_config_path and os.path.exists(context.temp_mcp_config_path):
            try:
                os.unlink(context.temp_mcp_config_path)
            except Exception as e:
                logger.error(f"Error removing temp config file: {e}")
        
        # Clear queues
        for queue in [context.message_queue, context.raw_output_queue]:
            if queue:
                while not queue.empty():
                    try:
                        queue.get_nowait()
                        queue.task_done()
                    except:
                        break
        
        # Remove from connections
        del self.connections[connection_id]
        logger.info(f"Connection {connection_id} cleaned up successfully")
    
    async def register_voice_agent(self, connection_id: str, voice_agent: Any, webrtc_connection: Any, voice_thread_id: str) -> bool:
        """Register a voice agent for a specific connection"""
        if connection_id not in self.connections:
            logger.warning(f"Attempted to register voice agent for unknown connection: {connection_id}")
            return False
        
        context = self.connections[connection_id]
        context.voice_agent = voice_agent
        context.webrtc_connection = webrtc_connection
        context.voice_thread_id = voice_thread_id
        
        # Update broadcast manager thread mapping for existing subscriptions
        from app.voice_broadcast_manager import voice_broadcast_manager
        await voice_broadcast_manager.update_thread_id(connection_id, voice_thread_id)
        
        logger.info(f"Registered voice agent for connection {connection_id} with thread_id {voice_thread_id}")
        return True
    
    async def unregister_voice_agent(self, connection_id: str) -> bool:
        """Unregister voice agent for a specific connection"""
        if connection_id not in self.connections:
            return False
        
        context = self.connections[connection_id]
        if context.voice_agent:
            logger.info(f"Unregistered voice agent for connection {connection_id}")
            context.voice_agent = None
            context.webrtc_connection = None
            context.voice_thread_id = None
            return True
        
        return False
    
    async def get_voice_agent_by_connection(self, connection_id: str) -> Optional[Any]:
        """Get voice agent for a specific connection"""
        if connection_id not in self.connections:
            return None
        return self.connections[connection_id].voice_agent
    
    async def get_voice_agent_by_thread_id(self, thread_id: str) -> tuple[Optional[Any], Optional[str]]:
        """Get voice agent and connection_id by thread_id"""
        for connection_id, context in self.connections.items():
            if context.voice_thread_id == thread_id:
                return context.voice_agent, connection_id
        return None, None
    
    async def inject_tts_to_connection(self, connection_id: str, voice_text: str) -> bool:
        """Inject TTS voice-over to a specific connection's voice agent"""
        if connection_id not in self.connections:
            logger.warning(f"Attempted TTS injection for unknown connection: {connection_id}")
            return False
        
        context = self.connections[connection_id]
        if not context.voice_agent:
            logger.warning(f"No voice agent found for connection {connection_id}")
            return False
        
        try:
            await context.voice_agent.inject_tts_voice_over(voice_text)
            logger.info(f"Successfully injected TTS to connection {connection_id}: '{voice_text[:50]}...'")
            return True
        except Exception as e:
            logger.error(f"Failed to inject TTS to connection {connection_id}: {e}")
            return False
    

    async def get_connection_metrics(self) -> Dict[str, Any]:
        """Get metrics for all connections"""
        metrics = {
            "total_connections": len(self.connections),
            "connections_by_state": {},
            "connections": []
        }
        
        for context in self.connections.values():
            state_str = context.state.value
            metrics["connections_by_state"][state_str] = metrics["connections_by_state"].get(state_str, 0) + 1
            metrics["connections"].append({
                "connection_id": context.connection_id,
                "client_id": context.config.client_id if context.config else "unknown",
                "state": state_str,
                "created_at": context.created_at,
                "last_activity": context.last_activity,
                "mcp_servers": len(context.mcp_client.sessions) if context.mcp_client else 0,
                "viz_provider": context.config.visualization_provider.provider_type if context.config else None,
                "has_voice_agent": context.voice_agent is not None,
                "voice_thread_id": context.voice_thread_id
            })
        
        return metrics
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of stale connections"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                current_time = time.time()
                stale_connections = []
                
                for connection_id, context in self.connections.items():
                    # Mark connections as stale if no activity for 1 hour
                    if current_time - context.last_activity > 3600:
                        stale_connections.append(connection_id)
                
                for connection_id in stale_connections:
                    logger.info(f"Cleaning up stale connection: {connection_id}")
                    await self.cleanup_connection(connection_id)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")

# Global connection manager instance
connection_manager = ConnectionManager()