# LangGraph MCP Integration Backend

This backend demonstrates how to use LangGraph with MCP (Model Context Protocol) integration for building agent systems with tools provided by MCP servers.

## Features

- FastAPI backend integrated with LangGraph's prebuilt ReAct agent
- MCP tools for various utilities (time, knowledge base search, calculations)
- SQLite persistence for conversation history
- Async support for efficient handling of requests
- **Voice Interface Agent with Enhanced Visualization Pipeline**
- **LangGraph-Enhanced Thesys Visualization Integration**

## Voice Agent Enhanced Visualization Flow

The voice agent now includes an enhanced visualization pipeline:

1. **Voice Input** → Deepgram STT → OpenAI LLM → Cartesia TTS → **Voice Output**
2. **Parallel Processing**: Voice Response → **LangGraph Agent Enhancement** → **Thesys Visualize API** → **WebSocket Display**

### Data Flow Steps:

1. **Voice Pipeline**: User speaks → Deepgram STT → OpenAI LLM → Cartesia TTS
2. **Response Capture**: `ResponseAggregatorProcessor` captures complete LLM response
3. **Queue Processing**: Voice response + conversation history → `raw_llm_output_queue`
4. **LangGraph Enhancement**: Background processor routes through LangGraph agent for response enhancement
5. **Thesys Visualization**: Enhanced response → Thesys Visualize API → UI components
6. **Frontend Display**: UI components → `llm_message_queue` → WebSocket → Frontend

### Key Components:

- **VoiceInterfaceAgent**: Handles real-time voice conversations
- **ResponseAggregatorProcessor**: Captures and processes LLM responses
- **visualization_processor()**: Background task that orchestrates the enhancement and visualization pipeline
- **process_with_mcp_agent()**: Routes voice responses through OpenAI structured output to determine display enhancement
- **get_thesys_visualization()**: Calls Thesys Visualize API for UI generation

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
   THESYS_API_KEY=your-thesys-api-key-here  # Required for visualization
   DEEPGRAM_API_KEY=your-deepgram-key-here  # Required for voice STT
   CARTESIA_API_KEY=your-cartesia-key-here  # Required for voice TTS
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
- `POST /agent`: Send a message to the enhanced LangGraph agent
  - Request body: `{"message": "Your message here", "thread_id": "optional-thread-id"}`
  - Response: `{"response": "Agent's response", "thread_id": "thread-id", "history": ["Message history"]}`
- `POST /api/offer`: WebRTC connection setup for voice interface
- `GET /ws/messages`: WebSocket endpoint for real-time UI updates

## Voice Interface

The voice interface is accessible through WebRTC at `/prebuilt`. It provides:

- Real-time speech-to-text using Deepgram
- LLM processing with OpenAI GPT models  
- Text-to-speech using Cartesia
- Enhanced visualization through LangGraph + Thesys integration

## MCP Server Structure

The utilities MCP server provides tools for:
- Getting the current time
- Searching a knowledge base
- Performing safe calculations

You can add more MCP servers by:

1. Creating a new implementation in the `mcp_servers/` directory
2. Adding the configuration to the `MCP_SERVERS` dictionary in `main.py`

## Using with Different Models

The backend is configured to use OpenAI's gpt-4o-mini by default, but you can modify it to use other models:

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
- For voice interface issues, verify WebRTC permissions in your browser
- Monitor the logs for the visualization pipeline flow: Voice → LangGraph → Thesys → Frontend 