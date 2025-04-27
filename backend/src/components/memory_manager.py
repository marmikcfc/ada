from typing import Dict, List
import logging

from src.state.schema import AgentState
from src.config import settings # Import settings for constants
from langchain_core.messages import SystemMessage, BaseMessage

# Placeholder for actual summarization logic (e.g., using an LLM)
def summarize_messages(messages: List[BaseMessage]) -> str:
     logger.warning("Summarization logic not implemented. Returning placeholder summary.")
     # In real implementation, call an LLM to summarize `messages`
     # Ensure the summary is concise and captures key information
     return f"Summary of {len(messages)} previous messages: [Placeholder Summary]"

logger = logging.getLogger(__name__)

def manage_memory(state: AgentState) -> Dict:
    """Placeholder for memory management logic (e.g., summarization)."""
    logger.debug("Executing Memory Management Node (Placeholder)")
    # Add logic here if needed, e.g., summarizing old messages
    # For now, it just passes the state through by returning an empty dict
    return {}

def manage_memory(state: AgentState) -> Dict:
    """Manages the agent's message history to prevent context overflow."""
    logger.debug("Executing Memory Management Node")
    messages = state.get("messages", [])
    
    max_messages = settings.MAX_MESSAGES_IN_CONTEXT
    keep_messages = settings.RECENT_MESSAGES_TO_KEEP
    
    if len(messages) > max_messages:
        logger.info(f"Message count ({len(messages)}) exceeds limit ({max_messages}). Summarizing.")
        
        # Determine messages to summarize
        # Keep the first message (usually system prompt/initial task) and the last `keep_messages`
        if keep_messages >= len(messages) -1 : # Avoid summarizing if keep count is too high
             logger.warning("RECENT_MESSAGES_TO_KEEP is too high, cannot summarize effectively. Skipping.")
             return {}
             
        messages_to_summarize = messages[1:-keep_messages] # Exclude first and last `keep` messages
        
        if not messages_to_summarize:
             logger.warning("No messages identified for summarization despite exceeding limit. Skipping.")
             return {}

        try:
            summary = summarize_messages(messages_to_summarize)
            
            # Construct the new message list
            new_messages = [messages[0]] # Keep the first message
            new_messages.append(SystemMessage(content=f"Summary of intermediate conversation: {summary}"))
            new_messages.extend(messages[-keep_messages:]) # Keep the most recent messages
            
            logger.info(f"Summarized {len(messages_to_summarize)} messages. New message count: {len(new_messages)}.")
            return {"messages": new_messages}
        
        except Exception as e:
            logger.error(f"Error during message summarization: {e}", exc_info=True)
            # Failed to summarize, return original state to avoid data loss
            return {}
    else:
        # No action needed if within limits
        logger.debug("Message count within limits. No summarization needed.")
        return {} 