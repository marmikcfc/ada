import os
from state.agent_state import AgentState
from langchain_core.messages import AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.tools import tool

# Load the prompt template
prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "planner_prompt.txt")
with open(prompt_path, "r") as f:
    planner_prompt_template = f.read()

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", planner_prompt_template),
        MessagesPlaceholder(variable_name="messages"),
        # The user message is passed directly to the tool function
        ("human", "User Request (that requires planning):\n{user_message}"),
    ]
)

# Initialize the LLM
llm = ChatOpenAI(model=os.environ.get("AGENT_MODEL", "gpt-4o-mini"))

# Create the runnable chain
planner_runnable = prompt | llm | StrOutputParser()

@tool
async def planner_tool(user_message: str, messages: list):
    """Use this tool to create a step-by-step plan when the user's request is complex 
    or requires multiple steps. Input should be the user's request message and the 
    conversation history."""
    print("--- Calling Planner Tool ---")
    print(f"Planner received request: {user_message}")
    
    # Invoke the LLM chain
    plan = await planner_runnable.ainvoke({
        "messages": messages, # Pass the history
        "user_message": user_message
    })
    
    print(f"Planner Tool generated Plan:\n{plan}")
    # Return the generated plan string
    return plan


# This node is no longer directly used in the graph when planner is a tool
# Remove it to clean up.
# async def planner_node(state: AgentState):
#     print("--- Running Planner Node (Legacy) ---")
#     user_message_for_planning = state['messages'][-2].content
#     history_for_planning = state['messages'][:-1]
#     plan = await planner_runnable.ainvoke({
#         "messages": history_for_planning,
#         "user_message": user_message_for_planning
#     })
#     state['plan'] = plan
#     state['messages'].append(AIMessage(content=f"Here is the plan:\n{plan}"))
#     state['next_action'] = None
#     return state
