from typing import Dict, Any, List, Optional
import logging
import json
import re

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.language_models.chat_models import BaseChatModel

# Assuming AgentState is defined in src.state.schema
from src.state.schema import AgentState, ExecutionResult, MCPToolInfo, Plan
# Import the prompt loader
from src.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)


# Placeholder for parsing the LLM action response
def parse_action_response(response_content: str) -> Dict[str, Any]:
    """Parses the LLM JSON response and translates it to the expected executor format."""
    logger.debug(f"Parsing LLM action response: {response_content[:100]}...")
    try:
        # Handle potential markdown code block fences
        cleaned_response = re.sub(r"^```(?:json)?\n?|\n?```$", "", response_content.strip(), flags=re.MULTILINE)
        llm_output = json.loads(cleaned_response)
        
        action_type = llm_output.get("type")
        
        # Translate the LLM output format to the executor's expected format
        if action_type == "code":
            code = llm_output.get("code")
            if isinstance(code, str):
                logger.info(f"Parsed action: code")
                return {"action": "code", "args": {"code": code}}
            else:
                logger.warning(f"Parsed JSON for code action missing 'code' string: {llm_output}")
                return {"action": "error", "args": {"message": "Parsed code action JSON invalid (missing/wrong type for 'code')", "raw_response": cleaned_response}}
        
        elif action_type == "tool":
            tool_name = llm_output.get("toolName")
            tool_args = llm_output.get("toolArgs", {})
            if isinstance(tool_name, str) and isinstance(tool_args, dict):
                logger.info(f"Parsed action: tool - {tool_name}")
                return {"action": "tool", "args": {"tool_name": tool_name, "tool_args": tool_args}}
            else:
                 logger.warning(f"Parsed JSON for tool action missing/invalid 'toolName' or 'toolArgs': {llm_output}")
                 return {"action": "error", "args": {"message": "Parsed tool action JSON invalid (missing/wrong type for 'toolName'/'toolArgs')", "raw_response": cleaned_response}}
                 
        else:
             logger.warning(f"Parsed JSON has unknown or missing 'type': {llm_output}")
             return {"action": "error", "args": {"message": "Parsed JSON has unknown or missing 'type'", "raw_response": cleaned_response}}

    except json.JSONDecodeError as e:
        logger.error(f"JSONDecodeError parsing action response: {e}. Response was: {response_content}")
        # Fallback: Provide error action
        return {"action": "error", "args": {"message": f"Failed to decode LLM JSON response: {e}", "raw_response": response_content}}
    except Exception as e:
        logger.error(f"Unexpected error parsing action response: {e}", exc_info=True)
        return {"action": "error", "args": {"message": f"Unexpected error parsing action: {e}", "raw_response": response_content}}

def format_execution_result(exec_result: Optional[ExecutionResult]) -> Dict[str, str]:
     if not exec_result:
          return {"last_stdout": "N/A", "last_stderr": "N/A", "last_return": "N/A"}
     # Limit the length of outputs included in the prompt
     stdout = exec_result.get("stdout", "")
     stderr = exec_result.get("stderr", "")
     max_len = 500 # Max characters for stdout/stderr in prompt
     return {
          "last_stdout": stdout[:max_len] + ("..." if len(stdout) > max_len else ""),
          "last_stderr": stderr[:max_len] + ("..." if len(stderr) > max_len else ""),
          "last_return": str(exec_result.get("returnValue", "N/A"))[:200] # Limit return value length too
     }

