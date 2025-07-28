# GenUI Backend

FastAPI backend server for the GenUI SDK, providing WebRTC voice capabilities, WebSocket messaging, and AI-powered visualization generation.

## Features

- **Per-Connection Architecture** - Isolated processing for each WebSocket connection
- **Voice Processing** - WebRTC integration with Pipecat for real-time voice interactions
- **AI Visualization** - Multiple providers (OpenAI, Anthropic, TheSys) for generating rich UI components
- **MCP Integration** - Model Context Protocol for tool-enhanced AI responses
- **Multi-Framework Support** - Generate HTML for Tailwind, Chakra UI, Material UI, and more
- **Real-time Streaming** - Live streaming of AI responses with incremental updates

## Architecture

### Core Components

- **Connection Manager** (`app/connection_manager.py`) - WebSocket connection lifecycle management
- **Connection Processor** (`app/connection_processor.py`) - Per-connection message processing and AI enhancement
- **Voice Manager** (`app/voice_manager.py`) - WebRTC voice session management
- **Visualization Providers** (`app/viz_provider_factory.py`) - AI providers for UI generation
- **MCP Clients** - Tool integration for enhanced AI capabilities

### Message Flow

1. **WebSocket Connection** → Connection Manager creates isolated context
2. **User Message** → Connection Processor handles enhancement decision
3. **AI Processing** → MCP tools + Visualization providers generate rich responses
4. **Streaming Response** → Real-time delivery to frontend via WebSocket
5. **Voice Integration** → WebRTC for voice input/output with TTS injection

## Quick Start

### Prerequisites

- Python 3.9+
- Poetry (recommended) or pip

### Installation

```bash
# Clone and navigate to backend
cd backend

# Install dependencies with Poetry
poetry install

# Or with pip
pip install -e .
```

### Environment Setup

Create `.env` file:

```bash
# AI Provider Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
THESYS_API_KEY=your_thesys_key

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=true

# Voice Configuration
VOICE_ENABLED=true
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302
```

### Running the Server

```bash
# Development mode with auto-reload
poetry run python main.py

# Or with uvicorn directly
poetry run uvicorn app.server:app --reload --host 0.0.0.0 --port 8000

# Production mode
poetry run uvicorn app.server:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### WebSocket Endpoints

- **`/ws/per-connection-messages`** - Main WebSocket for chat and streaming responses
- **`/voice/{connection_id}`** - WebRTC voice session endpoint

### HTTP Endpoints

- **`POST /api/offer`** - WebRTC offer/answer exchange
- **`GET /health`** - Health check endpoint
- **`GET /connections/stats`** - Connection statistics (if enabled)

## Configuration

### Visualization Providers

Configure AI providers in your application:

```python
# OpenAI Provider (HTML generation)
{
    "provider_type": "openai",
    "model": "gpt-4o-mini",
    "api_key_env": "OPENAI_API_KEY"
}

# TheSys Provider (C1 Components)
{
    "provider_type": "thesys", 
    "model": "c1-nightly",
    "api_key_env": "THESYS_API_KEY",
    "base_url": "https://api.thesys.dev/v1/visualize"
}
```

### MCP Server Configuration

Configure MCP servers in `mcp_servers.json`:

```json
{
  "config": {
    "model": "gpt-4",
    "openai_api_key_env": "OPENAI_API_KEY"
  },
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    }
  }
}
```

## Message Types

### Incoming Messages

- **`chat`** - Text message from user
- **`client_config`** - UI framework preference
- **`user_interaction`** - Form/button interactions

### Outgoing Messages

- **`text_chat_response`** - Complete text/HTML response
- **`c1_token`** - Streaming C1 component content
- **`html_token`** - Streaming HTML content
- **`chat_done`** - End of stream marker
- **`voice_response`** - Voice TTS content
- **`user_transcription`** - Voice-to-text transcript

## Development

### Project Structure

```
backend/
├── app/
│   ├── server.py              # FastAPI application
│   ├── connection_manager.py  # WebSocket management
│   ├── connection_processor.py # Per-connection processing
│   ├── voice_manager.py       # Voice/WebRTC management
│   ├── viz_provider_factory.py # AI visualization providers
│   └── models.py              # Data models
├── utils/
│   ├── html_templates.py      # Framework-specific HTML generation
│   ├── prompt_manager.py      # AI prompt management
│   └── thesys_prompts.py      # TheSys-specific prompts
├── schemas/                   # Pydantic schemas
├── main.py                    # Application entry point
└── pyproject.toml            # Dependencies and configuration
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app

# Run specific test file
poetry run pytest tests/test_connection_processor.py
```

### Code Formatting

```bash
# Format code with black
poetry run black .

# Sort imports with isort
poetry run isort .

# Run linting
poetry run flake8 app/ utils/

# Type checking
poetry run mypy app/ utils/
```

## Deployment

### Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry install --no-dev

COPY . .
EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

- **`OPENAI_API_KEY`** - OpenAI API key for GPT models
- **`ANTHROPIC_API_KEY`** - Anthropic API key for Claude models  
- **`THESYS_API_KEY`** - TheSys API key for C1 components
- **`BACKEND_HOST`** - Server host (default: 0.0.0.0)
- **`BACKEND_PORT`** - Server port (default: 8000)
- **`DEBUG`** - Enable debug mode (default: false)
- **`VOICE_ENABLED`** - Enable voice features (default: true)

## Troubleshooting

### Common Issues

1. **WebRTC not connecting**
   - Ensure HTTPS is used (required for getUserMedia)
   - Check STUN server configuration
   - Verify firewall settings for WebRTC ports

2. **AI provider errors**
   - Verify API keys are set correctly
   - Check provider-specific rate limits
   - Ensure model names are correct

3. **MCP connection failures**
   - Verify MCP server paths and permissions
   - Check mcp_servers.json configuration
   - Ensure required dependencies are installed

### Logging

The server uses structured logging with Loguru. Key log categories:

- **`connection_manager`** - WebSocket connection events
- **`connection_processor`** - Message processing and AI enhancement
- **`voice_manager`** - Voice session management
- **`viz_provider`** - AI visualization generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run formatting and linting
5. Submit a pull request

## License

[Your License Here] 