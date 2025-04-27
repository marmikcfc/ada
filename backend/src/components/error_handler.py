from typing import Dict
import logging

from src.state.schema import AgentState
from langchain_core.messages import SystemMessage

logger = logging.getLogger(__name__)

def error_handler_node(state: AgentState) -> Dict:
     """Handles errors encountered during graph execution."""
     error = state.get("error", "Unknown error")
     logger.error(f"Executing Error Handler Node. Error: {error}")
     
     # Simple strategy: Log error and try to continue by looping back to analyzer
     # More sophisticated strategies could involve asking human, trying fallback, etc.
     
     # Avoid adding duplicate error messages if looping
     messages = state.get("messages", [])
     error_message_content = f"Encountered error: {error}. Attempting to recover by re-analyzing the state."
     last_message_content = messages[-1].content if messages else ""
     
     if last_message_content != error_message_content:
          messages = messages + [SystemMessage(content=error_message_content)]
     
     return {
         "status": "executing", # Attempt to continue by going back to analyzer (via should_continue logic)
         "error": None, # Clear the error for the next attempt
         "messages": messages
     } 