from typing import Dict, List
import logging

from src.state.schema import AgentState
# Remove MCPClientManager import
# from src.mcp.client_manager import MCPClientManager
# Import the actual client type
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

# Update signature to accept MultiServerMCPClient
def initialize_node(state: AgentState, mcp_client: MultiServerMCPClient) -> Dict:
     """Initializes the agent state at the beginning of a run."""
     logger.info("Executing Initializer Node")
     initial_task = state.get("taskDescription", "No task description provided.")
     logger.info(f"Initializing state for task: {initial_task}")
     
     # Load tools directly from the MultiServerMCPClient
     # get_tools() returns a list of BaseTool objects
     active_tools = mcp_client.get_tools()
     # Resources are typically not exposed as top-level discoverable items by MultiServerMCPClient
     # If specific resources need tracking, it would likely be through tool interactions.
     active_resources = {} # Keep as placeholder unless specific need arises
     logger.info(f"Loaded {len(active_tools)} tools from MCP client.")

     # Prepare initial message list if not already populated
     initial_messages = state.get("messages", [])
     if not initial_messages and initial_task != "No task description provided.":
          initial_messages = [HumanMessage(content=initial_task)]
     elif not initial_messages:
          initial_messages = [] # Start with empty if no task description

     # Initialize state fields, preserving existing ones if resuming
     return {
          "taskDescription": initial_task,
          "plan": state.get("plan", {"steps": [], "currentStepIndex": -1}), # Default empty plan
          "messages": initial_messages,
          "workingMemory": state.get("workingMemory", {"fileReferences": [], "variables": {}}), # Default empty memory
          "activeTools": active_tools, # Store the dictionary of tools
          "activeResources": active_resources,
          "status": "planning", # Move to planning after initialization
          "error": None # Ensure error state is clear
     } 