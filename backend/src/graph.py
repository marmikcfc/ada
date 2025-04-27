import logging
import functools
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from src.state.schema import AgentState
from src.components.planner import planner_node
from src.components.analyzer import analyzer_node
from src.components.executor import executor_node
from src.components.evaluator import evaluator_node

# Import LLM and MCP Client types for binding
from langchain_core.language_models.chat_models import BaseChatModel
# from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# --- Graph Definition ---

def should_continue(state: AgentState) -> str:
    """Determines the next node based on the current agent status."""
    status = state.get("status", "")
    logger.debug(f"Routing based on status: {status}")
    if status == "analyzing":
        return "analyzer"
    elif status == "executing":
        # Safety check: ensure there's an action before going to executor
        if state.get("current_action") and state["current_action"].get("action") != "error":
            return "executor"
        else:
            logger.warning("No valid action found, routing back to analyzer despite 'executing' status.")
            # Force back to analysis if action is missing/invalid
            state["status"] = "analyzing"
            return "analyzer"
    elif status == "evaluating":
        return "evaluator"
    elif status == "idle" or status == "error":
        logger.info(f"Ending graph execution with status: {status}")
        return END
    else:
        # Default or unknown status, maybe go back to analyzer?
        logger.warning(f"Unknown status '{status}', routing to analyzer as fallback.")
        state["status"] = "analyzing"
        return "analyzer"

def create_agent_graph(llm: BaseChatModel, checkpointer: AsyncSqliteSaver):
    """Creates and compiles the LangGraph agent.

    Args:
        llm (BaseChatModel): The language model instance.
        checkpointer (AsyncSqliteSaver): The checkpointer instance.

    Returns:
        CompiledGraph: The compiled LangGraph agent.
    """
    workflow = StateGraph(AgentState)

    # Bind LLM to nodes that require it
    bound_planner = functools.partial(planner_node, llm=llm)
    bound_analyzer = functools.partial(analyzer_node, llm=llm)
    # Executor might need mcp_client later, evaluator might need llm
    # bound_executor = functools.partial(executor_node, mcp_client=mcp_client)
    bound_evaluator = evaluator_node # No LLM needed for basic version

    # Add nodes
    workflow.add_node("planner", bound_planner)
    workflow.add_node("analyzer", bound_analyzer)
    workflow.add_node("executor", executor_node) # Pass executor-specific args if needed
    workflow.add_node("evaluator", bound_evaluator)

    # Define edges
    workflow.set_entry_point("planner")

    workflow.add_edge("planner", "analyzer")
    workflow.add_edge("analyzer", "executor")
    workflow.add_edge("executor", "evaluator")

    # Conditional edge after evaluation
    workflow.add_conditional_edges(
        "evaluator",
        should_continue,
        {
            "analyzer": "analyzer",
            END: END
        }
    )
    
    # Add a conditional edge from analyzer to handle cases where execution is skipped (e.g., error in action parsing)
    # This might be redundant if should_continue handles it robustly, but adds safety
    workflow.add_conditional_edges(
        "analyzer",
        lambda state: "executor" if state.get("status") == "executing" and state.get("current_action") else "analyzer",
        {
            "executor": "executor",
            "analyzer": "analyzer"
        }
    )

    # Compile the graph
    agent_graph = workflow.compile(checkpointer=checkpointer)
    logger.info("Agent graph compiled successfully.")
    return agent_graph 