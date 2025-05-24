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
from typing import Dict, List, Any # Added List, Any
import threading

# Import the custom graph *creation function* and the placeholder
from graph import create_graph, app_graph as compiled_custom_graph # Renamed placeholder

# Import LLM (assuming OpenAI for now, adjust if needed)
from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI

from bot import VoiceInterfaceAgent
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
thesys_api_key = os.environ.get("THESYS_API_KEY") # Added Thesys API Key
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

# Global variable for Thesys client
thesys_client: AsyncOpenAI | None = None

# Store connections by pc_id
pcs_map: Dict[str, SmallWebRTCConnection] = {}

# ICE server config (Google STUN)
ice_servers = [
    IceServer(urls="stun:stun.l.google.com:19302")
]

# WebRTC Prebuilt UI (optional, if you want to mount a frontend)
# from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI
# app.mount("/prebuilt", SmallWebRTCPrebuiltUI)

# Global queue for LLM messages to frontend
llm_message_queue = asyncio.Queue()
# New queue for raw LLM output from VoiceInterfaceAgent, to be processed by Thesys
raw_llm_output_queue = asyncio.Queue()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the MCP client on startup
    global mcp_client_instance, compiled_custom_graph, thesys_client # Added thesys_client
    try:
        logger.info("Initializing MultiServerMCPClient...")
        mcp_client_instance = MultiServerMCPClient(MCP_SERVERS)
        app.state.mcp_client = mcp_client_instance # Store client in app state
        logger.info("MultiServerMCPClient initialized successfully.")
        
        # --- Initialize Thesys Client ---
        if thesys_api_key:
            logger.info("Initializing Thesys Client...")
            thesys_client = AsyncOpenAI(
                api_key=thesys_api_key,
                base_url="https://api.thesys.dev/v1/embed", # Changed from /visualize to /embed
            )
            logger.info("Thesys Client initialized successfully.")
        else:
            logger.warning("THESYS_API_KEY not found. Visualization features will be disabled.")
            thesys_client = None

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
        thesys_client = None # Ensure Thesys client is also None if startup fails early
    
    # Start the visualization processor task
    asyncio.create_task(visualization_processor())
    logger.info("Visualization processor background task scheduled.")
    
    yield # Application runs here
    
    # Clean up the MCP client on shutdown
    if mcp_client_instance:
        try:
            logger.info("Closing MultiServerMCPClient...")
            #await mcp_client_instance.close()
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

# Add Thesys WebSocket Bridge request model
class ThesysBridgeRequest(BaseModel):
    prompt: dict  # Contains the user message in OpenAI format
    threadId: str | None = None
    responseId: str

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

