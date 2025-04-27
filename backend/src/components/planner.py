from typing import Dict, List
import logging

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel

# Assuming AgentState is defined in src.state.schema
from src.state.schema import AgentState, Plan, Step
# Import the prompt loader
from src.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

# Placeholder for parsing the LLM response into a structured plan
def parse_plan(response_content: str) -> List[Step]:
    # This needs robust parsing logic based on the expected LLM output format
    logger.debug(f"Parsing LLM plan response: {response_content[:100]}...")
    steps = []
    try:
        # Simple parsing: assumes numbered list
        lines = response_content.strip().split('\n')
        step_num = 1
        current_description = ""
        for line in lines:
            line = line.strip()
            # Basic check for numbered list format (e.g., "1. Do this", "2: Do that")
            prefix = f"{step_num}. "
            prefix_colon = f"{step_num}: "
            if line.startswith(prefix) or line.startswith(prefix_colon):
                # If we were accumulating a description, save the previous step
                if current_description:
                     steps.append({
                          "number": step_num -1,
                          "description": current_description.strip(),
                          "status": "pending"
                     })
                # Start new step
                current_description = line.split(prefix, 1)[1] if line.startswith(prefix) else line.split(prefix_colon, 1)[1]
                step_num += 1
            elif line and current_description: # Handle potential multi-line descriptions for the current step
                 current_description += "\n" + line
            elif line and not steps and not current_description and line.startswith("1."): # Handle case where first line might be missed
                 current_description = line.split("1. ", 1)[1]
                 step_num = 2 # Next expected is 2
        
        # Add the last accumulated step description
        if current_description:
             steps.append({
                  "number": step_num -1,
                  "description": current_description.strip(),
                  "status": "pending"
             })

        if not steps:
             logger.warning("Failed to parse any steps from LLM response.")
             # Fallback: treat the whole response as a single step
             steps.append({"number": 1, "description": response_content.strip(), "status": "pending"})

    except Exception as e:
        logger.error(f"Error parsing plan response: {e}", exc_info=True)
        # Fallback if parsing fails
        steps.append({"number": 1, "description": "Failed to parse plan, using raw response: " + response_content.strip(), "status": "pending"})

    logger.info(f"Parsed plan into {len(steps)} steps.")
    return steps

def planner_node(state: AgentState, llm: BaseChatModel) -> Dict:
    """Generates a plan based on the initial task description."""
    logger.info("Executing Planner Node")
    task = state["taskDescription"]
    messages = state["messages"]
    # Load base and specific prompts
    base_system_prompt = load_prompt("system_base")
    planner_task_prompt_template = load_prompt("planner")

    logger.info(f"Generating plan for task: {task}")

    last_user_message = "" # Default
    if messages and messages[-1].type == 'human':
         last_user_message = messages[-1].content
    elif task:
         last_user_message = task
    else:
         logger.error("Cannot determine task for planner: No taskDescription or last human message.")
         return {"error": "No task provided for planning.", "status": "error"}

    # Format the task-specific part
    try:
        formatted_planner_task = planner_task_prompt_template.format(task=last_user_message)
    except KeyError as e:
        logger.error(f"Missing key in planner prompt template: {e}. Using raw template.")
        formatted_planner_task = planner_task_prompt_template # Fallback
        # Or return error: return {"error": f"Prompt formatting error: Missing key {e}", "status": "error"}

    # Combine base and task prompts
    combined_prompt = f"{base_system_prompt}\n\n{formatted_planner_task}" 
    
    llm_messages = [
        SystemMessage(content=combined_prompt),
    ]

    try:
        response = llm.invoke(llm_messages)
        logger.debug(f"LLM Plan response received: {response.content[:100]}...")
        plan_content = response.content if isinstance(response.content, str) else str(response.content)
        parsed_plan_steps = parse_plan(plan_content)

        if not parsed_plan_steps:
             logger.error("Planner failed to generate a valid plan.")
             return {"error": "Failed to generate plan.", "status": "error"}

        plan: Plan = {
            "steps": parsed_plan_steps,
            "currentStepIndex": 0
        }

        logger.info(f"Plan generated with {len(plan['steps'])} steps.")
        # Add system message confirming plan generation
        updated_messages = messages + [SystemMessage(content=f"Plan Generated ({len(plan['steps'])} steps):")] # Optionally include plan_content

        return {
            "plan": plan,
            "messages": updated_messages,
            "status": "executing" 
        }
    except Exception as e:
        logger.error(f"Error during planning: {e}", exc_info=True)
        return {"error": f"Planner failed: {e}", "status": "error"} 