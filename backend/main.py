# .env should include:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-... (if using Anthropic models)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
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

config = {}
config_b64 = base64.b64encode(json.dumps(config).encode())
# Load API keys and model name from environment variables
smithery_api_key = os.environ.get("SMITHERY_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
AGENT_MODEL = os.environ.get("AGENT_MODEL", "gpt-4o-mini")

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

# Create our application lifespan context manager to manage MCP client
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create MCP client on startup
    app.mcp_client = MultiServerMCPClient(MCP_SERVERS)
    await app.mcp_client.__aenter__()
    
    yield
    
    # Close MCP client on shutdown
    await app.mcp_client.__aexit__(None, None, None)

app = FastAPI(lifespan=lifespan)

class ChatRequest(BaseModel):
    thread_id: str
    message: str

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