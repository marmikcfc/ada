import logging
from typing import Dict, Any, Literal
from functools import partial

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.base import BaseCheckpointSaver
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.messages import HumanMessage, SystemMessage

# State definition
from src.state.schema import AgentState

# Node functions
# Remove planner_node import
# from src.components.planner import planner_node
from src.components.analyzer import analyzer_node
from src.components.executor import executor_node
from src.components.evaluator import progress_evaluator_node # Renamed from evaluator_node for clarity
# Uncomment imports for moved nodes
from src.components.human_intervention import human_intervention_node
from src.components.error_handler import error_handler_node
from src.components.initializer import initialize_node
from src.components.memory_manager import manage_memory

# Utilities
from src.tools.code_executor import RestrictedExecutor
# Import the actual MCP client type and the planner tool
from langchain_mcp_adapters.client import MultiServerMCPClient
from src.tools.planner_tool import PlannerTool # Import the new planner tool

logger = logging.getLogger(__name__)

# Conditional edge logic
def should_continue(state: AgentState) -> Literal["analyzer", "error_handler", "human_intervention", "__end__"]:
    """Determines the next node based on the agent's status.
    Now routes back to analyzer if execution is needed.
    Handles 'planned' status after planner tool execution.
    """
    status = state.get("status", "error") # Default to error if status missing
    logger.debug(f"Routing based on status: {status}")

    # If a plan was just generated, go back to analyzer to decide the first step
    if status == "planned":
        logger.info("Plan generated, routing to analyzer.")
        return "analyzer"
    # If executing normally (or after evaluation/memory), go back to analyzer
    elif status in ["executing", "evaluated", "memory_managed"]:
        logger.debug(f"Status is {status}, routing to analyzer.")
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
        # Fallback: attempt analysis or error handling
        return "error_handler" # Route to error handler for unknown states


# --- Node Execution Logic ---
# (Keep existing node functions from src.components.*)
# Make sure analyzer_node's prompt is updated to consider calling "create_detailed_plan"
# Make sure executor_node can handle invoking both MCP tools and the PlannerTool

def create_agent_graph(
    llm: BaseChatModel,
    eval_llm: BaseChatModel, # Potentially different/cheaper LLM for evaluation
    planner_tool: PlannerTool, # Pass the instantiated planner tool
    code_executor: RestrictedExecutor,
    mcp_client: MultiServerMCPClient,
    checkpointer: BaseCheckpointSaver = None
) -> StateGraph:
    """Creates the LangGraph StateGraph for the agent with Planner as a Tool."""
    logger.info("Creating agent graph (Planner as Tool)...")
    builder = StateGraph(AgentState)

    # --- Bind external dependencies to node functions ---
    # Planner node is removed. Planning happens via planner_tool in executor.
    bound_analyzer_node = partial(analyzer_node, llm=llm, planner_tool_name=planner_tool.name) # Pass tool name for prompt guidance
    # Executor now needs access to both MCP client and the planner tool instance
    bound_executor_node = partial(
        executor_node,
        code_executor=code_executor,
        mcp_client=mcp_client,
        local_tools=[planner_tool] # Pass planner tool instance here
    )
    bound_evaluator_node = partial(progress_evaluator_node, llm=eval_llm) # Use eval_llm here
    # Initializer needs to load MCP tools, but not planner tool (it's passed directly)
    bound_initializer_node = partial(initialize_node, mcp_client=mcp_client)
    # bind human_intervention_node and error_handler_node if they need dependencies
    bound_human_node = human_intervention_node
    bound_error_node = error_handler_node
    bound_memory_node = manage_memory # If it needs dependencies, bind them

    # --- Add Nodes ---
    logger.debug("Adding nodes to the graph...")
    builder.add_node("initialize", bound_initializer_node)
    # Remove planner node: builder.add_node("planner", bound_planner_node)
    builder.add_node("analyzer", bound_analyzer_node)
    builder.add_node("executor", bound_executor_node)
    builder.add_node("progress_evaluator", bound_evaluator_node)
    builder.add_node("manage_memory", bound_memory_node) # Memory management node
    builder.add_node("error_handler", bound_error_node)
    builder.add_node("human_intervention", bound_human_node)

    # --- Define Edges ---
    logger.debug("Defining graph edges...")
    # Start -> Initialize -> Analyze -> Execute -> Evaluate -> Manage Memory -> Route
    builder.add_edge(START, "initialize")
    # Initialize now goes directly to Analyzer
    builder.add_edge("initialize", "analyzer")
    # Planner edge removed: builder.add_edge("planner", "analyzer")
    builder.add_edge("analyzer", "executor")
    builder.add_edge("executor", "progress_evaluator")
    builder.add_edge("progress_evaluator", "manage_memory") # Evaluate, then manage memory

    # Conditional Edges based on status after memory management
    # Routes back to analyzer for next step decision
    builder.add_conditional_edges(
        "manage_memory", # Route AFTER memory management
        should_continue,
        {
            "analyzer": "analyzer", # Loop back to analyzer for next decision
            "error_handler": "error_handler",
            "human_intervention": "human_intervention",
            END: END  # Task complete
        }
    )

    # Error Handling and Human Intervention Loops still route back to analyzer
    builder.add_edge("error_handler", "analyzer") # Error handler attempts recovery via analyzer
    builder.add_edge("human_intervention", "analyzer") # Human input leads back to analysis

    # --- Compile the Graph ---
    logger.info("Compiling agent graph...")
    graph = builder.compile(checkpointer=checkpointer)
    logger.info("Agent graph compiled successfully (Planner as Tool).")
    return graph


# --- Placeholder/Helper Node Implementations ---
# Remove or comment out any remaining placeholder functions if they are now
# properly implemented in their respective component files.
# Make sure the actual component files (analyzer, executor, etc.) are updated
# to reflect the new logic (analyzer decides to plan, executor runs planner tool,
# analyzer/executor use plan from state).

# Example adjustment needed in analyzer_node (conceptual):
# - Prompt should list "create_detailed_plan" as an available action/tool.
# - Prompt should guide the LLM on *when* to choose planning vs direct action.
# - Prompt should mention that if a plan *already exists* in the state, it should analyze the *next step* of the plan.

# Example adjustment needed in executor_node (conceptual):
# - Check if the action is for the planner_tool.name.
# - If yes, invoke planner_tool._arun(...) and store the returned Plan in state['plan']. Update status to 'planned'.
# - If no, proceed with MCP tool execution or code execution as before.
# - If a plan exists in the state, the executor might need to only execute the tool corresponding to the current plan step.

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