def format_available_tools(tools) -> str:
     """Formats available tools for the prompt, handling both list and dictionary inputs."""
     if not tools:
          return "No tools available."
     
     formatted = []
     
     # If tools is a list (from get_tools())
     if isinstance(tools, list):
          for tool in tools:
               name = getattr(tool, "name", "Unknown")
               description = getattr(tool, "description", "No description")
               # Try to extract parameters from the tool
               params = []
               # Different tools might store schema differently
               if hasattr(tool, "args_schema"):
                    # For pydantic schema tools
                    if tool.args_schema and hasattr(tool.args_schema, "__annotations__"):
                         params = list(tool.args_schema.__annotations__.keys())
               elif hasattr(tool, "parameters"):
                    # For tools with OpenAPI-style parameters
                    params = [p.get("name", "") for p in tool.parameters]
                    
               args_str = ", ".join(params)
               formatted.append(f"- {name}({args_str}): {description}")
     
     # If tools is a dictionary (legacy format)
     elif isinstance(tools, dict):
          for name, info in tools.items():
               description = info.get("tool", {}).get("description", "No description")
               # Provide schema concisely
               schema_props = info.get("tool", {}).get("inputSchema", {}).get("properties", {})
               args = ", ".join(schema_props.keys())
               formatted.append(f"- {name}({args}): {description}")
               
     return "\n".join(formatted)

def format_recent_messages(messages: List[BaseMessage], max_messages: int = 10) -> str:
     if not messages:
          return "No recent messages."
     recent = messages[-max_messages:]
     formatted = []
     for msg in recent:
          content_str = str(msg.content)[:200] + ("..." if len(str(msg.content)) > 200 else "")
          if isinstance(msg, HumanMessage):
               formatted.append(f"User: {content_str}")
          elif isinstance(msg, AIMessage):
               tool_calls_str = ""
               # Check for both Anthropic and OpenAI style tool calls attribute
               calls_attr = getattr(msg, 'tool_calls', None) or getattr(msg, 'tool_call_chunks', None)
               if calls_attr:
                    try:
                         calls = [f"{tc['name']}({json.dumps(tc['args'])})" for tc in calls_attr if tc]
                         tool_calls_str = f" [Tool Calls: {', '.join(calls)}]"
                    except Exception:
                         tool_calls_str = " [Malformed Tool Call Info]"
               formatted.append(f"Assistant: {content_str}{tool_calls_str}")
          elif isinstance(msg, SystemMessage):
               # Usually skip system messages in recent history for brevity?
               # formatted.append(f"System: {content_str}")
               pass
          elif isinstance(msg, ToolMessage):
                tool_call_id_str = f"({msg.tool_call_id[:8]})" if msg.tool_call_id else ""
                formatted.append(f"Tool Result{tool_call_id_str}: {content_str}")
          else:
                formatted.append(f"{msg.type.capitalize()}: {content_str}")
     return "\n".join(formatted) if formatted else "No recent messages to display."

def format_previous_steps_for_prompt(plan: Plan, current_step_idx: int) -> str:
     """Formats completed steps for the prompt context."""
     completed_steps = []
     for i, step in enumerate(plan["steps"]):
          if step["status"] == "completed":
               completed_steps.append(f"- Step {i+1} (Completed): {step['description']}")
          elif i < current_step_idx: # Also include steps skipped or failed before current
               completed_steps.append(f"- Step {i+1} ({step.get('status', 'unknown')}): {step['description']}")
     return "\n".join(completed_steps) if completed_steps else "No previous steps completed yet."

def format_last_exec_result_for_prompt(exec_result: ExecutionResult | None) -> Dict[str, str]:
     """Formats the last execution result for the prompt, handling None."""
     if not exec_result:
          return {"stdout": "N/A", "stderr": "N/A", "return_value": "N/A"}
     # Limit length for prompts
     stdout = exec_result.get("stdout", "N/A")
     stderr = exec_result.get("stderr", "N/A")
     return_val = str(exec_result.get("returnValue", "N/A"))
     max_len = 500 # Be quite strict for analyzer prompt
     return {
          "stdout": stdout[:max_len] + ("..." if len(stdout) > max_len else ""),
          "stderr": stderr[:max_len] + ("..." if len(stderr) > max_len else ""),
          "return_value": return_val[:max_len] + ("..." if len(return_val) > max_len else "")
     }

