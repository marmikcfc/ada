# Enhanced MCP Client

This enhanced MCP client has **replaced** the legacy MCP client and is now the primary MCP client for the application. It supports multiple transport types and external JSON configuration, making it easy to connect to various MCP servers including HTTP-based ones.

## Features

- **Multiple Transport Support**: HTTP, WebSocket, and STDIO transports
- **External Configuration**: JSON-based configuration with environment variable support
- **OpenAI Integration**: Built-in OpenAI client with function calling
- **Tool Discovery**: Automatic discovery and registration of MCP tools
- **Error Handling**: Robust error handling and fallback mechanisms
- **LangGraph Integration**: Compatible with existing LangGraph workflows

## Configuration

The client uses a JSON configuration file (`mcp_servers.json`) with the following structure:

```json
{
    "config": {
        "model": "gpt-4o-mini",
        "openai_api_key_env": "OPENAI_API_KEY"
    },
    "servers": {
        "calculator_http": {
            "url": "http://localhost:3001/mcp",
            "transport": "http",
            "description": "HTTP-based calculator MCP server"
        },
        "weather": {
            "url": "wss://server.smithery.ai/@turkyden/weather/ws",
            "transport": "websocket"
        },
        "utilities": {
            "command": "python",
            "args": ["mcp_servers/utilities_server.py"],
            "transport": "stdio"
        }
    }
}
```

### Configuration Options

- **config.model**: OpenAI model to use (default: "gpt-4o-mini")
- **config.openai_api_key_env**: Environment variable containing OpenAI API key
- **servers**: Dictionary of MCP server configurations

### Server Configuration

Each server can have:
- **url**: Server URL (for HTTP/WebSocket)
- **transport**: Transport type ("http", "websocket", "stdio")
- **description**: Optional description
- **command**: Command to run (for STDIO)
- **args**: Arguments for command (for STDIO)

## Usage

### Integration with FastAPI

The enhanced client is now the primary MCP client in the FastAPI application:

```python
# Main agent endpoint now uses enhanced client
@app.post("/agent")
async def agent_endpoint(agent_request: AgentRequest, fastapi_req: Request):
    # Uses enhanced_mcp_client through LangGraph integration
    pass

# List available tools from enhanced client
@app.get("/api/mcp/tools")
async def list_mcp_tools(fastapi_req: Request):
    # Returns tools from enhanced client only
    pass
```

### Standalone Usage

```python
from src.mcp.enhanced_mcp_client import EnhancedMCPClient

# Initialize client
client = EnhancedMCPClient("mcp_servers.json")
await client.initialize()

# Chat with tools
response = await client.chat_with_tools("What is 2 + 3?")
print(response)

# Get available tools
tools = client.get_available_tools()
print(f"Available tools: {tools}")

# Get tools for LangGraph integration
langgraph_tools = client.get_tools()

# Clean up
await client.close()
```

## API Endpoints

### `/agent` (POST)
**Primary agent endpoint** - now uses the enhanced MCP client for processing requests with tool support through LangGraph.

**Request:**
```json
{
    "message": "What is 15 * 7?",
    "thread_id": "optional-thread-id"
}
```

**Response:**
```json
{
    "response": "The product of 15 and 7 is 105",
    "thread_id": "thread-id",
    "history": ["What is 15 * 7?", "The product of 15 and 7 is 105"]
}
```

### `/api/mcp/tools` (GET)
Lists all available tools from the enhanced MCP client.

**Response:**
```json
{
    "enhanced_client": [
        "calculator_http:add",
        "calculator_http:multiply",
        "weather:get_weather"
    ]
}
```

## Migration from Legacy Client

The enhanced MCP client has **completely replaced** the legacy `MultiServerMCPClient`. Key changes:

1. **Configuration**: Now uses structured JSON with `config` and `servers` sections
2. **HTTP Support**: Native support for HTTP-based MCP servers
3. **Tool Format**: Compatible with existing LangGraph workflows
4. **Error Handling**: Improved error handling and fallback mechanisms
5. **Lifecycle Management**: Proper initialization and cleanup

### Breaking Changes

- `mcp_servers.json` format has changed (see Configuration section)
- Legacy `MultiServerMCPClient` is no longer used
- Tool names now include server prefix (e.g., `calculator_http:add`)

## Testing with Example Server

1. Start the example HTTP MCP server:
```bash
cd backend/examples
python simple_http_mcp_server.py
```

2. The server will run on `http://localhost:3001` and provide calculator tools.

3. Test with the main agent endpoint:
```bash
curl -X POST "http://localhost:8000/agent" \
     -H "Content-Type: application/json" \
     -d '{"message": "What is 25 + 17?"}'
```

## Transport Types

### HTTP Transport
- Uses `streamablehttp_client` from MCP library
- Suitable for stateless MCP servers
- Easy to deploy and scale
- **Currently implemented and tested**

### WebSocket Transport
- Real-time bidirectional communication
- Good for interactive tools
- Maintains persistent connections
- **Placeholder for future implementation**

### STDIO Transport
- Communicates with local processes
- Good for local tools and utilities
- Uses stdin/stdout for communication
- **Placeholder for future implementation**

## Error Handling

The client includes comprehensive error handling:

- **Connection Failures**: Continues with other servers if one fails
- **Tool Errors**: Returns error messages instead of crashing
- **Configuration Errors**: Clear error messages for invalid configs
- **API Errors**: Fallback responses for OpenAI API issues
- **LangGraph Integration**: Graceful handling of tool call failures

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional environment variables:
- `SMITHERY_API_KEY`: For Smithery-based MCP servers
- Any other API keys referenced in server configurations

## Architecture

```
FastAPI Application
├── Enhanced MCP Client (Primary)
│   ├── HTTP Transport ✅
│   ├── WebSocket Transport (Planned)
│   └── STDIO Transport (Planned)
├── LangGraph Integration
│   ├── Tool Discovery
│   ├── Function Calling
│   └── Conversation Management
└── OpenAI Integration
    ├── Structured Output
    ├── Function Calling
    └── Model Configuration
``` 