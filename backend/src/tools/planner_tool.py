import logging
from typing import Type, Optional, Any
from pydantic import BaseModel, Field

from langchain_core.tools import BaseTool
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers.json import JsonOutputParser

# Assuming your Plan schema is defined like this in src.state.schema
# Re-import or redefine if necessary
from src.state.schema import Plan

logger = logging.getLogger(__name__)

# --- Planner Prompt ---
PLANNER_SYSTEM_PROMPT = """You are an expert planner tasked with creating a step-by-step plan to accomplish a given task.
Analyze the user's request and break it down into a sequence of manageable steps.
Each step should represent a concrete action, often involving calling a specific tool or interacting with the user.
Focus on clarity and logical progression.

Respond with a JSON object containing a list of steps. Each step should have:
- 'number': The step number (starting from 1).
- 'description': A clear description of what needs to be done in this step.
- 'status': Initialize this to 'pending'.

Example Plan Format:
{
  "steps": [
    {
      "number": 1,
      "description": "Search the web for recent news about AI regulations.",
      "status": "pending"
    },
    {
      "number": 2,
      "description": "Summarize the key findings from the search results.",
      "status": "pending"
    },
    {
      "number": 3,
      "description": "Draft a brief report based on the summary.",
      "status": "pending"
    }
  ],
  "currentStepIndex": -1
}

User Request: {task_description}

Your Plan (JSON object):"""

PLAN_PROMPT = ChatPromptTemplate.from_messages(
    [("system", PLANNER_SYSTEM_PROMPT)]
)

# --- Tool Definition ---

class PlannerInput(BaseModel):
    task_description: str = Field(description="The user's request or task that needs a plan.")

class PlannerTool(BaseTool):
    name: str = "create_detailed_plan"
    description: str = "Generates a step-by-step plan for complex user requests. Use this when a task involves multiple steps or requires coordinating several actions."
    args_schema: Type[BaseModel] = PlannerInput
    llm: BaseChatModel
    prompt: ChatPromptTemplate = PLAN_PROMPT
    output_parser: JsonOutputParser = JsonOutputParser(pydantic_object=Plan)

    def _run(self, task_description: str) -> Plan:
        """Synchronous execution (not typically used in async LangGraph)."""
        logger.warning("PlannerTool._run called synchronously.")
        chain = self.prompt | self.llm | self.output_parser
        return chain.invoke({"task_description": task_description})

    async def _arun(self, task_description: str) -> Plan:
        """Asynchronous execution used by LangGraph."""
        logger.info(f"PlannerTool received task: {task_description}")
        chain = self.prompt | self.llm | self.output_parser
        try:
            plan_dict = await chain.ainvoke({"task_description": task_description})
            # Ensure currentStepIndex is initialized correctly if parser doesn't handle defaults
            if "currentStepIndex" not in plan_dict:
                 plan_dict["currentStepIndex"] = -1 # Start before the first step
            logger.info(f"Generated plan: {plan_dict}")
            # Validate/parse again to be sure it fits the Pydantic model
            validated_plan = Plan(**plan_dict)
            return validated_plan
        except Exception as e:
            logger.error(f"Error generating plan: {e}", exc_info=True)
            # Return an empty or error plan structure
            return Plan(steps=[], currentStepIndex=-1) # Indicate failure with empty plan

def get_planner_tool(llm: BaseChatModel) -> PlannerTool:
    """Factory function to create the planner tool instance."""
    return PlannerTool(llm=llm) 