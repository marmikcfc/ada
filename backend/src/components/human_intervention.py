from typing import Dict
import logging

from src.state.schema import AgentState
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

# Placeholder implementation - replace with actual logic
def human_intervention_node(state: AgentState) -> Dict:
     logger.warning("HUMAN INTERVENTION REQUIRED")
     print("-" * 20)
     print("Current Task:", state.get("taskDescription"))
     plan = state.get("plan", {})
     if plan.get("steps"):
          current_idx = plan.get("currentStepIndex", 0)
          if 0 <= current_idx < len(plan["steps"]):
               print("Current Step:", plan["steps"][current_idx].get("description"))
     print("Last Result:", state.get("lastExecutionResult"))
     print("Messages:", state.get("messages", [])[-5:]) # Last 5 messages
     print("Please provide input (approve/modify [new instructions]/abort):")
     
     # Replace with actual UI/input mechanism
     human_response = input("> ").strip().lower()

     
     if human_response == "approve":
          logger.info("Human approved continuation.")
          return {"status": "executing", "messages": state["messages"] + [HumanMessage(content="Human approved.")]}
     elif human_response.startswith("modify "):
          modification = human_response.split(" ", 1)[1]
          logger.info(f"Human provided modification: {modification}")
          return {"status": "executing", "messages": state["messages"] + [HumanMessage(content=f"Human modification: {modification}")]}
     else: # Default to abort
          logger.info("Human aborted task.")
          return {"status": "idle", "error": "Task aborted by human."} 