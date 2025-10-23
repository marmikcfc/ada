# OpenAI Responses API Integration

## Overview

The Enhanced MCP Client now supports the **OpenAI Responses API** for more powerful and flexible AI interactions. This enables the use of stored prompts from OpenAI, providing better prompt management and versioning.

## Key Features

✅ **Stored Prompts**: Use prompts stored on OpenAI with versioning support
✅ **Streaming Support**: Real-time streaming of responses with `chat_with_tools_streaming()`
✅ **Simplified API**: Clean interface without MCP tool complexity
✅ **Backward Compatible**: Existing code continues to work seamlessly

## Configuration

### Basic Setup

Add `prompt_id` and `prompt_version` to your `mcp_servers.json` config file:

```json
{
  "config": {
    "model": "gpt-4o",
    "openai_api_key_env": "OPENAI_API_KEY",
    "prompt_id": "pmpt_68f9f4d28324819788cf1ef3a781e9130ce3283c92c4c7ee",
    "prompt_version": "1"
  },
  "servers": {
    // Your MCP servers configuration
  }
}
```

### Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | OpenAI model to use (e.g., "gpt-4o", "gpt-4o-mini") |
| `openai_api_key_env` | string | Yes | Environment variable containing OpenAI API key |
| `prompt_id` | string | No | OpenAI stored prompt ID (format: `pmpt_...`) |
| `prompt_version` | string | No | Prompt version (default: "1") |

## Usage

### Non-Streaming

```python
from agent.enhanced_mcp_client_agent import EnhancedMCPClient

# Initialize client
client = EnhancedMCPClient(config_path="mcp_servers.json")
await client.initialize()

# Use with stored prompt (configured in JSON)
response = await client.chat_with_tools(
    user_message="What's the weather in San Francisco?",
    conversation_history=[]
)
print(response)
```

### Streaming

```python
async def on_text_chunk(text: str):
    """Callback for streaming text chunks"""
    print(text, end="", flush=True)

# Stream responses in real-time
response = await client.chat_with_tools_streaming(
    user_message="Tell me a story about AI",
    conversation_history=[],
    text_callback=on_text_chunk
)
```

## How It Works

### Request Flow

1. **Input Preparation**: User message and conversation history are formatted as input items
2. **Prompt Loading**: If configured, the stored prompt is used via `prompt.id` and `prompt.version`
3. **Streaming**: Response is streamed with event-based processing
4. **Response Completion**: Final response is assembled and returned

### Event Types Handled

| Event Type | Description |
|------------|-------------|
| `response.output_text.delta` | Text chunk for streaming |
| `response.output_text.done` | Text output completed |
| `response.done` | Response completed successfully |
| `error` | Error occurred during processing |

## API Changes

### Old (Chat Completions API)

```python
# Used messages array
messages = [{"role": "user", "content": "Hello"}]

response = await openai_client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    functions=functions
)
```

### New (Responses API)

```python
# Uses input items array with stored prompt
input_items = [{
    "type": "message",
    "role": "user",
    "content": [{"type": "input_text", "text": "Hello"}]
}]

response = await openai_client.responses.create(
    model="gpt-4o",
    input=input_items,
    prompt={"id": "pmpt_...", "version": "1"}
)
```

## Advanced Features

### Stored Prompts

Store your prompts on OpenAI and reference them by ID:

1. **Create a prompt** on OpenAI platform
2. **Copy the prompt ID** (format: `pmpt_...`)
3. **Add to config**:
   ```json
   {
     "config": {
       "prompt_id": "pmpt_68f9f4d28324819788cf1ef3a781e9130ce3283c92c4c7ee",
       "prompt_version": "1"
     }
   }
   ```

### Benefits of Stored Prompts

- **Version Control**: Track prompt changes across versions
- **Easy Updates**: Update prompts without code changes
- **Collaboration**: Share prompts across team members
- **A/B Testing**: Test different prompt versions

## Migration Guide

### From Chat Completions to Responses API

If you have existing code using the old `chat_with_tools` method, **no changes are needed**! The method signature remains the same:

```python
# This code works unchanged
response = await client.chat_with_tools(
    user_message="Hello",
    conversation_history=previous_messages
)
```

### Adding Stored Prompts

To use stored prompts, simply add the configuration:

1. Update `mcp_servers.json`:
   ```json
   {
     "config": {
       "prompt_id": "pmpt_YOUR_PROMPT_ID",
       "prompt_version": "1"
     }
   }
   ```

2. The next call will automatically use the stored prompt

### Enabling Streaming

To enable streaming, switch to the streaming method:

```python
# Before (non-streaming)
response = await client.chat_with_tools(user_message="Hello")

# After (streaming)
response = await client.chat_with_tools_streaming(
    user_message="Hello",
    text_callback=lambda text: print(text, end="")
)
```

## Troubleshooting

### "Response completed with status: incomplete"

**Cause**: Request timed out or was cancelled
**Solution**: Check your prompt complexity and input length

### "Error: No prompt_id configured"

**Cause**: Missing prompt_id in configuration
**Solution**: Add `prompt_id` and `prompt_version` to your `mcp_servers.json` config file

### Streaming Not Working

**Cause**: Not using the streaming method or callback not provided
**Solution**:
1. Use `chat_with_tools_streaming()` instead of `chat_with_tools()`
2. Provide a `text_callback` function
3. Check that the callback is async: `async def callback(text: str): ...`

## Best Practices

### 1. Use Stored Prompts for Production

```json
{
  "config": {
    "prompt_id": "pmpt_production_prompt",
    "prompt_version": "2"
  }
}
```

### 2. Always Implement Text Callbacks for Streaming

```python
async def handle_text(text: str):
    # Send to WebSocket, update UI, etc.
    await websocket.send_json({"type": "text", "content": text})

await client.chat_with_tools_streaming(
    user_message="Hello",
    text_callback=handle_text
)
```

### 3. Handle Errors Gracefully

```python
try:
    response = await client.chat_with_tools(user_message)
    if "Error:" in response:
        # Handle API errors
        logger.error(f"API error: {response}")
except Exception as e:
    logger.error(f"Request failed: {e}")
```

### 4. Version Your Prompts

Maintain different versions for testing and production:

```json
{
  "config": {
    "prompt_id": "pmpt_production_v2",
    "prompt_version": "2"  // Increment when testing new prompts
  }
}
```

## Examples

### Example 1: Simple Chat

```python
client = EnhancedMCPClient("mcp_servers.json")
await client.initialize()

response = await client.chat_with_tools(
    user_message="What's 2+2?",
    conversation_history=[]
)
print(response)  # "2+2 equals 4"
```

### Example 2: Chat with Context

```python
history = [
    {"role": "user", "content": "My name is Alice"},
    {"role": "assistant", "content": "Nice to meet you, Alice!"}
]

response = await client.chat_with_tools(
    user_message="What's my name?",
    conversation_history=history
)
print(response)  # "Your name is Alice"
```

### Example 3: Streaming Long Responses

```python
collected_text = []

async def collect_text(text: str):
    collected_text.append(text)
    print(text, end="", flush=True)

response = await client.chat_with_tools_streaming(
    user_message="Write a detailed essay about artificial intelligence",
    text_callback=collect_text
)

# Streams response in real-time
# Perfect for long-form content
```

## Related Documentation

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Stored Prompts Guide](https://platform.openai.com/docs/guides/prompt-management)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

## Support

For issues or questions:
1. Check logs: `logger.error` messages in console
2. Verify config: `mcp_servers.json` format
3. Test connections: `await client.initialize()` without errors
4. Review this documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-01-20