def analyzer_node(state: AgentState, llm: BaseChatModel) -> Dict:
    """Analyzes the current state and decides the next action."""
    logger.info("Executing Analyzer Node")

    plan = state.get("plan")
    last_exec = state.get("lastExecutionResult")

    if not plan or not plan.get("steps"):
        logger.error("Analyzer error: Plan is missing or empty.")
        return {"error": "Plan is missing or empty for analysis.", "status": "error"}

    current_step_idx = plan.get("currentStepIndex", 0)
    if current_step_idx >= len(plan["steps"]):
        logger.error(f"Analyzer error: currentStepIndex ({current_step_idx}) is out of bounds for plan length {len(plan['steps'])}.")
        # Maybe the plan finished? If so, evaluator should have set status to idle.
        # If we reach here unexpectedly, it's likely an error state.
        if state.get("status") == "idle":
             logger.info("Analysis node reached with idle status and out-of-bounds index. Assuming completion.")
             return {"current_action": {"action": "finish", "args": {}}}
        else:
             return {"error": "Plan execution index out of bounds.", "status": "error"}

    current_step = plan["steps"][current_step_idx]
    logger.info(f"Analyzing state for step {current_step_idx + 1}: {current_step['description']}")

    # --- Format Information for Prompt ---
    previous_steps_summary = format_previous_steps_for_prompt(plan, current_step_idx)
    formatted_last_exec = format_last_exec_result_for_prompt(last_exec)
    
    # Load base and specific prompts
    base_system_prompt = load_prompt("system_base")
    analyzer_task_prompt_template = load_prompt("analyzer")

    # Format tools, messages and other contextual info
    active_tools = state.get("activeTools", {})
    available_tools_str = format_available_tools(active_tools)
    recent_messages_str = format_recent_messages(state.get("messages", []))
    working_memory = state.get("workingMemory", {"fileReferences": [], "variables": {}})
    
    # Prepare prompt arguments
    prompt_args = {
        "task": state["taskDescription"],
        "previous_steps": previous_steps_summary,
        "step_idx": current_step_idx + 1,  # 1-indexed for human readability
        "total_steps": len(plan["steps"]),
        "step_description": current_step["description"],
        "last_stdout": formatted_last_exec["stdout"],
        "last_stderr": formatted_last_exec["stderr"],
        "last_return": formatted_last_exec["return_value"],
        "available_tools": available_tools_str,
        "files": ", ".join([f.get("name", "unnamed") for f in working_memory.get("fileReferences", [])]),
        "variables": json.dumps(working_memory.get("variables", {}), indent=2),
        "recent_messages": recent_messages_str,
        "type": "analysis"  # Add the 'type' variable that was missing
    }

    # Format the task-specific part safely
    try:
        formatted_analyzer_task = analyzer_task_prompt_template.format(**prompt_args)
    except KeyError as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Missing key in analyzer prompt template: {e}. Using raw template.")
        formatted_analyzer_task = analyzer_task_prompt_template # Fallback
        # Or return error: return {"error": f"Prompt formatting error: Missing key {e}", "status": "error"}
    
    # Combine base and task prompts
    combined_prompt = f"{base_system_prompt}\n\n{formatted_analyzer_task}"

    llm_messages = [
        SystemMessage(content=combined_prompt)
    ]

    # --- Call LLM and Parse Action ---
    try:
        response = llm.invoke(llm_messages)
        logger.debug(f"LLM Analyzer response received: {response.content[:100]}...")
        action_content = response.content if isinstance(response.content, str) else str(response.content)
        parsed_action = parse_action_response(action_content)

        logger.info(f"Analyzer decided action: {parsed_action.get('action')}")
        return {
             "current_action": parsed_action,
             "status": "executing" # Move to executor next
        }
    except Exception as e:
        logger.error(f"Error during analysis: {e}", exc_info=True)
        return {"error": f"Analyzer failed: {e}", "status": "error"} 