@app.post("/api/websocket-bridge")
async def websocket_bridge(request: ThesysBridgeRequest):
    """
    Bridge endpoint for Thesys C1Chat to send messages through WebSocket
    and receive responses in the expected format.
    """
    try:
        logger.info(f"WebSocket Bridge: Received request from Thesys C1Chat")
        logger.info(f"Prompt: {request.prompt}")
        logger.info(f"Thread ID: {request.threadId}")
        logger.info(f"Response ID: {request.responseId}")

        # Extract user message from prompt
        user_message = request.prompt.get('content', '')
        
        # For demo purposes, send a message to the WebSocket queue
        # In a real implementation, you'd want to:
        # 1. Process the message through your voice bot or LLM
        # 2. Wait for the actual response
        # 3. Format it properly for Thesys
        
        # Create a demo response that shows the message was received through the bridge
        demo_response = f"✅ **Message received through WebSocket Bridge:**\n\n{user_message}\n\n*This message was sent from Thesys C1Chat through the HTTP-to-WebSocket bridge.*"
        
        # Format response in Thesys XML format
        thesys_response = format_thesys_response(demo_response)
        
        # Optionally, you can also broadcast this to WebSocket clients
        websocket_message = {
            "type": "user_message_from_chat",
            "content": user_message,
            "threadId": request.threadId,
            "responseId": request.responseId,
            "timestamp": "now"
        }
        
        # Send to LLM message queue so WebSocket clients can see it
        await llm_message_queue.put(websocket_message)
        
        # Return the response in the format Thesys expects
        from fastapi.responses import StreamingResponse
        import io
        
        def generate_response():
            yield thesys_response
            
        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
        
    except Exception as e:
        logger.error(f"WebSocket Bridge Error: {e}", exc_info=True)
        
        # Return error in Thesys format
        error_response = format_thesys_error_response(str(e))
        
        def generate_error():
            yield error_response
            
        return StreamingResponse(
            generate_error(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )

def format_thesys_response(message: str) -> str:
    """Format response in Thesys XML format with proper component structure."""
    component = {
        "component": "Card",
        "props": {
            "variant": "card",
            "children": [{
                "component": "TextContent", 
                "props": {
                    "textMarkdown": message
                }
            }]
        }
    }
    
    return f'<content>{json.dumps(component)}</content>'

def format_thesys_error_response(error_message: str) -> str:
    """Format error response in Thesys XML format."""
    component = {
        "component": "Callout",
        "props": {
            "variant": "warning",
            "title": "WebSocket Bridge Error",
            "description": error_message
        }
    }
    
    return f'<content>{json.dumps(component)}</content>'

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
        # Create and run the voice interface agent, passing the display queue
        # agent = VoiceInterfaceAgent(pipecat_connection, llm_message_queue) # OLD
        agent = VoiceInterfaceAgent(pipecat_connection, raw_llm_output_queue) # NEW: Pass raw output queue
        background_tasks.add_task(agent.run)

    answer = pipecat_connection.get_answer()
    pcs_map[answer["pc_id"]] = pipecat_connection
    
    return answer

@app.websocket("/ws/messages")
async def websocket_llm_messages(websocket: WebSocket):
    print(f"DEBUG: Entering websocket_llm_messages for {websocket.client.host}:{websocket.client.port}")
    await websocket.accept()
    logger.info(f"WebSocket /ws/messages connection accepted from {websocket.client.host}:{websocket.client.port}")
    
    try:
        # Send an initial test message to the client
        await websocket.send_text(json.dumps({"type": "connection_ack", "message": "WebSocket connection established!"}))
        logger.info(f"Sent connection_ack to {websocket.client.host}:{websocket.client.port}")

        logger.info("Just beforw while")
        while True:
            logger.info(f"WebSocket /ws/messages waiting for message from llm_message_queue for {websocket.client.host}:{websocket.client.port}")
            print(f"DEBUG: About to await llm_message_queue.get() for {websocket.client.host}:{websocket.client.port}")
            msg = await llm_message_queue.get()
            #llm_message_queue.task_done() # Added task_done for the llm_message_queue
            logger.info(f"WebSocket /ws/messages received message from queue: {msg} for {websocket.client.host}:{websocket.client.port}")
            try:
                serialized_msg = msg if isinstance(msg, str) else json.dumps(msg)
                await websocket.send_text(serialized_msg)
                logger.info(f"WebSocket /ws/messages successfully sent message to {websocket.client.host}:{websocket.client.port}")
            except Exception as send_error:
                logger.error(f"WebSocket /ws/messages error sending message to {websocket.client.host}:{websocket.client.port}: {send_error}", exc_info=True)
                # Optionally, break or close connection if send fails critically
                break 
    except WebSocketDisconnect:
        logger.info(f"WebSocket /ws/messages client {websocket.client.host}:{websocket.client.port} disconnected.")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket /ws/messages for {websocket.client.host}:{websocket.client.port}: {e}", exc_info=True)
    finally:
        logger.info(f"Closing WebSocket /ws/messages connection for {websocket.client.host}:{websocket.client.port}")
        # Uvicorn handles actual closing, this is just a log. Ensure queue tasks are handled if needed.

async def get_thesys_visualization(assistant_response: str, conversation_history: List[Dict[str, Any]] = None):
    """
    Calls Thesys Embed API to get a UI representation for the given text.
    Optionally includes conversation history for better context.
    """
    if not thesys_client:
        logger.error("Thesys client not initialized. Cannot visualize.")
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning", 
                "title": "Visualization Error",
                "description": "Visualization service not available."
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'

    # User's new prompting strategy for Thesys
    thesys_prompt_instruction = (
        "This is what user is talking about and this is voice bot speaking. "
        "Please create a response to user query in line with the bot answer for display. "
        "If there's no expansion needed simply respond bot's answer."
    )
    
    messages_for_thesys = [{"role": "system", "content": thesys_prompt_instruction}]
    if conversation_history: # conversation_history should ideally contain the user's last query for context
        messages_for_thesys.extend(conversation_history[:-1])
    
    # Add the carefully constructed assistant message to be visualized/processed by Thesys
    final_assistant_content_for_thesys = f"For given user query {conversation_history[-1]['content']}, this is what a voice bot answered: {assistant_response}. Now create a response to user query in line with the bot answer for display."

    messages_for_thesys.append({"role": "assistant", "content": final_assistant_content_for_thesys})

    try:
        print(f"Sending to Thesys Embed API (content: {messages_for_thesys}...")
        
        completion = await thesys_client.chat.completions.create(
            messages=messages_for_thesys,
            model="c1-nightly" # This is set during client initialization
        )
        
        visualized_content = completion.choices[0].message.content
        print(f"Received visualization from Thesys. {visualized_content}")
        
        # Check if the content is already in proper Thesys XML format
        if visualized_content and visualized_content.strip().startswith('<content>'):
            return visualized_content
        else:
            # If not in XML format, parse as JSON and wrap appropriately
            try:
                # Try to parse as JSON first
                parsed_content = json.loads(visualized_content) if isinstance(visualized_content, str) else visualized_content
                
                # Handle nested component structure (if Thesys returns {"component": {...}})
                if isinstance(parsed_content, dict) and "component" in parsed_content:
                    actual_component = parsed_content["component"]
                    return f'<content>{json.dumps(actual_component)}</content>'
                elif isinstance(parsed_content, dict):
                    # Direct component structure
                    return f'<content>{json.dumps(parsed_content)}</content>'
                else:
                    # Fallback: wrap in a simple text component
                    fallback_component = {
                        "component": "Card",
                        "props": {
                            "variant": "card",
                            "children": [{
                                "component": "TextContent",
                                "props": {
                                    "textMarkdown": str(visualized_content)
                                }
                            }]
                        }
                    }
                    return f'<content>{json.dumps(fallback_component)}</content>'
                    
            except json.JSONDecodeError:
                # If it's not JSON, treat as plain text
                fallback_component = {
                    "component": "Card",
                    "props": {
                        "variant": "card",
                        "children": [{
                            "component": "TextContent",
                            "props": {
                                "textMarkdown": str(visualized_content)
                            }
                        }]
                    }
                }
                return f'<content>{json.dumps(fallback_component)}</content>'

    except Exception as e:
        logger.error(f"Error calling Thesys Embed API: {e}", exc_info=True)
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning",
                "title": "Visualization Error", 
                "description": f"Failed to generate UI: {str(e)}"
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'


async def visualization_processor():
    """
    Processes raw LLM output, gets visualization from Thesys, and sends to frontend queue.
    """
    logger.info("Visualization processor task started.")
    while True:
        try:
            item = await raw_llm_output_queue.get()
            logger.info(f"Visualization processor: Received item from raw_llm_output_queue: {item}")
            print(f"Visualization processor: Received item from raw_llm_output_queue: {item}")
            text_to_visualize: str | None = item.get("text")
            conversation_history: List[Dict[str, Any]] = item.get("history", [])
            assistant_response: str | None = item.get("assistant_response")
            logger.info(f"Visualization processor: Received conversation history: {conversation_history} and assistant response: {assistant_response}")
            # if isinstance(item, str):
            #     text_to_visualize = item
            # elif isinstance(item, dict): # Expecting {"text": "...", "history": [...]}
            #     # text_to_visualize = item.get("text")
            # conversation_history = item.get("history", [])
            
            # if not text_to_visualize:
            #     logger.warning("Visualization processor received empty or invalid item.")
            #     raw_llm_output_queue.task_done()
            #     continue

            # logger.info(f"Visualization processor: Processing text '{text_to_visualize[:100]}...'")
            visualized_ui_payload = await get_thesys_visualization(assistant_response, conversation_history)
            
            # Prepare message for frontend (C1Chat compatible)
            message_for_frontend = {
                "id": str(uuid.uuid4()),
                "role": "assistant", # Represents assistant's UI output
                "content": visualized_ui_payload, # This is the Thesys UI payload (dict/list or error dict)
            }
            
            await llm_message_queue.put(message_for_frontend)
            logger.info(f"Visualization processor: Sent UI payload/error to frontend queue for ID {message_for_frontend['id']}.")

        except Exception as e:
            logger.error(f"Critical error in visualization_processor loop: {e}", exc_info=True)
            # Optionally, put an error message on llm_message_queue for the client
            await llm_message_queue.put({
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "content": {"type": "error", "message": "A system error occurred while generating UI."}
            })
        finally:
            logger.info("Raw LLM output queue task done")
            #raw_llm_output_queue.task_done()

# If running directly (for testing/dev)
if __name__ == "__main__":
    import uvicorn
    # Configure logging for development
    logging.basicConfig(level=logging.DEBUG) # Set to DEBUG for more verbose output
    # Ensure specific loggers are at desired levels
    logging.getLogger("pipecat").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    logger.info("Starting backend server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Use string for reload 