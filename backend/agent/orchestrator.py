import os
from typing import List

from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from state.agent_state import AgentState
from langchain_core.messages import HumanMessage

# Import the planner tool
from .planner import planner_tool

# Load the system prompt from the file
prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "orchestrator_react_prompt.txt")
try:
    with open(prompt_path, "r") as f:
        REACT_SYSTEM_PROMPT = f.read()
except FileNotFoundError:
    print(f"ERROR: Prompt file not found at {prompt_path}")
    # Provide a default fallback prompt
    REACT_SYSTEM_PROMPT = "You are a helpful assistant. Use tools if necessary."

def create_orchestrator_agent(llm: ChatOpenAI, mcp_tools: List[BaseTool]):
    """Creates a ReAct agent with the planner tool and any provided MCP tools."""
    print("Creating orchestrator agent...")
    all_tools = [planner_tool] + mcp_tools
    print(f"Orchestrator agent created with tools: {[t.name for t in all_tools]}")
    # We don't add the checkpointer here; it's added when compiling the graph
    agent_executor = create_react_agent(llm, all_tools, prompt=REACT_SYSTEM_PROMPT)
    return agent_executor

async def orchestrator_node(state: AgentState, agent_executor):
    """Invokes the pre-compiled ReAct agent executor with the current state."""
    print("--- Running Orchestrator Node (ReAct Agent) ---")
    # `agent_executor.ainvoke` will handle the ReAct loop (LLM calls, tool calls)
    # It returns the final state dictionary, and the result is implicitly added
    # to the "messages" list in the state by LangGraph's standard message handling.
    updated_state = await agent_executor.ainvoke(state)
    # The final response AI message is usually the last one added by create_react_agent
    # We just need to return the state dictionary as expected by StateGraph nodes
    return updated_state

# Remove old agent logic and ToolNode
# agent_runnable = ...
# tool_node = ...
