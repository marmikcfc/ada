"""
Ada Interaction Engine - Visualization Provider Factory

This module implements a factory pattern for creating and managing different
visualization providers (Thesys, Google, Tomorrow, etc.) with a unified interface.
"""

import os
import json
import re
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Any, Optional
from openai import AsyncOpenAI

from app.models import VisualizationProviderConfig
from app.config import config
from schemas import HTMLResponse
from utils.prompt_manager import get_html_generator_prompt, load_prompt

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
        return load_prompt("google_ai_system")
    
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
        return load_prompt("tomorrow_ai_system")
    
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
        """Stream OpenAI visualization response using structured output"""
        if not self.client:
            logger.error("OpenAI client not initialized")
            return
            
        try:
            model = self.config.model or "gpt-4o-mini"
            
            # Use OpenAI's structured output with Pydantic schema
            # This is more reliable than function calling
            logger.info(f"Starting OpenAI structured output stream with model: {model}")
            
            # Streaming JSON parser for htmlContent field
            json_buffer = ""
            html_content_buffer = ""
            html_content_yielded = 0  # Track how much HTML we've already yielded
            
            async with self.client.beta.chat.completions.stream(
                model=model,
                messages=messages,
                response_format=HTMLResponse,  # Pydantic model for structured output
                temperature=0.3
            ) as stream:
                
                async for event in stream:
                    # Handle different event types from structured output streaming
                    if hasattr(event, 'chunk') and event.chunk.choices:
                        delta = event.chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            chunk_content = delta.content
                            json_buffer += chunk_content
                            
                            # Try to extract htmlContent from the streaming JSON
                            html_chunk = self._extract_html_content_chunk(json_buffer, html_content_yielded)
                            if html_chunk:
                                html_content_buffer += html_chunk
                                html_content_yielded += len(html_chunk)
                                
                                # Yield the HTML content chunk for real-time streaming
                                yield html_chunk
                                logger.debug(f"Streamed HTML chunk: {html_chunk[:50]}...")
                
                # After streaming completes, validate the complete response
                if json_buffer.strip():
                    try:
                        # Parse the complete structured response for validation
                        response_data = json.loads(json_buffer)
                        html_response = HTMLResponse(**response_data)
                        
                        logger.info(f"OpenAI structured output completed successfully. HTML length: {len(html_response.htmlContent)}")
                        
                        # Check if we missed any content at the end
                        if len(html_response.htmlContent) > html_content_yielded:
                            remaining_content = html_response.htmlContent[html_content_yielded:]
                            logger.info(f"Yielding remaining HTML content: {len(remaining_content)} chars")
                            yield remaining_content
                        
                    except (json.JSONDecodeError, ValueError) as e:
                        logger.error(f"Failed to validate OpenAI structured output: {e}")
                        logger.error(f"Raw JSON buffer: {json_buffer[:200]}...")
                        
                        # If we couldn't parse, but have HTML content, yield fallback
                        if not html_content_buffer.strip():
                            error_html = """
                            <div style="padding: 16px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
                                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">Validation Error</h3>
                                <p style="margin: 0; font-size: 14px;">Failed to validate structured HTML response.</p>
                            </div>
                            """
                            yield error_html
                else:
                    logger.warning("OpenAI structured output stream completed with empty content")
                    fallback_html = """
                    <div style="padding: 16px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; color: #92400e;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">Empty Response</h3>
                        <p style="margin: 0; font-size: 14px;">OpenAI returned an empty structured response.</p>
                    </div>
                    """
                    yield fallback_html
                    
        except Exception as e:
            logger.error(f"OpenAI structured output streaming error: {e}")
            # Fallback error HTML
            error_html = f"""
            <div style="padding: 16px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">Streaming Error</h3>
                <p style="margin: 0; font-size: 14px;">Error during structured output streaming: {str(e)}</p>
            </div>
            """
            yield error_html
            return
    
    def _extract_html_content_chunk(self, json_buffer: str, already_yielded: int) -> Optional[str]:
        """
        Extract new HTML content from the streaming JSON buffer.
        
        Args:
            json_buffer: The accumulated JSON string so far
            already_yielded: Number of characters already yielded
            
        Returns:
            New HTML content chunk or None
        """
        
        # Pattern to match: "htmlContent": "content..."
        # This handles escaped quotes and partial content
        pattern = r'"htmlContent"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?'
        
        match = re.search(pattern, json_buffer)
        if match:
            # Get the current content (with JSON escapes)
            raw_content = match.group(1)
            
            # Unescape the JSON content
            try:
                # Parse as JSON string to handle escapes
                unescaped_content = json.loads(f'"{raw_content}"')
                
                # Return only the new content
                if len(unescaped_content) > already_yielded:
                    new_content = unescaped_content[already_yielded:]
                    return new_content
                    
            except json.JSONDecodeError:
                # If JSON parsing fails, return raw content difference
                if len(raw_content) > already_yielded:
                    return raw_content[already_yielded:]
        
        return None
    
    def get_system_prompt(self, framework: str = "inline") -> str:
        """
        Get OpenAI system prompt for HTML generation based on framework
        
        Args:
            framework: Target framework ("tailwind", "inline", etc.)
            
        Returns:
            System prompt appropriate for the framework
        """
        return get_html_generator_prompt(framework)
    
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