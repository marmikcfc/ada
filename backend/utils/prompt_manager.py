"""
Centralized prompt management system for loading and managing system prompts.
"""

import os
import logging
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class PromptManager:
    """Manages loading and caching of system prompts from files"""
    
    _instance = None
    _prompts_cache: Dict[str, str] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PromptManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.prompts_dir = Path(__file__).parent.parent / "prompts"
        
    def load_prompt(self, prompt_name: str, use_cache: bool = True) -> str:
        """
        Load a prompt from file with caching support
        
        Args:
            prompt_name: Name of the prompt file (without .txt extension)
            use_cache: Whether to use cached version if available
            
        Returns:
            Prompt content as string
        """
        # Check cache first
        if use_cache and prompt_name in self._prompts_cache:
            return self._prompts_cache[prompt_name]
            
        # Load from file
        prompt_path = self.prompts_dir / f"{prompt_name}.txt"
        
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                
            # Cache the content
            self._prompts_cache[prompt_name] = content
            logger.info(f"Loaded prompt: {prompt_name}")
            return content
            
        except FileNotFoundError:
            logger.error(f"Prompt file not found: {prompt_path}")
            return self._get_fallback_prompt(prompt_name)
        except Exception as e:
            logger.error(f"Error loading prompt {prompt_name}: {e}")
            return self._get_fallback_prompt(prompt_name)
    
    def reload_prompt(self, prompt_name: str) -> str:
        """
        Force reload a prompt from file (bypasses cache)
        
        Args:
            prompt_name: Name of the prompt file
            
        Returns:
            Reloaded prompt content
        """
        # Clear from cache
        if prompt_name in self._prompts_cache:
            del self._prompts_cache[prompt_name]
            
        return self.load_prompt(prompt_name, use_cache=False)
    
    def get_available_prompts(self) -> list:
        """Get list of available prompt files"""
        if not self.prompts_dir.exists():
            return []
            
        return [f.stem for f in self.prompts_dir.glob("*.txt")]
    
    def clear_cache(self):
        """Clear the prompts cache"""
        self._prompts_cache.clear()
        logger.info("Cleared prompt cache")
    
    def _get_fallback_prompt(self, prompt_name: str) -> str:
        """Get fallback prompt when file is not found"""
        fallbacks = {
            "openai_html_generator_system": """You are an HTML generator that creates interactive web interfaces.
Create clean HTML with inline styles and window.genuxSDK event handlers for interactivity.
Return JSON with htmlContent field.""",
            
            "openai_tailwind_generator_system": """You are a Tailwind CSS generator that creates modern web interfaces.
Use Tailwind utility classes for styling and responsive design.
Include window.genuxSDK event handlers and return JSON with htmlContent field.""",
            
            "openai_shadcn_generator_system": """You are a ShadCN component generator that creates professional UI interfaces.
Use ShadCN/UI component patterns with Tailwind CSS and proper design system conventions.
Include window.genuxSDK event handlers and return JSON with htmlContent field.""",
            
            "visualization_system_prompt": """You are a UI generation assistant. 
Convert text responses into appropriate visual components for display.""",
            
            "mcp_agent_prompt": """You are an enhancement agent that decides if responses need visual enhancement.""",
            
            "voice_agent_system": """You are Ada, a helpful voice assistant. 
Keep responses conversational and concise (1-3 sentences).""",
        }
        
        fallback = fallbacks.get(prompt_name, "You are a helpful AI assistant.")
        logger.warning(f"Using fallback prompt for: {prompt_name}")
        return fallback

# Global instance
prompt_manager = PromptManager()

# Convenience functions
def load_prompt(prompt_name: str, use_cache: bool = True) -> str:
    """Load a prompt using the global prompt manager"""
    return prompt_manager.load_prompt(prompt_name, use_cache)

def reload_prompt(prompt_name: str) -> str:
    """Reload a prompt using the global prompt manager"""
    return prompt_manager.reload_prompt(prompt_name)

def get_available_prompts() -> list:
    """Get available prompts using the global prompt manager"""
    return prompt_manager.get_available_prompts()

# Framework-specific prompt loaders
def get_html_generator_prompt(framework: str = "inline") -> str:
    """
    Get appropriate HTML generator prompt based on framework
    
    Args:
        framework: Target framework ("tailwind", "shadcn", "inline", etc.)
        
    Returns:
        System prompt for the specified framework
    """
    framework_lower = framework.lower()
    if framework_lower == "tailwind":
        return load_prompt("openai_tailwind_generator_system")
    elif framework_lower == "shadcn":
        return load_prompt("openai_shadcn_generator_system")
    elif framework_lower in ["c1", "thesys"]:
        # TheSys provider uses C1 components, not HTML generation
        return load_prompt("visualization_system_prompt")
    else:
        return load_prompt("openai_html_generator_system")

def get_visualizer_prompt(provider: str = "openai") -> str:
    """
    Get visualizer prompt for specific provider
    
    Args:
        provider: Visualization provider ("openai", "thesys", etc.)
        
    Returns:
        System prompt for the provider
    """
    prompt_mapping = {
        "openai": "openai_html_generator_system",
        "thesys": "visualization_system_prompt", 
        "mcp_agent": "mcp_agent_prompt",
        "voice_agent": "voice_agent_system"
    }
    
    prompt_name = prompt_mapping.get(provider, "openai_html_generator_system")
    return load_prompt(prompt_name)