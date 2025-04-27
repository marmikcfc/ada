# LangGraph MCP Integration Backend

This backend demonstrates how to use LangGraph with MCP (Model Context Protocol) integration for building agent systems with tools provided by MCP servers.

## Features

- FastAPI backend integrated with LangGraph's prebuilt ReAct agent
- MCP tools for various utilities (time, knowledge base search, calculations)
- SQLite persistence for conversation history
- Async support for efficient handling of requests

## Prerequisites

- Python 3.8+
- Poetry (for dependency management)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend
   poetry install
   ```
3. Create a `.env` file with your API keys and configuration:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-...  # Optional, only if using Claude models
   SMITHERY_API_KEY=your-smithery-key-here
   AGENT_MODEL=gpt-4o-mini  # Or any supported model name
   SQLITE_DB_PATH=chat_history_new.db  # Optional, default is chat_history_new.db
   ```

4. Create or edit the `mcp_servers.json` file in the backend directory to configure your MCP servers. Example:
   ```json
   {
     "utilities": {
       "command": "python",
       "args": ["mcp_servers/utilities_server.py"],
       "transport": "stdio"
     },
     "weather": {
       "url": "wss://server.smithery.ai/@turkyden/weather/ws?config={config_b64}&api_key={smithery_api_key}",
       "transport": "websocket"
     }
   }
   ```
   - You can use `{config_b64}` and `{smithery_api_key}` as placeholders in the config, which will be replaced at runtime.

## Running the server

```bash
poetry run uvicorn main:app --reload
```

The server will be available at http://localhost:8000

## Endpoints

- `GET /`: Simple health check
- `POST /chat`: Send a message to the agent
  - Request body: `{"thread_id": "unique-thread-id", "message": "Your message here"}`
  - Response: `{"response": "Agent's response", "history": ["Message history"]}`

## MCP Server Structure

The utilities MCP server provides tools for:
- Getting the current time
- Searching a knowledge base
- Performing safe calculations

You can add more MCP servers by:

1. Creating a new implementation in the `mcp_servers/` directory
2. Adding the configuration to the `MCP_SERVERS` dictionary in `main.py`

## Using with Different Models

The backend is configured to use OpenAI's gpt-3.5-turbo by default, but you can modify it to use other models:

```python
agent = create_react_agent(
    "anthropic:claude-3-7-sonnet-latest", # Use Claude instead of GPT
    tools
)
```

## Troubleshooting

- If the MCP server fails to start, check the console output for errors
- Ensure all API keys are properly set in the `.env` file
- Check that the paths to MCP server implementations are correct 