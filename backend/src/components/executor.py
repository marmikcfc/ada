from typing import Dict, Any
import logging

# Assuming AgentState and ExecutionResult are defined in src.state.schema
from src.state.schema import AgentState, ExecutionResult
# Assuming RestrictedExecutor is defined in src.tools.code_executor
from src.tools.code_executor import RestrictedExecutor
# Import the actual client type
from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# This node needs access to the code executor and MCP client instances
def executor_node(state: AgentState, code_executor: RestrictedExecutor, mcp_client: MultiServerMCPClient) -> Dict:
    """Executes the action decided by the analyzer (code or tool).

    Args:
        state (AgentState): The current state of the agent.
        code_executor (RestrictedExecutor): The code executor instance.
        mcp_client (MultiServerMCPClient): The MCP client instance for tool calls.

    Returns:
        Dict: A dictionary containing the execution result.
    """
    logger.info("Executing Executor Node")
    action = state.get("current_action")

    if not action or not isinstance(action, dict):
        logger.error("Executor error: No valid action found in state.")
        return {"lastExecutionResult": {"error": "No action to execute.", "status": "error"}, "status": "error"}

    action_type = action.get("action")
    action_args = action.get("args", {})

    logger.info(f"Attempting to execute action: {action_type} with args: {action_args}")

    execution_result: ExecutionResult = {
        "stdout": "",
        "stderr": "",
        "returnValue": None
    }
    next_status = "executing" # Default status after execution
    error_message = None

    try:
        if action_type == "code":
            code_to_execute = action.get("code")
            if not code_to_execute:
                 raise ValueError("Action type is 'code' but no 'code' key found.")
            logger.debug(f"Executing code...")
            result = code_executor.execute(code_to_execute)
            execution_result = result # Use the dict directly
            if result["stderr"]:
                 logger.warning(f"Code execution resulted in STDERR: {result['stderr']}")
                 # Decide if stderr constitutes an error state
                 # error_message = f"Code execution error: {result['stderr']}"
                 # next_status = "error"

        elif action_type == "tool":
            tool_name = action.get("toolName")
            tool_args = action.get("toolArgs", {}) # Default to empty dict if no args
            if not tool_name:
                 raise ValueError("Action type is 'tool' but no 'toolName' key found.")
            
            logger.debug(f"Calling MCP tool: {tool_name} with args: {tool_args}")
            # Call the MCP tool via the MultiServerMCPClient directly
            # The client handles routing to the correct server
            # Note: Ensure the client's call_tool method is async if needed, might require await
            # Assuming sync call for now based on adapter structure
            mcp_result = mcp_client.call_tool(tool_name, **tool_args) # Pass args as kwargs
            
            # Adapt MCP result to ExecutionResult format
            # This might need adjustment based on actual MCP client return types
            execution_result["stdout"] = str(mcp_result) # Put the result in stdout for simplicity
            execution_result["returnValue"] = mcp_result
            logger.info(f"MCP tool '{tool_name}' executed.")

        else:
            error_message = f"Unknown or invalid action type: '{action_type}'"
            next_status = "error"

    except Exception as e:
        logger.error(f"Error during action execution ('{action_type}'): {e}", exc_info=True)
        error_message = f"Execution failed: {e}"
        execution_result["stderr"] = error_message
        next_status = "error"

    # Always update lastExecutionResult, even if empty or errored
    update = {
        "lastExecutionResult": execution_result,
        "status": next_status
    }
    if error_message:
        update["error"] = error_message

    logger.info(f"Executor node finished with status: {next_status}")
    return update 