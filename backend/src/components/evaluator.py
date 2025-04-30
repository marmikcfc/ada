from typing import Dict, Any, List
import logging
import json

from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.language_models.chat_models import BaseChatModel

# Assuming AgentState is defined in src.state.schema
from src.state.schema import AgentState, ExecutionResult, Plan, Step
# Import the prompt loader
from src.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

# Placeholder for parsing the LLM evaluation response
def is_step_completed(response_content: str) -> bool:
    logger.debug(f"Parsing LLM evaluation response: {response_content}")
    response = response_content.strip().lower()
    # Check for variations of yes/no
    if response.startswith("yes"): 
        logger.info("Evaluator determined step IS completed.")
        return True
    elif response.startswith("no"):
        logger.info("Evaluator determined step IS NOT completed.")
        return False
    else:
        logger.warning(f"Could not definitively parse evaluator response ('{response_content}'). Assuming step is NOT completed.")
        return False # Default to not completed if unsure


def format_exec_result_for_eval(exec_result: ExecutionResult) -> Dict[str, str]:
     # Limit length for prompts
     stdout = exec_result.get("stdout", "N/A")
     stderr = exec_result.get("stderr", "N/A")
     return_val = str(exec_result.get("returnValue", "N/A"))
     max_len = 1000
     return {
          "stdout": stdout[:max_len] + ("..." if len(stdout) > max_len else ""),
          "stderr": stderr[:max_len] + ("..." if len(stderr) > max_len else ""),
          "return_value": return_val[:500] + ("..." if len(return_val) > 500 else "")
     }

def progress_evaluator_node(state: AgentState, llm: BaseChatModel) -> Dict:
    """Evaluates the result of the last execution and updates the plan status."""
    logger.info("Executing Progress Evaluator Node")

    plan = state.get("plan")
    last_exec = state.get("lastExecutionResult")

    if not plan or not plan.get("steps"):
        logger.error("Evaluator error: Plan is missing or empty.")
        return {"error": "Plan is missing or empty for evaluation.", "status": "error"}
    
    if not last_exec:
         logger.warning("Evaluator warning: No execution result found to evaluate. Assuming step not completed.")
         return {"status": "executing"}

    current_step_idx = plan.get("currentStepIndex", 0)
    if current_step_idx >= len(plan["steps"]):
         logger.error(f"Evaluator error: currentStepIndex ({current_step_idx}) is out of bounds.")
         return {"error": "Plan execution index out of bounds.", "status": "error"}
         
    current_step = plan["steps"][current_step_idx]
    logger.info(f"Evaluating completion of step {current_step_idx + 1}: {current_step['description']}")

    # --- Call LLM for Evaluation ---    
    eval_prompt_template = load_prompt("evaluator")
    formatted_exec = format_exec_result_for_eval(last_exec)
    
    # Prepare prompt arguments
    prompt_args = {
        "task": state["taskDescription"],
        "step_description": current_step["description"],
        "stdout": formatted_exec["stdout"],
        "stderr": formatted_exec["stderr"],
        "return_value": formatted_exec["return_value"]
    }

    # Format the prompt safely
    try:
         formatted_prompt = eval_prompt_template.format(**prompt_args)
    except KeyError as e:
         logger.error(f"Missing key in evaluator prompt template: {e}. Using raw template.")
         formatted_prompt = eval_prompt_template # Fallback to raw
         # Or return error: return {"error": f"Prompt formatting error: Missing key {e}", "status": "error"}

    llm_messages = [SystemMessage(content=formatted_prompt)]

    try:
        response = llm.invoke(llm_messages)
        logger.debug(f"LLM Evaluation response received: {response.content}")
        
        eval_content = response.content if isinstance(response.content, str) else str(response.content)
        step_is_complete = is_step_completed(eval_content)

        updated_plan = plan.copy() 
        updated_steps = [step.copy() for step in plan["steps"]]
        updated_plan["steps"] = updated_steps

        if step_is_complete:
            logger.info(f"Marking step {current_step_idx + 1} as completed.")
            updated_steps[current_step_idx]["status"] = "completed"
            next_step_idx = current_step_idx + 1

            if next_step_idx >= len(updated_steps):
                logger.info("All plan steps completed.")
                updated_plan["currentStepIndex"] = current_step_idx 
                return {
                    "plan": updated_plan,
                    "status": "idle"  # Task finished
                }
            else:
                logger.info(f"Moving to next step: {next_step_idx + 1}")
                updated_plan["currentStepIndex"] = next_step_idx
                return {
                    "plan": updated_plan,
                    "status": "executing" # Continue to next step
                }
        else:
            logger.info(f"Step {current_step_idx + 1} not completed. Re-analyzing.")
            updated_plan["steps"] = updated_steps 
            return {
                 "plan": updated_plan,
                 "status": "executing" # Loop back to analyzer
            }

    except Exception as e:
        logger.error(f"Error during evaluation: {e}", exc_info=True)
        return {"error": f"Evaluator failed: {e}", "status": "error"} 

