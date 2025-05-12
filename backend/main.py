# .env should include:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-... (if using Anthropic models)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, WebSocket, WebSocketDisconnect

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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import Dict

# Import the custom graph *creation function* and the placeholder
from graph import create_graph, app_graph as compiled_custom_graph # Renamed placeholder

# Import LLM (assuming OpenAI for now, adjust if needed)
from langchain_openai import ChatOpenAI

from bot import run_bot
from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

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

# Global variable to hold the MCP client instance
mcp_client_instance: MultiServerMCPClient | None = None

# Store connections by pc_id
pcs_map: Dict[str, SmallWebRTCConnection] = {}

# ICE server config (Google STUN)
ice_servers = [
    IceServer(urls="stun:stun.l.google.com:19302")
]

# WebRTC Prebuilt UI (optional, if you want to mount a frontend)
# from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI
# app.mount("/prebuilt", SmallWebRTCPrebuiltUI)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the MCP client on startup
    global mcp_client_instance
    # Initialize graph placeholder globally
    global compiled_custom_graph 
    try:
        logger.info("Initializing MultiServerMCPClient...")
        mcp_client_instance = MultiServerMCPClient(MCP_SERVERS)
        app.state.mcp_client = mcp_client_instance # Store client in app state
        logger.info("MultiServerMCPClient initialized successfully.")
        
        # --- Initialize Graph --- 
        if mcp_client_instance:
            logger.info("Initializing custom graph...")
            mcp_tools = mcp_client_instance.get_tools()
            compiled_custom_graph = create_graph(mcp_tools)
            logger.info("Custom graph initialized successfully.")
        else:
            logger.error("MCP client failed to initialize, cannot create graph.")
            compiled_custom_graph = None # Ensure graph is None if client fails
            
    except Exception as e:
        logger.error(f"Failed to initialize MCP Client during startup: {e}", exc_info=True)
        mcp_client_instance = None
        app.state.mcp_client = None
    
    yield # Application runs here
    
    # Clean up the MCP client on shutdown
    if mcp_client_instance:
        try:
            logger.info("Closing MultiServerMCPClient...")
            await mcp_client_instance.close()
            logger.info("MultiServerMCPClient closed successfully.")
        except Exception as e:
            logger.error(f"Failed to close MCP Client during shutdown: {e}", exc_info=True)

    # Cleanup WebRTC connections
    coros = [pc.close() for pc in pcs_map.values() if hasattr(pc, 'close')]
    await asyncio.gather(*coros)
    pcs_map.clear()

app = FastAPI(lifespan=lifespan)

# Define checkpointer globally for reuse (consider lifecycle management)
# Use the environment variable for the database path
memory = AsyncSqliteSaver.from_conn_string(f"sqlite+aiosqlite:///{AGENT_SQLITE_DB}")

# Add CORS middleware for cross-origin support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    thread_id: str
    message: str

class AgentRequest(BaseModel):
    message: str
    thread_id: str | None = None

from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI
app.mount("/prebuilt", SmallWebRTCPrebuiltUI)



@app.get("/")
def read_root():
    return {"message": "Hello from LangGraph MCP-enabled FastAPI backend!"}

@app.post("/chat")
async def chat(request: ChatRequest):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set in environment.")
    # Access client from app state
    mcp_client = request.app.state.mcp_client 
    if mcp_client is None:
         raise HTTPException(status_code=500, detail="MCP Client not initialized.")

    # Use a temporary in-memory checkpointer for this specific example endpoint
    # Note: /agent uses the persistent DB defined earlier
    async with AsyncSqliteSaver.from_conn_string(":memory:") as checkpointer:
        config = {"configurable": {"thread_id": request.thread_id, "checkpoint_ns": ""}}

        # Create a ReAct agent with MCP tools
        tools = mcp_client.get_tools()
        llm = ChatOpenAI(model=AGENT_MODEL)
        agent_executor = create_react_agent(llm, tools, checkpointer=checkpointer)

        try:
            # Invoke the agent with the user's message
            result = await agent_executor.ainvoke(
                {"messages": [HumanMessage(content=request.message)]},
                config=config
            )

            # Extract response from agent result
            response = result["messages"][-1].content if result.get("messages") else "No response"

            return {
                "response": response,
                "history": [m.content for m in result.get("messages", [])]
            }
        except Exception as e:
            logger.error(f"Error in /chat endpoint: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error invoking agent: {str(e)}")

@app.post("/agent")
async def agent_endpoint(agent_request: AgentRequest, fastapi_req: Request):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set in environment.")
        
    # Access client from app state
    # mcp_client = fastapi_req.app.state.mcp_client # No longer needed directly here
    # if mcp_client is None:
    #      raise HTTPException(status_code=500, detail="MCP Client not initialized.")
         
    # Get the compiled graph (now initialized during lifespan)
    if compiled_custom_graph is None:
        raise HTTPException(status_code=500, detail="Agent graph not initialized.")
        
    compiled_graph_with_checkpoint = compiled_custom_graph.with_config(checkpointer=memory)

    thread_id = agent_request.thread_id or str(uuid.uuid4()) # Generate thread_id if not provided
    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

    try:
        logger.info(f"Invoking custom agent for thread_id: {thread_id}")
        # Invoke the custom graph
        result = await compiled_graph_with_checkpoint.ainvoke(
            {"messages": [HumanMessage(content=agent_request.message)]},
            config=config,
        )

        # Extract the final response (assuming it's the last message)
        final_response = result['messages'][-1].content if result.get('messages') else "No response from agent."
        logger.info(f"Agent invocation successful for thread_id: {thread_id}")

        return {
            "response": final_response,
            "thread_id": thread_id,
            "history": [m.content for m in result.get("messages", [])]
        }
    except Exception as e:
        logger.error(f"Error invoking custom agent for thread_id {thread_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error invoking custom agent: {str(e)}")

# Add health check endpoint (good practice)
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/health")

# @app.post("/api/offer")
@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    pc_id = request.get("pc_id")
    if pc_id and pc_id in pcs_map:
        pipecat_connection = pcs_map[pc_id]
        logger.info(f"Reusing existing connection for pc_id: {pc_id}")
        await pipecat_connection.renegotiate(
            sdp=request["sdp"], type=request["type"], restart_pc=request.get("restart_pc", False)
        )
    else:
        pipecat_connection = SmallWebRTCConnection(ice_servers)
        await pipecat_connection.initialize(sdp=request["sdp"], type=request["type"])


        @pipecat_connection.event_handler("closed")
        async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
            logger.info(f"Discarding peer connection for pc_id: {webrtc_connection.pc_id}")
            pcs_map.pop(webrtc_connection.pc_id, None)
        background_tasks.add_task(run_bot, pipecat_connection)

    answer = pipecat_connection.get_answer()
    pcs_map[answer["pc_id"]] = pipecat_connection
    
    return answer

# If running directly (for testing/dev)
if __name__ == "__main__":
    import uvicorn
    # Configure logging for development
    logging.basicConfig(level=logging.DEBUG) # Set to DEBUG for more verbose output
    logger.info("Starting backend server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Use string for reload 