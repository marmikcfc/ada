import os

def load_prompt(prompt_name: str) -> str:
    """Load a prompt from the backend/prompts directory by name (without .txt)."""
    prompt_path = os.path.join(os.path.dirname(__file__), '../prompts', f'{prompt_name}.txt')
    with open(prompt_path, 'r') as f:
        return f.read() 