# .env should include:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-... (if using Anthropic models)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, WebSocket, WebSocketDisconnect

from pydantic import BaseModel, Field
import os
import asyncio
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from contextlib import asynccontextmanager
import json
import base64
import uuid
import logging # Add logging import
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import Dict, List, Any # Added List, Any
import threading
from src.mcp.enhanced_mcp_client import EnhancedMCPClient

# Import the custom graph *creation function* and the placeholder
from graph import create_graph, app_graph as compiled_custom_graph # Renamed placeholder

# Import LLM (assuming OpenAI for now, adjust if needed)
from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI

# Updated import for the voice agent
from agent.voice_based_interaction_agent import VoiceInterfaceAgent
from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

# Import Thesys prompt utilities
from utils.thesys_prompts import format_thesys_messages, format_thesys_messages_for_visualize

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
    MCP_CONFIG = json.load(f)

# Global variable to hold the enhanced MCP client
enhanced_mcp_client: EnhancedMCPClient | None = None

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
# New queue for raw LLM output from VoiceInterfaceAgent, to be processed by LangGraph then Thesys
raw_llm_output_queue = asyncio.Queue()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the MCP client on startup
    global enhanced_mcp_client, compiled_custom_graph, thesys_client # Added enhanced_mcp_client
    try:
        logger.info("Initializing Enhanced MCP Client...")
        enhanced_mcp_client = EnhancedMCPClient(os.path.join(os.path.dirname(__file__), "mcp_servers.json"))
        await enhanced_mcp_client.initialize()
        app.state.enhanced_mcp_client = enhanced_mcp_client
        logger.info("Enhanced MCP Client initialized successfully.")
        
        # --- Initialize Thesys Client ---
        if thesys_api_key:
            logger.info("Initializing Thesys Client...")
            thesys_client = AsyncOpenAI(
                api_key=thesys_api_key,
                base_url="https://api.thesys.dev/v1/visualize", # Changed from /embed to /visualize
            )
            logger.info("Thesys Client initialized successfully.")
        else:
            logger.warning("THESYS_API_KEY not found. Visualization features will be disabled.")
            thesys_client = None

        # --- Initialize Graph --- 
        if enhanced_mcp_client:
            logger.info("Initializing custom graph...")
            mcp_tools = enhanced_mcp_client.get_tools()
            compiled_custom_graph = create_graph(mcp_tools)
            logger.info("Custom graph initialized successfully.")
        else:
            logger.error("MCP client failed to initialize, cannot create graph.")
            compiled_custom_graph = None # Ensure graph is None if client fails
            
    except Exception as e:
        logger.error(f"Failed to initialize MCP Client during startup: {e}", exc_info=True)
        enhanced_mcp_client = None
        app.state.enhanced_mcp_client = None
        thesys_client = None # Ensure Thesys client is also None if startup fails early
    
    # Start the visualization processor task
    asyncio.create_task(visualization_processor())
    logger.info("Visualization processor background task scheduled.")
    
    yield # Application runs here
    
    # Clean up the MCP client on shutdown
    if enhanced_mcp_client:
        try:
            logger.info("Closing Enhanced MCP Client...")
            await enhanced_mcp_client.close()
            logger.info("Enhanced MCP Client closed successfully.")
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

class EnhancementDecision(BaseModel):
    """Pydantic model for MCP agent's enhancement decision response."""
    displayEnhancement: bool = Field(
        description="Whether the response should be enhanced with dynamic UI components"
    )
    displayEnhancedText: str = Field(
        description="The text to use for UI generation (if enhancement is true) or plain text display (if enhancement is false)"
    )
    voiceOverText: str = Field(
        description="The text to be spoken via TTS - should be natural and conversational"
    )

from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI
app.mount("/prebuilt", SmallWebRTCPrebuiltUI)



@app.get("/")
def read_root():
    return {"message": "Hello from LangGraph MCP-enabled FastAPI backend!"}


