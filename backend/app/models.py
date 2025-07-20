"""
Ada Interaction Engine - Data Models Module

This module defines Pydantic models for per-connection configuration,
state management, and message types for the multi-tenant WebSocket architecture.
"""

import time
import uuid
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator

class ConnectionState(str, Enum):
    """Connection state enumeration for state machine"""
    CONNECTING = "connecting"
    CONFIG_RECEIVED = "config_received"
    VALIDATING = "validating"
    MCP_INITIALIZING = "mcp_initializing"
    VIZ_INITIALIZING = "viz_initializing"
    READY = "ready"
    ACTIVE = "active"
    ERROR = "error"
    DISCONNECTING = "disconnecting"
    CLOSED = "closed"

class MCPServerConfig(BaseModel):
    """Configuration for individual MCP server"""
    name: str = Field(..., description="Unique name for the MCP server")
    url: str = Field(..., description="URL of the MCP server")
    transport: str = Field(default="http", description="Transport protocol (http, websocket, stdio)")
    description: Optional[str] = Field(None, description="Human-readable description")
    headers: Optional[Dict[str, str]] = Field(None, description="Custom HTTP headers")
    timeout: int = Field(default=30, description="Timeout in seconds for server operations")
    
    @validator('url')
    def validate_url(cls, v):
        """Basic URL validation"""
        if not v.startswith(('http://', 'https://', 'ws://', 'wss://')):
            raise ValueError('URL must start with http://, https://, ws://, or wss://')
        return v
    
    @validator('transport')
    def validate_transport(cls, v):
        """Validate transport type"""
        if v not in ['http', 'websocket', 'stdio']:
            raise ValueError('Transport must be http, websocket, or stdio')
        return v

class MCPClientConfig(BaseModel):
    """Configuration for MCP client"""
    model: str = Field(default="gpt-4o-mini", description="LLM model to use")
    api_key_env: str = Field(default="OPENAI_API_KEY", description="Environment variable for API key")
    servers: List[MCPServerConfig] = Field(default=[], description="List of MCP servers to connect to")
    timeout: int = Field(default=30, description="Default timeout for MCP operations")
    max_servers: int = Field(default=10, description="Maximum number of MCP servers allowed")
    
    @validator('servers')
    def validate_servers(cls, v, values):
        """Validate server list"""
        max_servers = values.get('max_servers', 10)
        if len(v) > max_servers:
            raise ValueError(f'Too many servers. Maximum allowed: {max_servers}')
        
        # Check for duplicate server names
        names = [server.name for server in v]
        if len(names) != len(set(names)):
            raise ValueError('Server names must be unique')
        
        return v

class VisualizationProviderConfig(BaseModel):
    """Configuration for visualization provider"""
    provider_type: str = Field(..., description="Type of visualization provider")
    api_key_env: Optional[str] = Field(None, description="Environment variable for API key")
    base_url: Optional[str] = Field(None, description="Base URL for the provider API")
    model: Optional[str] = Field(None, description="Model to use for visualization")
    timeout: int = Field(default=30, description="Timeout for visualization requests")
    custom_headers: Optional[Dict[str, str]] = Field(None, description="Custom headers for API requests")
    
    @validator('provider_type')
    def validate_provider_type(cls, v):
        """Validate provider type"""
        allowed_providers = ['thesys', 'google', 'tomorrow', 'openai', 'anthropic']
        if v not in allowed_providers:
            raise ValueError(f'Provider type must be one of: {", ".join(allowed_providers)}')
        return v

class ConnectionConfig(BaseModel):
    """Complete configuration for a WebSocket connection"""
    client_id: str = Field(..., description="Unique identifier for the client")
    auth_token: Optional[str] = Field(None, description="Authentication token")
    mcp_config: MCPClientConfig = Field(..., description="MCP client configuration")
    visualization_provider: VisualizationProviderConfig = Field(..., description="Visualization provider config")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="Client preferences")
    
    @validator('client_id')
    def validate_client_id(cls, v):
        """Validate client ID format"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Client ID cannot be empty')
        if len(v) > 100:
            raise ValueError('Client ID too long (max 100 characters)')
        return v.strip()

class ConnectionConfigMessage(BaseModel):
    """Message sent by client to configure the connection"""
    type: str = Field(default="connection_config", description="Message type")
    config: ConnectionConfig = Field(..., description="Connection configuration")
    
    @validator('type')
    def validate_type(cls, v):
        """Ensure message type is correct"""
        if v != "connection_config":
            raise ValueError('Message type must be "connection_config"')
        return v

class ConnectionStateMessage(BaseModel):
    """Message sent by server to update connection state"""
    type: str = Field(default="connection_state", description="Message type")
    state: ConnectionState = Field(..., description="Current connection state")
    message: str = Field(..., description="Human-readable state description")
    progress: Optional[int] = Field(None, description="Progress percentage (0-100)")
    connection_id: Optional[str] = Field(None, description="Connection identifier")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    timestamp: float = Field(default_factory=time.time, description="Timestamp of state change")
    
    @validator('progress')
    def validate_progress(cls, v):
        """Validate progress percentage"""
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Progress must be between 0 and 100')
        return v

class ConnectionEstablishedMessage(BaseModel):
    """Initial message sent when WebSocket connection is established"""
    type: str = Field(default="connection_established", description="Message type")
    connection_id: str = Field(..., description="Unique connection identifier")
    message: str = Field(default="WebSocket connected. Please send configuration.", description="Welcome message")
    timestamp: float = Field(default_factory=time.time, description="Connection timestamp")

class ErrorMessage(BaseModel):
    """Error message format"""
    type: str = Field(default="error", description="Message type")
    message: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code for programmatic handling")
    connection_id: Optional[str] = Field(None, description="Associated connection ID")
    timestamp: float = Field(default_factory=time.time, description="Error timestamp")

class ChatMessage(BaseModel):
    """Chat message from client"""
    type: str = Field(..., description="Message type (chat, chat_request)")
    message: str = Field(..., description="Chat message content")
    thread_id: Optional[str] = Field(None, description="Thread identifier")
    connection_id: Optional[str] = Field(None, description="Connection identifier")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @validator('type')
    def validate_type(cls, v):
        """Validate message type"""
        if v not in ['chat', 'chat_request']:
            raise ValueError('Message type must be "chat" or "chat_request"')
        return v
    
    @validator('message')
    def validate_message(cls, v):
        """Validate message content"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Message cannot be empty')
        if len(v) > 10000:  # 10KB limit
            raise ValueError('Message too long (max 10KB)')
        return v.strip()

class ConnectionMetrics(BaseModel):
    """Metrics for connection monitoring"""
    connection_id: str
    client_id: str
    state: ConnectionState
    created_at: float
    last_activity: float
    messages_sent: int = 0
    messages_received: int = 0
    mcp_calls: int = 0
    viz_requests: int = 0
    errors: int = 0
    
# Message type union for type hints
WebSocketMessage = Union[
    ConnectionConfigMessage,
    ConnectionStateMessage,
    ConnectionEstablishedMessage,
    ErrorMessage,
    ChatMessage
]