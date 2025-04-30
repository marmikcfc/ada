from typing import List, TypedDict, Literal
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """
    Represents the state of our graph.

    Attributes:
        messages: The list of messages exchanged between the user and the agent.
        # Add other state variables as needed.
    """
    messages: List[BaseMessage]
    # next_action: Literal["PLAN", "RESPOND"] | None # No longer needed
    # plan: str | None # Plan will be added directly to messages by orchestrator
    # Example: You might add a 'plan' field if the Planner Agent generates a plan
    # plan: str | None = None 