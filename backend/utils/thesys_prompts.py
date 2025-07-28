import os
from typing import Dict, Any, List

def load_thesys_prompt(prompt_name: str) -> str:
    """Load a Thesys prompt from the prompts directory by name (without .txt)."""
    prompt_path = os.path.join(os.path.dirname(__file__), '../prompts', f'{prompt_name}.txt')
    try:
        with open(prompt_path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Return a fallback prompt if file not found
        if prompt_name == "thesys_agent_system":
            return "You are a UI generation assistant. Convert text responses into appropriate visual components for display."
        elif prompt_name == "thesys_agent_assistant":
            return "Convert the following response into appropriate UI components: {response}"
        else:
            return f"Prompt '{prompt_name}' not found."

def format_thesys_messages_for_visualize(enhanced_response: str, conversation_history: List[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """
    Format messages for Thesys Visualize API.
    This follows the pattern from the e-commerce example where we send the conversation history
    plus the final assistant message that we want to visualize.
    """
    messages_for_thesys = []
    
    # Add system prompt for UI generation
    try:
        system_prompt_path = os.path.join(os.path.dirname(__file__), '../prompts', 'thesys_visualize_system.txt')
        with open(system_prompt_path, 'r') as f:
            system_prompt = f.read().strip()
    except FileNotFoundError:
        # Fallback system prompt
        system_prompt = "You are a UI generation assistant. Convert voice assistant responses into appropriate visual components for web display. Use Cards, Callouts, and TextContent components as needed."
    
    messages_for_thesys.append({
        "role": "system",
        "content": system_prompt
    })
    
    # Add conversation history if available (excluding system messages for cleaner context)
    if conversation_history:
        for msg in conversation_history:
            if msg.get("role") in ["user", "assistant"]:
                messages_for_thesys.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
    
    # Add the enhanced response as the final assistant message to visualize
    messages_for_thesys.append({
        "role": "assistant", 
        "content": enhanced_response
    })
    
    return messages_for_thesys