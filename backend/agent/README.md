# Agent Directory

This directory contains the various agent implementations for the Ada backend system.

## Agents

### Voice-Based Interaction Agent (`voice_based_interaction_agent.py`)

The `VoiceInterfaceAgent` handles real-time voice conversations using WebRTC and various AI services.

**Features:**
- Real-time speech-to-text using Deepgram
- LLM processing with OpenAI GPT models
- Text-to-speech using Cartesia
- WebRTC transport for browser-based voice interaction
- Integration with Thesys for visual UI generation

**Key Components:**
- `VoiceInterfaceAgent`: Main agent class that orchestrates the voice pipeline
- `ResponseAggregatorProcessor`: Processes LLM responses and sends them to the visualization system
- `load_voice_agent_prompt()`: Loads system prompts from the prompts directory

**Usage:**
```python
from agent.voice_based_interaction_agent import VoiceInterfaceAgent

# Create agent instance
agent = VoiceInterfaceAgent(webrtc_connection, raw_llm_output_queue)

# Run the agent
await agent.run()
```

### Other Agents

- `orchestrator.py`: Orchestrates between different agent components
- `planner.py`: Handles task planning and decomposition

## Prompts

The agents use prompts stored in the `../prompts/` directory:

- `voice_agent_system.txt`: System prompt for the voice assistant
- `thesys_agent_system.txt`: System prompt for the Thesys UI generation
- `thesys_agent_assistant.txt`: Template for Thesys assistant messages

## Integration

The voice agent integrates with:
- **Pipecat**: For real-time audio processing pipeline
- **WebRTC**: For browser-based voice communication
- **Thesys**: For generating visual UI representations of conversations
- **OpenAI**: For language model processing
- **Deepgram**: For speech-to-text conversion
- **Cartesia**: For text-to-speech synthesis

## Configuration

Required environment variables:
- `OPENAI_API_KEY`: OpenAI API key for LLM processing
- `DEEPGRAM_API_KEY`: Deepgram API key for speech-to-text
- `CARTESIA_API_KEY`: Cartesia API key for text-to-speech
- `THESYS_API_KEY`: Thesys API key for UI generation 