"""
Ada Interaction Engine - Configuration Module

This module centralizes all environment variable loading and application settings.
It provides typed configuration objects for different components of the system.
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
# NOTE: In Pydantic v2 the `BaseSettings` class moved to `pydantic_settings`.
# Importing from the old location raises an ImportError.
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import logging
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the application
BASE_DIR = Path(__file__).parent.parent

# --------------------------------------------------------------------------- #
# Load .env **once** at import time so every `BaseSettings` class receives the
# variables from the process environment.  Using `override=False` keeps any
# values that are already set in the shell (so `docker run -e` still wins).
# --------------------------------------------------------------------------- #
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Common settings base – allows unknown env vars so legacy keys don't break  #
# --------------------------------------------------------------------------- #


class SettingsBase(BaseSettings):
    """
    Shared BaseSettings subclass that:
    • Loads from `.env`
    • Is case-sensitive (maintains existing behaviour)
    • **Allows extra keys** so stray / legacy environment variables do not
      raise validation errors (important for large .env files shared across
      services).
    """

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="allow",
    )


# --------------------------------------------------------------------------- #
# Typed configuration sections                                               #
# --------------------------------------------------------------------------- #


class APISettings(SettingsBase):
    """API keys and external service configurations"""
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    thesys_api_key: str = Field(default="", alias="THESYS_API_KEY")
    smithery_api_key: str = Field(default="", alias="SMITHERY_API_KEY")
    
class ModelSettings(SettingsBase):
    """LLM model configurations"""
    agent_model: str = Field(default="gpt-4o-mini", alias="AGENT_MODEL")
    enhancement_model: str = Field(default="gpt-4o-mini", alias="ENHANCEMENT_MODEL")
    thesys_model: str = Field(default="c1-nightly", alias="THESYS_MODEL")
    temperature: float = Field(default=0.3, alias="MODEL_TEMPERATURE")
    
class DatabaseSettings(SettingsBase):
    """Database configurations"""
    agent_sqlite_db: str = Field(default="agent_history.db", alias="AGENT_SQLITE_DB")
    
class WebRTCSettings(SettingsBase):
    """WebRTC configurations"""
    ice_servers: List[Dict[str, str]] = Field(
        default=[{"urls": "stun:stun.l.google.com:19302"}],
        description="ICE servers for WebRTC connections"
    )
    
class MCPSettings(SettingsBase):
    """MCP server configurations"""
    mcp_config_path: str = Field(
        default=str(BASE_DIR / "mcp_servers.json"),
        alias="MCP_CONFIG_PATH"
    )
    
class ThesysSettings(SettingsBase):
    """Thesys API configurations"""
    thesys_base_url: str = Field(
        default="https://api.thesys.dev/v1/visualize",
        alias="THESYS_BASE_URL"
    )
    
class FastAPISettings(SettingsBase):
    """FastAPI server configurations"""
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    reload: bool = Field(default=False, alias="RELOAD")
    cors_origins: List[str] = Field(default=["*"], alias="CORS_ORIGINS")
    
class QueueSettings(SettingsBase):
    """Queue configurations for async communication"""
    llm_message_queue_maxsize: int = Field(default=100, alias="LLM_MESSAGE_QUEUE_MAXSIZE")
    # Removed raw_llm_output_queue_maxsize - using per-connection processing only
    
class LoggingSettings(SettingsBase):
    """Logging configurations"""
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        alias="LOG_FORMAT"
    )
    
# --------------------------------------------------------------------------- #
# Streaming-related settings (C1Component chunk streaming)                   #
# --------------------------------------------------------------------------- #


class StreamingSettings(SettingsBase):
    """Settings for C1Component chunk streaming (always enabled)."""
    c1_streaming_chunk_size: int = Field(
        default=512,
        alias="C1_STREAMING_CHUNK_SIZE",
        description="Maximum JSON payload size (bytes) for each streamed chunk",
    )
    c1_streaming_chunk_delay: float = Field(
        default=0.01,
        alias="C1_STREAMING_CHUNK_DELAY",
        description="Optional async sleep between chunk sends to smooth UI updates",
    )

# --------------------------------------------------------------------------- #
@dataclass
class AppConfig:
    """Main application configuration"""
    api: APISettings
    model: ModelSettings
    database: DatabaseSettings
    webrtc: WebRTCSettings
    mcp: MCPSettings
    thesys: ThesysSettings
    fastapi: FastAPISettings
    queue: QueueSettings
    logging: LoggingSettings
    streaming: "StreamingSettings"  # quotes for forward reference


def load_config() -> AppConfig:
    """Load and return the application configuration"""
    try:
        logger.info("Loading application configuration...")
        
        # Load all configuration components
        api_settings = APISettings()
        model_settings = ModelSettings()
        database_settings = DatabaseSettings()
        webrtc_settings = WebRTCSettings()
        mcp_settings = MCPSettings()
        thesys_settings = ThesysSettings()
        fastapi_settings = FastAPISettings()
        queue_settings = QueueSettings()
        logging_settings = LoggingSettings()
        streaming_settings = StreamingSettings()
        
        # Configure logging based on settings
        logging.basicConfig(
            level=getattr(logging, logging_settings.log_level),
            format=logging_settings.log_format
        )
        
        # Validate critical settings
        if not api_settings.openai_api_key:
            logger.warning("OPENAI_API_KEY not set. Some features may not work.")
        
        if not api_settings.thesys_api_key:
            logger.warning("THESYS_API_KEY not set. Visualization features will be disabled.")
        
        # Create and return the complete config
        config = AppConfig(
            api=api_settings,
            model=model_settings,
            database=database_settings,
            webrtc=webrtc_settings,
            mcp=mcp_settings,
            thesys=thesys_settings,
            fastapi=fastapi_settings,
            queue=queue_settings,
            logging=logging_settings,
            streaming=streaming_settings
        )
        
        logger.info("Configuration loaded successfully")
        return config
        
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        raise


# Create a global config instance
config = load_config()
