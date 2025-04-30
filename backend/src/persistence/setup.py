import logging
from langgraph.checkpoint.sqlite import SqliteSaver

logger = logging.getLogger(__name__)

DB_PATH = "./agent_checkpoints.db" # Or load from config

def get_checkpointer() -> SqliteSaver:
    """Initializes and returns the SqliteSaver checkpointer."""
    try:
        logger.info(f"Initializing SQLite checkpointer at: {DB_PATH}")
        checkpointer = SqliteSaver.from_conn_string(DB_PATH)
        logger.info("SQLite checkpointer initialized successfully.")
        return checkpointer
    except Exception as e:
        logger.error(f"Failed to initialize SQLite checkpointer: {e}", exc_info=True)
        raise 