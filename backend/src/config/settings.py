import os
import json
import logging
from dotenv import load_dotenv
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# --- LLM Configuration ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
# Add other LLM provider keys as needed

LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gpt-4o") # Default model for core tasks
EVAL_LLM_MODEL_NAME = os.getenv("EVAL_LLM_MODEL_NAME", "gpt-3.5-turbo") # Default model for evaluation

# --- MCP Server Configuration --- 
MCP_CONFIG_PATH = os.getenv("MCP_CONFIG_PATH", "./mcp_servers.json")

def load_mcp_server_configs() -> Dict[str, Dict[str, Any]]:
    """Loads MCP server configurations from the specified JSON file."""
    configs = {}
    try:
        with open(MCP_CONFIG_PATH, 'r') as f:
            raw_configs = json.load(f)
            # The expected format in the file is like: {"mcpServers": {"server_name": {...}}}
            configs = raw_configs.get("mcpServers", {}) 
            logger.info(f"Loaded {len(configs)} MCP server configurations from {MCP_CONFIG_PATH}")
    except FileNotFoundError:
        logger.warning(f"MCP config file not found at {MCP_CONFIG_PATH}. No MCP servers will be loaded.")
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding MCP config file {MCP_CONFIG_PATH}: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred loading MCP configs: {e}", exc_info=True)
    return configs

MCP_SERVER_CONFIGS = load_mcp_server_configs()

# --- Agent Configuration ---
AGENT_WORKSPACE_DIR = os.getenv("AGENT_WORKSPACE_DIR", "./agent_workspace")
AGENT_ALLOWED_MODULES = os.getenv("AGENT_ALLOWED_MODULES", "math,json,time,re").split(',') # Example
MAX_MESSAGES_IN_CONTEXT = int(os.getenv("MAX_MESSAGES_IN_CONTEXT", "20"))
RECENT_MESSAGES_TO_KEEP = int(os.getenv("RECENT_MESSAGES_TO_KEEP", "10"))

# --- Persistence --- 
CHECKPOINT_DB_PATH = os.getenv("CHECKPOINT_DB_PATH", "./agent_checkpoints.db")

# --- Logging --- 
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

def configure_logging():
    logging.basicConfig(
        level=LOG_LEVEL,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    # Suppress overly verbose logs from libraries if needed
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# Validate essential configurations
if not OPENAI_API_KEY and not ANTHROPIC_API_KEY:
    logger.warning("Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY found in environment variables. LLM calls may fail.")

# Example: Load Brave API key if search server is configured
if "search" in MCP_SERVER_CONFIGS:
     BRAVE_API_KEY = os.getenv("BRAVE_API_KEY")
     if not BRAVE_API_KEY:
          logger.warning("Brave Search MCP server is configured, but BRAVE_API_KEY is not set.")
     elif MCP_SERVER_CONFIGS["search"].get("env") is None:
          MCP_SERVER_CONFIGS["search"]["env"] = {}
     # Ensure the key is passed to the server config if loaded from JSON
     if MCP_SERVER_CONFIGS["search"].get("env") is not None:
          MCP_SERVER_CONFIGS["search"]["env"]["BRAVE_API_KEY"] = BRAVE_API_KEY 