# .env should include:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-... (if using Anthropic models)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os
import asyncio
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langchain_mcp_adapters.client import MultiServerMCPClient
from contextlib import asynccontextmanager
import json
import base64
import uuid
import logging # Add logging import

# Import agent components
from src.agent.orchestrator import create_agent_graph
from src.state.schema import AgentState, Plan, WorkingMemory
from src.tools.code_executor import RestrictedExecutor
# Import the Planner Tool factory
from src.tools.planner_tool import get_planner_tool

# Import LLM (assuming OpenAI for now, adjust if needed)
from langchain_openai import ChatOpenAI

# Get the logger
logger = logging.getLogger(__name__)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)

config = {}
config_b64 = base64.b64encode(json.dumps(config).encode())
# Load API keys and model name from environment variables
smithery_api_key = os.environ.get("SMITHERY_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
AGENT_MODEL = os.environ.get("AGENT_MODEL", "gpt-4o-mini")
AGENT_SQLITE_DB = os.environ.get("AGENT_SQLITE_DB", "agent_history.db")

# Load MCP servers configuration from JSON file
with open(os.path.join(os.path.dirname(__file__), "mcp_servers.json"), "r") as f:
    MCP_SERVERS = json.load(f)

# Optionally, if you need to inject dynamic values (like config_b64 or api keys) into the config:
for server in MCP_SERVERS.values():
    if isinstance(server, dict):
        for k, v in server.items():
            if isinstance(v, str):
                server[k] = v.format(
                    config_b64=base64.b64encode(json.dumps(config).encode()).decode(),
                    smithery_api_key=smithery_api_key or ""
                )

# Create our application lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create MCP client on startup
    app.mcp_client = MultiServerMCPClient(MCP_SERVERS)
    await app.mcp_client.__aenter__()

    # Create instances of dependencies needed by the graph
    app.code_executor = RestrictedExecutor(workspace_dir="./agent_workspace")

    # Compile the agent graph once on startup
    # Define the LLM based on AGENT_MODEL (outside lifespan if static, or inside if dynamic)
    # Ensure necessary API keys are loaded here if not using env vars directly in ChatOpenAI
    if not openai_api_key:
        # Handle missing key during startup - maybe raise an error or log
        print("ERROR: OPENAI_API_KEY not found during startup.")
        # Depending on desired behavior, you might exit or proceed without the agent graph
        app.agent_graph = None
    else:
        # LLM for core agent logic (analyzer, evaluator)
        llm = ChatOpenAI(model=AGENT_MODEL, api_key=openai_api_key, temperature=0)
        # Potentially a different/cheaper LLM for evaluation or planning
        eval_llm = ChatOpenAI(model=AGENT_MODEL, api_key=openai_api_key, temperature=0)
        planner_llm = ChatOpenAI(model=AGENT_MODEL, api_key=openai_api_key, temperature=0) # Or a different model

        # Instantiate the Planner Tool
        planner_tool_instance = get_planner_tool(llm=planner_llm)

        # Compile the graph using the correct function and dependencies
        # Pass None for checkpointer as it's handled per-request
        app.agent_graph = create_agent_graph(
            llm=llm,
            eval_llm=eval_llm,
            planner_tool=planner_tool_instance, # Pass the planner tool instance
            code_executor=app.code_executor,
            mcp_client=app.mcp_client,
            checkpointer=None
        )
        print("Agent graph compiled during startup using orchestrator (Planner as Tool).")


    yield

    # Close MCP client on shutdown
    await app.mcp_client.__aexit__(None, None, None)
    # No explicit close needed for checkpointer context manager here


app = FastAPI(lifespan=lifespan)

class ChatRequest(BaseModel):
    thread_id: str
    message: str

class AgentRequest(BaseModel):
    message: str
    thread_id: str | None = None

@app.get("/")
def read_root():
    return {"message": "Hello from LangGraph MCP-enabled FastAPI backend!"}

@app.post("/chat")
async def chat(request: ChatRequest):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set in environment.")
    
    SQLITE_PATH = os.environ.get("SQLITE_DB_PATH", "chat_history_new.db")
    config = {"configurable": {"thread_id": request.thread_id, "checkpoint_ns": ""}}
    

    async with AsyncSqliteSaver.from_conn_string(":memory:") as checkpointer:

    # Create a ReAct agent with MCP tools
        tools = app.mcp_client.get_tools()
        agent = create_react_agent(
            AGENT_MODEL,  # Now configurable
            tools,
            checkpointer=checkpointer
        )

        try:
            # Invoke the agent with the user's message
            result = await agent.ainvoke(
                {"messages": [HumanMessage(content=request.message)]},
                config
            )
            
            # Extract response from agent result
            response = result["messages"][-1].content if result.get("messages") else "No response"
            
            return {
                "response": response,
                "history": [m.content for m in result.get("messages", [])]
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error invoking agent: {str(e)}") 

@app.post("/agent")
async def agent_endpoint(agent_request: AgentRequest, fastapi_req: Request):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set in environment.")

    # Retrieve the pre-compiled agent graph from app state
    agent_graph = fastapi_req.app.agent_graph
    if agent_graph is None:
         raise HTTPException(status_code=500, detail="Agent graph not available. Check server logs.")

    # Retrieve dependencies from app state (they were created during lifespan)
    # mcp_manager = fastapi_req.app.mcp_manager
    # code_executor = fastapi_req.app.code_executor

    # Create and manage the checkpointer context for this request
    async with AsyncSqliteSaver.from_conn_string(AGENT_SQLITE_DB) as checkpointer:
        # mcp_client = fastapi_req.app.mcp_client # Access MCP client if needed by graph nodes (Now handled by mcp_manager)

        # Define the LLM based on AGENT_MODEL (redundant if already bound in compiled graph)
        # llm = ChatOpenAI(model=AGENT_MODEL, api_key=openai_api_key, temperature=0)

        # Generate a thread_id if not provided
        thread_id = agent_request.thread_id or str(uuid.uuid4())
        # Configure the checkpointer for this specific thread
        config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": "", "checkpointer": checkpointer}}

        # Prepare initial state for the graph
        # Ensure all *required* fields from AgentState are initialized
        initial_input = AgentState(
            messages=[HumanMessage(content=agent_request.message)],
            # Set required fields with defaults or initial values
            taskDescription=agent_request.message, # Use the input message as the initial task
            plan=Plan(steps=[], currentStepIndex=-1), # Initialize with an empty plan
            workingMemory=WorkingMemory(fileReferences=[], variables={}), # Empty working memory
            activeTools={}, # No active tools initially
            activeResources={}, # No active resources initially
            status="planning" # Start with planning status
            # Optional fields like 'error', 'nextAction', 'lastExecutionResult' are not needed initially
        )


        try:
            # Stream events from the agent graph, configuring the checkpointer
            final_state = None
            logger.info(f"Invoking agent graph for thread {thread_id} with input: {agent_request.message}")
            async for event in agent_graph.astream_events(initial_input, config=config, version="v1"):
                kind = event["event"]
                logger.debug(f"Thread {thread_id} - Event: {kind}, Data: {event['data']}") # Log events
                # Keep track of the latest full state snapshot
                if kind == "on_chain_end":
                     logger.info(f"Thread {thread_id} - Chain ended.")
                     final_state = event["data"]["output"]

            if final_state is None:
                 # Fallback: if no 'on_chain_end' event caught state, try get_state
                 # Need to pass config with checkpointer to get_state as well
                 current_state = await agent_graph.aget_state(config)
                 final_state = current_state.values if current_state else None


            if final_state:
                # Return the relevant parts of the final state
                return {
                    "thread_id": thread_id,
                    "final_response": final_state.get("response", "Agent finished without explicit response."),
                    "full_final_state": final_state # Include full state for debugging/inspection
                }
            else:
                 raise HTTPException(status_code=500, detail="Agent execution finished without a final state.")

        except Exception as e:
            # Log the full exception traceback
            logger.error(f"Error invoking custom agent for thread {thread_id}: {e}", exc_info=True)
            # Return a more informative error message, maybe include the type of error
            raise HTTPException(status_code=500, detail=f"Error invoking custom agent: {type(e).__name__}: {e}")

# Add health check endpoint (good practice)
@app.get("/health")
def health_check():
    return {"status": "ok"}

# If running directly (for testing/dev)
if __name__ == "__main__":
    import uvicorn
    # Configure logging for development
    logging.basicConfig(level=logging.DEBUG) # Set to DEBUG for more verbose output
    logger.info("Starting backend server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Use string for reload 