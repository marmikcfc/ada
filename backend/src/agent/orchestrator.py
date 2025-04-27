import logging
from typing import Dict, Any, Literal
from functools import partial

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.base import BaseCheckpointSaver
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

# State definition
from src.state.schema import AgentState

# Node functions
from src.components.planner import planner_node
from src.components.analyzer import analyzer_node
from src.components.executor import executor_node
from src.components.evaluator import progress_evaluator_node
# Uncomment imports for moved nodes
from src.components.human_intervention import human_intervention_node
from src.components.error_handler import error_handler_node 
from src.components.initializer import initialize_node
from src.components.memory_manager import manage_memory

# Utilities
from src.tools.code_executor import RestrictedExecutor
# Remove MCPClientManager import
# from src.mcp.client_manager import MCPClientManager
# Import the actual client type
from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# Conditional edge logic
def should_continue(state: AgentState) -> Literal["analyzer", "error_handler", "human_intervention", "__end__"]:
    """Determines the next node based on the agent's status."""
    status = state.get("status", "error") # Default to error if status missing
    logger.debug(f"Routing based on status: {status}")
    if status == "executing":
        return "analyzer"
    elif status == "error":
        return "error_handler"
    elif status == "waiting_for_human":
        return "human_intervention"
    elif status == "idle": # Task considered complete
        logger.info("Task execution complete (status is idle).")
        return END
    else:
        logger.error(f"Unknown status encountered in should_continue: {status}")
        return "error_handler" # Route to error handler for unknown states

def create_agent_graph(
    llm: BaseChatModel, 
    eval_llm: BaseChatModel, # Potentially different/cheaper LLM for evaluation
    code_executor: RestrictedExecutor, 
    mcp_client: MultiServerMCPClient, # Changed from mcp_manager
    checkpointer: BaseCheckpointSaver = None
) -> StateGraph:
    """Creates the LangGraph StateGraph for the Manus-like agent."""
    logger.info("Creating agent graph...")
    builder = StateGraph(AgentState)

    # --- Bind external dependencies to node functions ---    
    # Partial function application to pass instances to nodes
    bound_planner_node = partial(planner_node, llm=llm)
    bound_analyzer_node = partial(analyzer_node, llm=llm)
    bound_executor_node = partial(executor_node, code_executor=code_executor, mcp_client=mcp_client) # Bind mcp_client
    bound_evaluator_node = partial(progress_evaluator_node, llm=eval_llm) # Use eval_llm here
    bound_initializer_node = partial(initialize_node, mcp_client=mcp_client) # Bind mcp_client
    # bind human_intervention_node and error_handler_node if they need dependencies
    bound_human_node = human_intervention_node
    bound_error_node = error_handler_node
    bound_memory_node = manage_memory # If it needs dependencies, bind them

    # --- Add Nodes ---    
    logger.debug("Adding nodes to the graph...")
    builder.add_node("initialize", bound_initializer_node)
    builder.add_node("planner", bound_planner_node)
    builder.add_node("analyzer", bound_analyzer_node)
    builder.add_node("executor", bound_executor_node)
    builder.add_node("progress_evaluator", bound_evaluator_node)
    builder.add_node("manage_memory", bound_memory_node) # Memory management node
    builder.add_node("error_handler", bound_error_node)
    builder.add_node("human_intervention", bound_human_node)

    # --- Define Edges ---    
    logger.debug("Defining graph edges...")
    # Start -> Initialize -> Plan -> Analyze -> Execute -> Evaluate -> Manage Memory -> Route
    builder.add_edge(START, "initialize")
    builder.add_edge("initialize", "planner")
    builder.add_edge("planner", "analyzer")
    builder.add_edge("analyzer", "executor")
    builder.add_edge("executor", "progress_evaluator")
    builder.add_edge("progress_evaluator", "manage_memory") # Evaluate, then manage memory

    # Conditional Edges based on status after memory management
    builder.add_conditional_edges(
        "manage_memory", # Route AFTER memory management
        should_continue,
        {
            "analyzer": "analyzer", # Loop back to analyzer if still executing
            "error_handler": "error_handler",
            "human_intervention": "human_intervention",
            END: END  # Task complete
        }
    )

    # Error Handling and Human Intervention Loops
    # Error handler might try to recover and go back to analyzer, or halt
    builder.add_edge("error_handler", "analyzer") # Simple loop back for now
    # Human intervention provides input, then back to analyzer
    builder.add_edge("human_intervention", "analyzer")

    # --- Compile the Graph ---    
    logger.info("Compiling agent graph...")
    graph = builder.compile(checkpointer=checkpointer)
    logger.info("Agent graph compiled successfully.")
    return graph

