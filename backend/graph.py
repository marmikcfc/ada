import os
from typing import List
from functools import partial

from langgraph.graph import StateGraph, END
from state.agent_state import AgentState # Check import path
from langchain_core.messages import BaseMessage
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI

# Import agent factory and node function
from agent.orchestrator import create_orchestrator_agent, orchestrator_node

# --- Agent and Graph Creation --- 

def create_graph(mcp_tools: List[BaseTool]):
    """Creates and compiles the LangGraph StateGraph."""
    
    # Initialize the LLM for the agent
    llm = ChatOpenAI(model=os.environ.get("AGENT_MODEL", "gpt-4o-mini"))
    
    # Create the orchestrator agent instance using the factory
    agent_executor = create_orchestrator_agent(llm, mcp_tools)
    
    # Create a partial function for the node, binding the agent_executor
    # This avoids passing the executor around explicitly in the state
    bound_orchestrator_node = partial(orchestrator_node, agent_executor=agent_executor)
    
    # Create the graph
    workflow = StateGraph(AgentState)

    # Add the single orchestrator node
    # This node will internally run the ReAct loop
    workflow.add_node("orchestrator", bound_orchestrator_node)

    # Set the entry point
    workflow.set_entry_point("orchestrator")

    # The ReAct agent decides when to end, so we connect the node to END
    # LangGraph's `create_react_agent` handles the looping and tool calls internally.
    # When the agent finishes (doesn't call a tool and returns the final response),
    # the graph naturally proceeds to the end from this node.
    workflow.add_edge("orchestrator", END)

    # Compile the graph (checkpointer will be added in main.py)
    app_graph = workflow.compile()
    print("Graph compiled successfully.")
    return app_graph

# --- Initialize the graph --- 
# This part needs the MCP tools, which are initialized in main.py's lifespan.
# We cannot directly call create_graph here at import time.
# Instead, main.py will call this function after the MCP client is ready.

# Placeholder for the compiled graph - will be replaced in main.py
app_graph = None 

# Example of how main.py would initialize it:
# def initialize_graph(mcp_client):
#     global app_graph
#     if mcp_client:
#         mcp_tools = mcp_client.get_tools()
#         app_graph = create_graph(mcp_tools)
#     else:
#         # Handle case where MCP client failed to initialize
#         print("MCP client not available, cannot initialize graph.")
#         app_graph = None # Or some default graph
