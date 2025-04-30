from typing import TypedDict, List, Dict, Literal, Optional, Any
from typing_extensions import NotRequired
from langchain_core.messages import BaseMessage


# Using Dict for Message for flexibility, could be BaseMessage or specific types
# Similarly, using Dict for MCPToolInfo/MCPResourceInfo placeholders

class MCPToolInfo(TypedDict):
    # Placeholder for actual MCP tool info structure
    server: str
    tool: Dict[str, Any]

class MCPResourceInfo(TypedDict):
    # Placeholder for actual MCP resource info structure
    server: str
    resource: Dict[str, Any]


class Step(TypedDict):
    number: int
    description: str
    status: Literal["pending", "in_progress", "completed", "failed"]

class Plan(TypedDict):
    steps: List[Step]
    currentStepIndex: int

class WorkingMemory(TypedDict):
    fileReferences: List[str] # Paths or URIs to files agent is working with
    variables: Dict[str, Any] # In-memory variables/data agent is tracking

class ExecutionResult(TypedDict):
    stdout: str
    stderr: str
    returnValue: Any

class AgentState(TypedDict):
    taskDescription: str
    plan: Plan
    messages: List[BaseMessage] # Changed Message to BaseMessage
    workingMemory: WorkingMemory
    activeTools: Dict[str, MCPToolInfo]
    activeResources: Dict[str, MCPResourceInfo]
    nextAction: NotRequired[Dict[str, Any]] # Action determined by analyzer
    lastExecutionResult: NotRequired[ExecutionResult]
    status: Literal["idle", "planning", "executing", "waiting_for_human", "error"]
    error: NotRequired[str] 