# --- Placeholder/Helper Node Implementations (to be moved) ---

# These should ideally be in their own files in src/components

# def initialize_node(state: AgentState, mcp_client: MultiServerMCPClient) -> Dict:
#      """Initializes the agent state, loads tools/resources."""
#      logger.info("Executing Initializer Node")
#      # In a real app, might receive initial taskDescription here
#      initial_task = state.get("taskDescription", "No task description provided.")
#      logger.info(f"Initializing state for task: {initial_task}")
#      
#      # Load tools and resources from MCP Manager
#      active_tools = mcp_client.get_all_tools()
#      active_resources = mcp_client.get_all_resources()
#      logger.info(f"Loaded {len(active_tools)} tools and {len(active_resources)} resources from MCP.")
# 
#      # Initialize other state fields if they don't exist
#      return {
#           "taskDescription": initial_task,
#           "plan": state.get("plan", {"steps": [], "currentStepIndex": -1}), # Ensure plan exists
#           "messages": state.get("messages", [HumanMessage(content=initial_task)]) if initial_task else [],
#           "workingMemory": state.get("workingMemory", {"fileReferences": [], "variables": {}}),
#           "activeTools": active_tools,
#           "activeResources": active_resources,
#           "status": "planning", # Start planning after initialization
#           "error": None # Clear any previous error
#      }
# 
# # Placeholder - move to src/components/human_intervention.py
# def human_intervention_node(state: AgentState) -> Dict:
#      logger.warning("HUMAN INTERVENTION REQUIRED")
#      print("-" * 20)
#      print("Current Task:", state.get("taskDescription"))
#      plan = state.get("plan", {})
#      if plan.get("steps"):
#           current_idx = plan.get("currentStepIndex", 0)
#           if 0 <= current_idx < len(plan["steps"]):
#                print("Current Step:", plan["steps"][current_idx].get("description"))
#      print("Last Result:", state.get("lastExecutionResult"))
#      print("Messages:", state.get("messages", [])[-5:]) # Last 5 messages
#      print("Please provide input (approve/modify [new instructions]/abort):")
#      
#      # Replace with actual UI/input mechanism
#      human_response = input("> ").strip().lower()
#      
#      if human_response == "approve":
#           logger.info("Human approved continuation.")
#           return {"status": "executing", "messages": state["messages"] + [HumanMessage(content="Human approved.")]}
#      elif human_response.startswith("modify "):
#           modification = human_response.split(" ", 1)[1]
#           logger.info(f"Human provided modification: {modification}")
#           return {"status": "executing", "messages": state["messages"] + [HumanMessage(content=f"Human modification: {modification}")]}
#      else: # Default to abort
#           logger.info("Human aborted task.")
#           return {"status": "idle", "error": "Task aborted by human."}
# 
# # Placeholder - move to src/components/error_handler.py
# def error_handler_node(state: AgentState) -> Dict:
#      error = state.get("error", "Unknown error")
#      logger.error(f"Executing Error Handler Node. Error: {error}")
#      # Simple strategy: Log error and try to continue by looping back to analyzer
#      # More sophisticated strategies could involve asking human, trying fallback, etc.
#      return {
#          "status": "executing", # Attempt to continue
#          "error": None, # Clear the error for the next attempt
#          "messages": state["messages"] + [SystemMessage(content=f"Encountered error: {error}. Attempting to recover.")]
#      }
# 
# # Placeholder - move to src/components/memory_manager.py
# def manage_memory(state: AgentState) -> Dict:
#     """Placeholder for memory management logic (e.g., summarization)."""
#     logger.debug("Executing Memory Management Node (Placeholder)")
#     # Add logic here if needed, e.g., summarizing old messages
#     # For now, it just passes the state through
#     return {} 