@app.post("/agent")
async def agent_endpoint(agent_request: AgentRequest, fastapi_req: Request):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set in environment.")
        
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
    Bridge endpoint for Thesys C1Chat to send messages through LangGraph agent
    and receive responses in the expected format.
    """
    try:
        logger.info(f"WebSocket Bridge: Received request from Thesys C1Chat")
        logger.info(f"Prompt: {request.prompt}")
        logger.info(f"Thread ID: {request.threadId}")
        logger.info(f"Response ID: {request.responseId}")

        # Extract user message from prompt
        user_message = request.prompt.get('content', '')
        
        if not user_message:
            logger.warning("WebSocket Bridge: Empty user message received")
            error_response = format_thesys_error_response("Empty message received")
            return create_streaming_response(error_response)
        
        # Note: We don't send user message to WebSocket queue here because 
        # the C1Chat component already handles displaying user messages automatically
        logger.info(f"WebSocket Bridge: Processing user message: {user_message}")
        
        # Step 1: Process message through LangGraph agent
        if not compiled_custom_graph:
            logger.error("WebSocket Bridge: LangGraph agent not available")
            error_response = format_thesys_error_response("Agent not available")
            return create_streaming_response(error_response)
        
        # Use thread ID from request or generate new one
        thread_id = request.threadId or str(uuid.uuid4())
        
        try:
            logger.info(f"WebSocket Bridge: Processing message through LangGraph agent for thread {thread_id}")
            
            # Configure the graph with checkpointer
            compiled_graph_with_checkpoint = compiled_custom_graph.with_config(checkpointer=memory)
            config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
            
            # Invoke the LangGraph agent
            result = await compiled_graph_with_checkpoint.ainvoke(
                {"messages": [HumanMessage(content=user_message)]},
                config=config,
            )
            
            # Extract the agent response
            agent_response = result['messages'][-1].content if result.get('messages') else "No response from agent."
            logger.info(f"WebSocket Bridge: LangGraph agent response: {agent_response[:100]}...")
            
            # Step 2: Process through Thesys Visualize API
            logger.info(f"WebSocket Bridge: Sending agent response to Thesys Visualize API")
            
            # Get conversation history for context (last few messages from this thread)
            conversation_history = []
            if len(result.get('messages', [])) > 1:
                # Convert recent messages to the format expected by Thesys
                for msg in result['messages'][-5:]:  # Last 5 messages for context
                    if hasattr(msg, 'content'):
                        # Determine role based on message type
                        if hasattr(msg, '__class__'):
                            role = "user" if msg.__class__.__name__ == "HumanMessage" else "assistant"
                        else:
                            role = "assistant"  # Default to assistant
                        conversation_history.append({
                            "role": role,
                            "content": msg.content
                        })
            
            # Process through our visualization pipeline (MCP agent + conditional Thesys)
            enhancement_decision = await process_with_mcp_agent(agent_response, conversation_history)
            
            display_enhancement = enhancement_decision.displayEnhancement
            display_text = enhancement_decision.displayEnhancedText
            
            if display_enhancement:
                visualized_content = await get_thesys_visualization(agent_response, conversation_history, display_text)
            else:
                # Create simple card for non-enhanced responses
                simple_card = {
                    "component": "Card",
                    "props": {
                        "children": [
                            {
                                "component": "TextContent",
                                "props": {
                                    "textMarkdown": display_text
                                }
                            }
                        ]
                    }
                }
                visualized_content = f'{json.dumps(simple_card)}'
            
            logger.info(f"WebSocket Bridge: Received visualization from Thesys")
            
            # Note: We don't send assistant response to WebSocket queue here because
            # the C1Chat component already handles the response from this HTTP endpoint directly
            logger.info(f"WebSocket Bridge: Returning response directly to C1Chat component")
            
            # Return the response in streaming format for Thesys C1Chat
            return create_streaming_response(visualized_content)
            
        except Exception as agent_error:
            logger.error(f"WebSocket Bridge: Error processing with LangGraph agent: {agent_error}", exc_info=True)
            error_response = format_thesys_error_response(f"Agent processing error: {str(agent_error)}")
            return create_streaming_response(error_response)
        
    except Exception as e:
        logger.error(f"WebSocket Bridge Error: {e}", exc_info=True)
        error_response = format_thesys_error_response(str(e))
        return create_streaming_response(error_response)

def create_streaming_response(content: str):
    """Helper function to create streaming response for Thesys C1Chat"""
    from fastapi.responses import StreamingResponse
    
    def generate_response():
        yield content
        
    return StreamingResponse(
        generate_response(),
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
        agent = VoiceInterfaceAgent(pipecat_connection, raw_llm_output_queue, llm_message_queue) # NEW: Pass both queues
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

async def get_thesys_visualization(assistant_response: str, conversation_history: List[Dict[str, Any]] = None, enhanced_response: str = None):
    """
    Calls Thesys Visualize API to get a UI representation for the given text.
    Uses the enhanced_response from LangGraph agent if available, otherwise falls back to original assistant_response.
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

    # Use enhanced response from LangGraph agent if available, otherwise use original
    final_response = enhanced_response if enhanced_response else assistant_response
    
    # Format messages for Thesys Visualize API using the new formatting function
    messages_for_thesys = format_thesys_messages_for_visualize(final_response, conversation_history)

    try:
        print(f"Sending to Thesys Visualize API (content: {final_response[:100]}...)...")
        
        # Use the visualize endpoint format (similar to e-commerce example)
        completion = await thesys_client.chat.completions.create(
            messages=messages_for_thesys,
            model="c1-nightly",
            stream=False  # Start with non-streaming for simplicity
        )
        
        visualized_content = completion.choices[0].message.content
        print(f"Received visualization from Thesys Visualize API: {visualized_content}")
        
        # Return the content directly as it should already be in the proper format
        return visualized_content

    except Exception as e:
        logger.error(f"Error calling Thesys Visualize API: {e}", exc_info=True)
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
    Processes raw LLM output from VOICE INTERFACE through MCP agent, conditionally gets visualization from Thesys, and sends to frontend queue.
    Note: This is only for voice messages. Chat messages are handled directly through the /api/websocket-bridge endpoint.
    """
    logger.info("Visualization processor task started for VOICE messages (MCP Agent -> Conditional Thesys Visualize flow).")
    while True:
        try:
            logger.info("Visualization processor (VOICE): Waiting for item from raw_llm_output_queue...")
            item = await raw_llm_output_queue.get()
            logger.info(f"Visualization processor (VOICE): Received item from raw_llm_output_queue: {item}")
            print(f"Visualization processor (VOICE): Received item from raw_llm_output_queue: {item}")
            
            conversation_history: List[Dict[str, Any]] = item.get("history", [])
            assistant_response: str | None = item.get("assistant_response")
            
            logger.info(f"Visualization processor (VOICE): Extracted assistant_response: '{assistant_response}'")
            logger.info(f"Visualization processor (VOICE): Extracted conversation_history: {conversation_history}")
            
            if not assistant_response:
                logger.warning("Visualization processor (VOICE) received empty assistant response.")
                continue
                
            logger.info(f"Visualization processor (VOICE): Original voice response length: {len(assistant_response)} chars")
            logger.info(f"Visualization processor (VOICE): Processing assistant response through MCP agent...")
            
            # Step 1: Process through MCP agent to determine if enhancement is needed
            try:
                logger.info(f"Visualization processor (VOICE): About to call process_with_mcp_agent with response: '{assistant_response[:100]}...'")
                print(f"Visualization processor (VOICE): About to call process_with_mcp_agent with response: '{assistant_response[:100]}...'")
                
                enhancement_decision = await process_with_mcp_agent(assistant_response, conversation_history)
                
                logger.info(f"Visualization processor (VOICE): MCP agent call completed successfully with decision: {enhancement_decision}")
                print(f"Visualization processor (VOICE): MCP agent call completed successfully with decision: {enhancement_decision}")
            except Exception as e:
                logger.error(f"Visualization processor (VOICE): Error in MCP agent call: {e}", exc_info=True)
                print(f"Visualization processor (VOICE): Error in MCP agent call: {e}")
                # Fallback decision
                enhancement_decision = EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText=assistant_response,
                    voiceOverText=assistant_response
                )
                logger.info(f"Visualization processor (VOICE): Using fallback decision: {enhancement_decision}")
            
            display_enhancement = enhancement_decision.displayEnhancement
            display_text = enhancement_decision.displayEnhancedText
            voice_text = enhancement_decision.voiceOverText #IDEALLY VOICE OVER TEXT SHOULD BE THERE ONLY IF WE CALL A FUNCTION
            
            logger.info(f"Visualization processor (VOICE): MCP Agent decision - Enhancement: {display_enhancement}, DisplayText: '{display_text}', VoiceText: '{voice_text}'")
            print(f"Visualization processor (VOICE): MCP Agent decision - Enhancement: {display_enhancement}")
            
            # Step 2: Conditionally process with Thesys or create simple card
            if display_enhancement:
                logger.info(f"Visualization processor (VOICE): Enhancement requested, sending to Thesys Visualize API...")
                print(f"Visualization processor (VOICE): Enhancement requested, sending to Thesys Visualize API...")
                # Send enhanced response to Thesys Visualize API
                visualized_ui_payload = await get_thesys_visualization(
                    assistant_response, 
                    conversation_history, 
                    display_text
                )
                logger.info(f"Visualization processor (VOICE): Received UI payload from Thesys, length: {len(str(visualized_ui_payload))} chars")
                print(f"Visualization processor (VOICE): Received UI payload from Thesys, length: {len(str(visualized_ui_payload))} chars")
            else:
                logger.info(f"Visualization processor (VOICE): No enhancement needed, creating simple text card...")
                print(f"Visualization processor (VOICE): No enhancement needed, creating simple text card...")
                # Create a simple card with text content - using the proper Thesys format
                simple_card = {
                    "component": {
                        "component": "Card",
                        "props": {
                            "children": [
                                {
                                    "component": "TextContent",
                                    "props": {
                                        "textMarkdown": display_text
                                    }
                                }
                            ]
                        }
                    }
                }
                visualized_ui_payload = f'<content>{json.dumps(simple_card)}</content>'
                logger.info(f"Visualization processor (VOICE): Created simple card payload: '{visualized_ui_payload}'")
                print(f"Visualization processor (VOICE): Created simple card payload: '{visualized_ui_payload}'")
            
            # Step 3: Handle TTS if we have voice text
            if voice_text and voice_text != display_text:
                logger.info(f"Visualization processor (VOICE): Preparing TTS for voice text...")
                # TODO: Integrate with Pipecat TTS processor here
                # For now, we'll just log that TTS should be triggered
                logger.info(f"Visualization processor (VOICE): TTS text ready: {voice_text[:100]}...")
            
            # Step 4: Prepare message for frontend (for voice responses only)
            message_for_frontend = {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "type": "voice_response", # Mark as voice response
                "content": visualized_ui_payload, # This is the UI payload (enhanced or simple)
                "voiceText": voice_text if voice_text != display_text else None, # Include voice text if different
            }
            
            logger.info(f"Visualization processor (VOICE): Prepared message for frontend: {message_for_frontend}")
            print(f"Visualization processor (VOICE): Prepared message for frontend with ID: {message_for_frontend['id']}")
            
            await llm_message_queue.put(message_for_frontend)
            logger.info(f"Visualization processor (VOICE): Successfully sent payload to frontend queue for ID {message_for_frontend['id']}.")
            print(f"Visualization processor (VOICE): Successfully sent payload to frontend queue for ID {message_for_frontend['id']}.")

        except Exception as e:
            logger.error(f"Critical error in visualization_processor (VOICE) loop: {e}", exc_info=True)
            print(f"Critical error in visualization_processor (VOICE) loop: {e}")
            # Put an error message on llm_message_queue for the client
            await llm_message_queue.put({
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "type": "voice_response",
                "content": f'<content>{json.dumps({"component": "Callout", "props": {"variant": "warning", "title": "System Error", "description": "A system error occurred while generating UI for voice response."}})}</content>'
            })
        finally:
            logger.info("Raw LLM output queue task done (VOICE)")
            raw_llm_output_queue.task_done()

async def process_with_mcp_agent(assistant_response: str, conversation_history: List[Dict[str, Any]] = None) -> EnhancementDecision:
    """
    Process the voice assistant response using the enhanced MCP client to determine display enhancement.
    Returns a structured response indicating whether UI enhancement is needed and what content to use.
    """
    logger.info(f"=== ENTERING process_with_mcp_agent (Enhanced MCP Client) ===")
    print(f"=== ENTERING process_with_mcp_agent (Enhanced MCP Client) ===")
    logger.info(f"process_with_mcp_agent: Starting with response: {assistant_response[:100]}...")
    print(f"process_with_mcp_agent: Starting with response: {assistant_response[:100]}...")
    
    try:
        # Get the enhanced MCP client from global state
        global enhanced_mcp_client
        if not enhanced_mcp_client:
            logger.error("Enhanced MCP client not available")
            print("Enhanced MCP client not available")
            # Fallback to simple decision
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=assistant_response
            )
        
        logger.info(f"process_with_mcp_agent: Using Enhanced MCP Client with {len(enhanced_mcp_client.get_available_tools())} available tools")
        print(f"process_with_mcp_agent: Using Enhanced MCP Client with {len(enhanced_mcp_client.get_available_tools())} available tools")
        
        # Use the enhanced MCP client to make the decision
        enhancement_decision = await enhanced_mcp_client.make_enhancement_decision(
            assistant_response=assistant_response,
            conversation_history=conversation_history
        )
        
        logger.info(f"Enhanced MCP Agent decision: enhancement={enhancement_decision.displayEnhancement}")
        print(f"Enhanced MCP Agent decision: enhancement={enhancement_decision.displayEnhancement}")
        logger.info(f"Enhanced MCP Agent display text: {enhancement_decision.displayEnhancedText[:100]}...")
        print(f"Enhanced MCP Agent voice text: {enhancement_decision.voiceOverText[:100]}...")
        logger.info(f"=== EXITING process_with_mcp_agent (Enhanced MCP Client) ===")
        print(f"=== EXITING process_with_mcp_agent (Enhanced MCP Client) ===")
        
        return enhancement_decision
        
    except Exception as e:
        logger.error(f"Error in Enhanced MCP agent processing: {e}", exc_info=True)
        print(f"Error in Enhanced MCP agent processing: {e}")
        # Fallback to simple response structure
        fallback_decision = EnhancementDecision(
            displayEnhancement=False,
            displayEnhancedText=assistant_response,
            voiceOverText=assistant_response
        )
        logger.info(f"=== EXITING process_with_mcp_agent (error fallback) ===")
        print(f"=== EXITING process_with_mcp_agent (error fallback) ===")
        return fallback_decision

@app.get("/api/mcp/tools")
async def list_mcp_tools(fastapi_req: Request):
    """List all available MCP tools from the enhanced client."""
    tools_info = {
        "enhanced_client": []
    }
    
    # Get tools from enhanced client
    if fastapi_req.app.state.enhanced_mcp_client:
        try:
            enhanced_tools = fastapi_req.app.state.enhanced_mcp_client.get_available_tools()
            tools_info["enhanced_client"] = enhanced_tools
        except Exception as e:
            logger.error(f"Error getting enhanced tools: {e}")
    
    return tools_info

@app.post("/api/mcp/test-enhancement")
async def test_enhancement_decision(request: dict, fastapi_req: Request):
    """Test endpoint for the enhanced MCP decision making."""
    enhanced_client = fastapi_req.app.state.enhanced_mcp_client
    if not enhanced_client:
        raise HTTPException(status_code=500, detail="Enhanced MCP Client not initialized.")
    
    assistant_response = request.get("assistant_response", "")
    conversation_history = request.get("conversation_history", [])
    
    if not assistant_response:
        raise HTTPException(status_code=400, detail="assistant_response is required")
    
    try:
        logger.info(f"Testing enhancement decision for: {assistant_response[:100]}...")
        
        # Use the enhanced MCP client to make the decision
        decision = await enhanced_client.make_enhancement_decision(
            assistant_response=assistant_response,
            conversation_history=conversation_history
        )
        
        return {
            "original_response": assistant_response,
            "decision": {
                "displayEnhancement": decision.displayEnhancement,
                "displayEnhancedText": decision.displayEnhancedText,
                "voiceOverText": decision.voiceOverText
            },
            "available_tools": enhanced_client.get_available_tools()
        }
        
    except Exception as e:
        logger.error(f"Error testing enhancement decision: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error testing enhancement: {str(e)}")

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