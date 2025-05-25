# Prompts Directory

This directory contains all the prompt templates used by various agents and components in the Ada backend system.

## Voice Agent Prompts

### `voice_agent_system.txt`
System prompt for the voice-based interaction agent. This prompt:
- Defines Ada as a helpful voice assistant
- Emphasizes natural speech interaction patterns
- Provides guidelines for concise, conversational responses
- Ensures responses are optimized for text-to-speech output

**Usage:** Loaded by `VoiceInterfaceAgent` to set the system context for voice conversations.

## Thesys Agent Prompts

### `thesys_agent_system.txt`
System prompt for the Thesys UI generation agent. This prompt:
- Defines the role as a UI generation assistant
- Provides guidelines for creating visual representations of voice conversations
- Specifies when and how to enhance voice responses with visual elements
- Ensures consistency between audio and visual presentations

### `thesys_agent_assistant.txt`
Template for formatting assistant messages to the Thesys API. This template:
- Structures the user query and voice bot response
- Provides context for UI generation decisions
- Offers options for different types of visual presentations
- Guides the creation of appropriate UI components

**Usage:** Used by `format_thesys_messages()` in `utils/thesys_prompts.py` to format messages for the Thesys API.

## Legacy Agent Prompts

### `analyzer.txt`
Prompt for the analyzer component in the autonomous agent system.

### `evaluator.txt`
Prompt for the evaluator component that assesses task completion.

### `orchestrator_prompt.txt` & `orchestrator_react_prompt.txt`
Prompts for the orchestrator agent that coordinates between different components.

### `planner.txt` & `planner_prompt.txt`
Prompts for the planner component that breaks down complex tasks.

### `system_base.txt`
Base system prompt that defines the core agent behavior and principles.

### `mcp.txt`
Prompt for MCP (Model Context Protocol) interactions.

## Prompt Loading

Prompts are loaded using utility functions:

- **Voice Agent**: `load_voice_agent_prompt()` in `voice_based_interaction_agent.py`
- **Thesys Agent**: `load_thesys_prompt()` in `utils/thesys_prompts.py`
- **Other Agents**: `load_prompt()` in `src/utils/prompt_loader.py`

## Best Practices

1. **Modularity**: Each agent type has its own prompt files
2. **Fallbacks**: Prompt loaders include fallback text if files are missing
3. **Templates**: Use placeholder variables (e.g., `{user_query}`, `{voice_bot_response}`) for dynamic content
4. **Clarity**: Prompts are written to be clear and specific about expected behavior
5. **Consistency**: Related prompts maintain consistent tone and style 