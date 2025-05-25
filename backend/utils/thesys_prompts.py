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
            return "This is what user is talking about and this is voice bot speaking. Please create a response to user query in line with the bot answer for display. If there's no expansion needed simply respond bot's answer."
        elif prompt_name == "thesys_agent_assistant":
            return "For given user query {user_query}, this is what a voice bot answered: {voice_bot_response}. Now create a response to user query in line with the bot answer for display."
        else:
            return f"Prompt '{prompt_name}' not found."

def format_thesys_messages(assistant_response: str, conversation_history: List[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """Format messages for Thesys API using prompt templates."""
    system_prompt = load_thesys_prompt("thesys_agent_system")
    assistant_template = load_thesys_prompt("thesys_agent_assistant")
    
    messages_for_thesys = [{"role": "system", "content": system_prompt}]
    
    if conversation_history:
        # Add conversation history (excluding the last message which we'll format specially)
        messages_for_thesys.extend(conversation_history[:-1])
        
        # Format the final assistant message using the template
        user_query = conversation_history[-1]['content'] if conversation_history else "Unknown query"
        final_assistant_content = assistant_template.format(
            user_query=user_query,
            voice_bot_response=assistant_response
        )
        messages_for_thesys.append({"role": "assistant", "content": final_assistant_content})
    
    return messages_for_thesys 