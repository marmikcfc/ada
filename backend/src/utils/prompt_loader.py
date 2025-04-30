import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Determine the prompts directory relative to this file's location
# Assumes this file is in src/utils and prompts are in prompts/
PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"

# Cache loaded prompts in memory
_prompt_cache = {}

def load_prompt(name: str) -> str:
    """Loads a prompt template from the specified file in the prompts directory."""
    if name in _prompt_cache:
        return _prompt_cache[name]

    filename = f"{name}.txt"
    filepath = PROMPTS_DIR / filename
    logger.debug(f"Attempting to load prompt from: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            prompt_content = f.read()
            if not prompt_content.strip():
                 logger.warning(f"Prompt file '{filepath}' is empty.")
            _prompt_cache[name] = prompt_content # Cache the loaded prompt
            logger.info(f"Successfully loaded prompt '{name}' from {filepath}")
            return prompt_content
    except FileNotFoundError:
        logger.error(f"Prompt file not found: {filepath}")
        # Return a default error message or raise an exception
        return f"Error: Prompt '{name}' not found at {filepath}."
    except Exception as e:
        logger.error(f"Error loading prompt '{name}' from {filepath}: {e}", exc_info=True)
        return f"Error loading prompt '{name}'." 