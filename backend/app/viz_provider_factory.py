"""
Ada Interaction Engine - Visualization Provider Factory

This module implements a factory pattern for creating and managing different
visualization providers (Thesys, Google, Tomorrow, etc.) with a unified interface.
"""

import os
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Any, Optional
from openai import AsyncOpenAI

from app.models import VisualizationProviderConfig
from app.config import config

logger = logging.getLogger(__name__)

class VisualizationProvider(ABC):
    """Abstract base class for visualization providers"""
    
    def __init__(self, config: VisualizationProviderConfig):
        self.config = config
        self.provider_type = config.provider_type
        
    @abstractmethod
    async def stream_response(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream visualization response chunks"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get provider-specific system prompt"""
        pass
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the provider (validate credentials, etc.)"""
        pass
    
    @abstractmethod
    async def cleanup(self):
        """Clean up provider resources"""
        pass

class ThesysProvider(VisualizationProvider):
    """Thesys visualization provider"""
    
    def __init__(self, config: VisualizationProviderConfig):
        super().__init__(config)
        self.client: Optional[AsyncOpenAI] = None
        
    async def initialize(self) -> bool:
        """Initialize Thesys client"""
        try:
            api_key_env = self.config.api_key_env or "THESYS_API_KEY"
            api_key = os.getenv(api_key_env)
            
            if not api_key:
                logger.warning(f"Thesys API key not found in {api_key_env}")
                return False
                
            base_url = self.config.base_url or "https://api.thesys.dev/v1/visualize"
            
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url=base_url
            )
            
            logger.info("Thesys provider initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Thesys provider: {e}")
            return False
    
    async def stream_response(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream Thesys visualization response"""
        if not self.client:
            logger.error("Thesys client not initialized")
            return
            
        try:
            model = self.config.model or "c1-nightly"
            
            stream = await self.client.chat.completions.create(
                messages=messages,
                model=model,
                stream=True,
                temperature=0.3
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Thesys streaming error: {e}")
            return
    
    def get_system_prompt(self) -> str:
        """Get Thesys system prompt"""
        try:
            from utils.thesys_prompts import load_thesys_prompt
            return load_thesys_prompt("visualization_system_prompt")
        except Exception as e:
            logger.error(f"Failed to load Thesys prompt: {e}")
            return "You are a helpful assistant that creates visual UI components."
    
    async def cleanup(self):
        """Clean up Thesys client"""
        if self.client:
            # AsyncOpenAI doesn't require explicit cleanup
            self.client = None

class GoogleProvider(VisualizationProvider):
    """Google/Gemini visualization provider"""
    
    def __init__(self, config: VisualizationProviderConfig):
        super().__init__(config)
        self.client: Optional[Any] = None  # Would be Google AI client
        
    async def initialize(self) -> bool:
        """Initialize Google AI client"""
        try:
            api_key_env = self.config.api_key_env or "GOOGLE_API_KEY"
            api_key = os.getenv(api_key_env)
            
            if not api_key:
                logger.warning(f"Google API key not found in {api_key_env}")
                return False
            
            # TODO: Initialize actual Google AI client
            # For now, simulate initialization
            logger.info("Google provider initialized (simulated)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Google provider: {e}")
            return False
    
    async def stream_response(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream Google visualization response"""
        # TODO: Implement actual Google AI streaming
        # For now, simulate a response
        logger.info("Google provider streaming (simulated)")
        
        sample_response = {
            "component": "Card",
            "props": {
                "children": [{
                    "component": "TextContent",
                    "props": {
                        "textMarkdown": "This is a simulated Google AI visualization response."
                    }
                }]
            }
        }
        
        response_text = f'<content>{json.dumps(sample_response)}</content>'
        
        # Simulate streaming by yielding chunks
        chunk_size = 50
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i+chunk_size]
            yield chunk
            await asyncio.sleep(0.01)  # Simulate network delay
    
    def get_system_prompt(self) -> str:
        """Get Google-specific system prompt"""
        return """You are a Google AI assistant that creates beautiful, interactive UI components.
        Focus on clean, modern design patterns and ensure all components are accessible.
        Return your response in the specified C1Component format."""
    
    async def cleanup(self):
        """Clean up Google client"""
        if self.client:
            self.client = None

class TomorrowProvider(VisualizationProvider):
    """Tomorrow AI visualization provider"""
    
    def __init__(self, config: VisualizationProviderConfig):
        super().__init__(config)
        self.client: Optional[Any] = None
        
    async def initialize(self) -> bool:
        """Initialize Tomorrow AI client"""
        try:
            api_key_env = self.config.api_key_env or "TOMORROW_API_KEY"
            api_key = os.getenv(api_key_env)
            
            if not api_key:
                logger.warning(f"Tomorrow API key not found in {api_key_env}")
                return False
            
            # TODO: Initialize actual Tomorrow AI client
            logger.info("Tomorrow provider initialized (simulated)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Tomorrow provider: {e}")
            return False
    
    async def stream_response(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream Tomorrow visualization response"""
        # TODO: Implement actual Tomorrow AI streaming
        logger.info("Tomorrow provider streaming (simulated)")
        
        sample_response = {
            "component": "Callout",
            "props": {
                "variant": "info",
                "title": "Tomorrow AI Response",
                "description": "This is a simulated Tomorrow AI visualization with advanced analytics."
            }
        }
        
        response_text = f'<content>{json.dumps(sample_response)}</content>'
        
        # Simulate streaming
        for char in response_text:
            yield char
            await asyncio.sleep(0.001)
    
    def get_system_prompt(self) -> str:
        """Get Tomorrow-specific system prompt"""
        return """You are Tomorrow AI, specializing in advanced data visualization and analytics.
        Create sophisticated, data-driven UI components that provide deep insights.
        Focus on charts, graphs, and interactive data presentations."""
    
    async def cleanup(self):
        """Clean up Tomorrow client"""
        if self.client:
            self.client = None

class OpenAIProvider(VisualizationProvider):
    """OpenAI visualization provider (fallback)"""
    
    def __init__(self, config: VisualizationProviderConfig):
        super().__init__(config)
        self.client: Optional[AsyncOpenAI] = None
        
    async def initialize(self) -> bool:
        """Initialize OpenAI client"""
        try:
            api_key_env = self.config.api_key_env or "OPENAI_API_KEY"
            api_key = os.getenv(api_key_env)
            
            if not api_key:
                logger.warning(f"OpenAI API key not found in {api_key_env}")
                return False
                
            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("OpenAI provider initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI provider: {e}")
            return False
    
    async def stream_response(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream OpenAI visualization response"""
        if not self.client:
            logger.error("OpenAI client not initialized")
            return
            
        try:
            model = self.config.model or "gpt-4o-mini"
            
            stream = await self.client.chat.completions.create(
                messages=messages,
                model=model,
                stream=True,
                temperature=0.3
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            return
    
    def get_system_prompt(self) -> str:
        """Get OpenAI system prompt"""
        return """You are an AI assistant that creates interactive UI components.
        Return well-structured C1Component JSON format responses.
        Focus on user-friendly interfaces and clear information presentation."""
    
    async def cleanup(self):
        """Clean up OpenAI client"""
        if self.client:
            self.client = None

class VisualizationProviderFactory:
    """Factory for creating visualization providers"""
    
    _providers = {
        "thesys": ThesysProvider,
        "google": GoogleProvider,
        "tomorrow": TomorrowProvider,
        "openai": OpenAIProvider
    }
    
    @classmethod
    async def create_provider(cls, config: VisualizationProviderConfig) -> Optional[VisualizationProvider]:
        """Create and initialize a visualization provider"""
        provider_class = cls._providers.get(config.provider_type.lower())
        
        if not provider_class:
            logger.error(f"Unknown visualization provider: {config.provider_type}")
            return None
        
        try:
            provider = provider_class(config)
            initialized = await provider.initialize()
            
            if not initialized:
                logger.error(f"Failed to initialize {config.provider_type} provider")
                return None
                
            return provider
            
        except Exception as e:
            logger.error(f"Error creating {config.provider_type} provider: {e}")
            return None
    
    @classmethod
    def get_available_providers(cls) -> List[str]:
        """Get list of available provider types"""
        return list(cls._providers.keys())
    
    @classmethod
    def register_provider(cls, provider_type: str, provider_class: type):
        """Register a new provider type"""
        if not issubclass(provider_class, VisualizationProvider):
            raise ValueError("Provider class must inherit from VisualizationProvider")
        
        cls._providers[provider_type.lower()] = provider_class
        logger.info(f"Registered visualization provider: {provider_type}")

# Utility function for getting enhanced system prompt with MCP tools
def create_enhanced_system_prompt(base_prompt: str, mcp_tools: List[Any]) -> str:
    """Create enhanced system prompt with available MCP tools"""
    if not mcp_tools:
        return base_prompt
    
    tool_descriptions = []
    for tool in mcp_tools:
        name = getattr(tool, 'name', 'unknown')
        description = getattr(tool, 'description', 'No description available')
        tool_descriptions.append(f"- **{name}**: {description}")
    
    tools_section = "\n".join(tool_descriptions)
    
    enhanced_prompt = f"""{base_prompt}

Available server-side tools for interactivity:
{tools_section}

You can reference these tools in your UI components to create interactive elements
that trigger server-side actions when users interact with them."""
    
    return enhanced_prompt