def evaluator_node(state: AgentState) -> Dict:
    """Evaluates the result of the last execution against the current plan step.

    Decides whether the step is complete, the plan is finished, or requires more analysis.

    Args:
        state (AgentState): The current state of the agent.

    Returns:
        Dict: Update dictionary for the agent state.
    """
    logger.info("Executing Evaluator Node")
    plan = state.get("plan")
    last_exec = state.get("lastExecutionResult")

    if not plan or not plan.get("steps"):
        logger.error("Evaluator error: Plan is missing or empty.")
        return {"error": "Plan is missing or empty for evaluation.", "status": "error"}

    current_step_idx = plan.get("currentStepIndex", 0)
    if current_step_idx >= len(plan["steps"]):
        logger.warning(f"Evaluator warning: currentStepIndex ({current_step_idx}) out of bounds. Assuming plan finished.")
        return {"status": "idle", "final_message": "Plan execution seems complete (index out of bounds)."}

    current_step = plan["steps"][current_step_idx]
    logger.info(f"Evaluating step {current_step_idx + 1}: {current_step['description']}")

    # --- Basic Evaluation Logic (Placeholder) ---
    # This logic needs to be more sophisticated. It could:
    # 1. Check execution status (success/error).
    # 2. Use an LLM to evaluate if the step's goal was met based on the result.
    # 3. Implement retry logic for failures.

    step_completed = False
    plan_finished = False
    evaluation_message = ""

    if last_exec and last_exec.get("status") == "success":
        # Simple success check: Assume step is done if execution succeeded.
        # A better check would analyze the output against the step description.
        step_completed = True
        evaluation_message = f"Step {current_step_idx + 1} marked completed based on successful execution."
        logger.info(evaluation_message)
        plan["steps"][current_step_idx]["status"] = "completed"
    elif last_exec:
        evaluation_message = f"Step {current_step_idx + 1} potentially failed or requires more work (exec status: {last_exec.get('status')})."
        logger.warning(evaluation_message)
        plan["steps"][current_step_idx]["status"] = "pending" # Or "failed" if we add retries/error handling
        # For now, we'll just loop back to analysis on failure/non-success
    else:
        evaluation_message = f"No execution result found for step {current_step_idx + 1}. Re-analyzing."
        logger.warning(evaluation_message)
        plan["steps"][current_step_idx]["status"] = "pending"
        # Loop back to analysis if no result (shouldn't happen in normal flow)

    next_state_update: Dict[str, Any] = {"plan": plan}

    if step_completed:
        next_step_idx = current_step_idx + 1
        if next_step_idx >= len(plan["steps"]):
            plan_finished = True
            logger.info("All plan steps completed.")
            next_state_update["status"] = "idle"
            next_state_update["final_message"] = "Successfully completed all plan steps."
            # TODO: Add final summary message to state["messages"]?
        else:
            logger.info(f"Moving to step {next_step_idx + 1}.")
            plan["currentStepIndex"] = next_step_idx
            next_state_update["status"] = "analyzing" # Go to analyzer for the next step
            # Clear last execution result? Or keep for context?
            # next_state_update["lastExecutionResult"] = None
    else:
        # If step not completed (e.g., error, or needs more work), go back to analyzer
        logger.info(f"Step {current_step_idx + 1} not completed. Returning to analyzer.")
        next_state_update["status"] = "analyzing"

    # Optionally add evaluation message to state messages
    # messages = state.get("messages", [])
    # messages.append(SystemMessage(content=evaluation_message))
    # next_state_update["messages"] = messages

    return next_state_update 