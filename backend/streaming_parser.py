"""
Streaming Parser for Enhancement Decisions

This module provides streaming JSON parsing capabilities for the EnhancementDecision model,
allowing real-time extraction of voice-over text for immediate TTS injection while
buffering the complete response for UI enhancement.
"""

import json
import re
import asyncio
import logging
from typing import Generator, Optional, Callable, Awaitable, Dict, Any
from dataclasses import dataclass
from pydantic import BaseModel

from enhanced_mcp_client import EnhancementDecision

logger = logging.getLogger(__name__)

@dataclass
class StreamingChunk:
    """Represents a chunk of streaming data with metadata"""
    content: str
    chunk_type: str  # 'voiceover', 'display', 'metadata'
    is_complete: bool = False
    timestamp: Optional[float] = None

class EnhancementStreamingParser:
    """
    Streaming parser for EnhancementDecision JSON responses.
    
    This parser can:
    1. Extract voiceOverText content as it streams and send to TTS immediately
    2. Buffer complete response for final pydantic validation
    3. Handle partial JSON gracefully
    4. Provide word-by-word voice-over streaming for immediate audio feedback
    """
    
    def __init__(self, voice_injection_callback: Optional[Callable[[str], Awaitable[None]]] = None):
        """
        Initialize the streaming parser.
        
        Args:
            voice_injection_callback: Async function to call for voice-over text injection
        """
        self.voice_injection_callback = voice_injection_callback
        self.buffer = ""
        self.current_field = None
        self.voice_buffer = ""
        self.display_buffer = ""
        self.enhancement_flag = None
        self.parsing_state = "waiting"  # waiting, in_field, field_complete
        self.field_buffers = {
            "displayEnhancement": "",
            "displayEnhancedText": "", 
            "voiceOverText": ""
        }
        
    async def process_chunk(self, chunk: str) -> Optional[StreamingChunk]:
        """
        Process a streaming chunk and extract actionable content.
        
        Args:
            chunk: Raw text chunk from streaming response
            
        Returns:
            StreamingChunk if actionable content found, None otherwise
        """
        if not chunk:
            return None
            
        self.buffer += chunk
        
        # Try to detect and extract field content
        extracted_content = await self._extract_field_content(chunk)
        
        if extracted_content:
            return extracted_content
            
        return None
    
    async def _extract_field_content(self, chunk: str) -> Optional[StreamingChunk]:
        """Extract content from specific JSON fields as they stream."""
        
        # Look for voiceOverText content - highest priority for immediate TTS
        voice_match = self._extract_streaming_field_content("voiceOverText", chunk)
        if voice_match:
            # Process voice content word by word for immediate TTS
            words = voice_match.split()
            for word in words:
                if word.strip():
                    # Inject each word immediately to TTS
                    if self.voice_injection_callback:
                        try:
                            await self.voice_injection_callback(word + " ")
                            logger.debug(f"Injected voice word: '{word}'")
                        except Exception as e:
                            logger.error(f"Error injecting voice word '{word}': {e}")
            
            return StreamingChunk(
                content=voice_match,
                chunk_type="voiceover",
                is_complete=False
            )
        
        # Look for displayEnhancement flag
        enhancement_match = self._extract_streaming_field_content("displayEnhancement", chunk)
        if enhancement_match:
            try:
                self.enhancement_flag = json.loads(enhancement_match.lower())
                return StreamingChunk(
                    content=enhancement_match,
                    chunk_type="metadata",
                    is_complete=False
                )
            except json.JSONDecodeError:
                pass
        
        # Look for displayEnhancedText content
        display_match = self._extract_streaming_field_content("displayEnhancedText", chunk)
        if display_match:
            return StreamingChunk(
                content=display_match,
                chunk_type="display",
                is_complete=False
            )
        
        return None
    
    def _extract_streaming_field_content(self, field_name: str, chunk: str) -> Optional[str]:
        """
        Extract content from a specific JSON field as it streams.
        
        This handles partial JSON by looking for field patterns and content.
        """
        # Pattern to match: "fieldName": "content..."
        field_pattern = rf'"{field_name}"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?'
        
        # Try to find the field in current buffer
        match = re.search(field_pattern, self.buffer)
        if match:
            current_content = match.group(1)
            
            # Check if this is new content (more than what we had before)
            previous_content = self.field_buffers.get(field_name, "")
            if len(current_content) > len(previous_content):
                # Extract only the new content
                new_content = current_content[len(previous_content):]
                self.field_buffers[field_name] = current_content
                
                # Unescape JSON content
                try:
                    new_content = json.loads(f'"{new_content}"')
                    return new_content
                except json.JSONDecodeError:
                    # Return raw content if JSON unescape fails
                    return new_content
        
        return None
    
    async def finalize(self) -> Optional[EnhancementDecision]:
        """
        Finalize parsing and return complete EnhancementDecision object.
        
        Returns:
            Validated EnhancementDecision object or None if parsing failed
        """
        try:
            # Try to parse the complete buffer as JSON
            if self.buffer.strip().endswith('}'):
                # Clean up the buffer - remove any markdown code blocks
                clean_buffer = re.sub(r'^```(?:json)?\n?|\n?```$', '', self.buffer.strip(), flags=re.MULTILINE)
                
                # Parse as complete JSON
                parsed_data = json.loads(clean_buffer)
                
                # Validate with Pydantic
                decision = EnhancementDecision(**parsed_data)
                logger.info(f"Successfully parsed complete EnhancementDecision: enhancement={decision.displayEnhancement}")
                return decision
                
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse complete JSON buffer: {e}")
            logger.debug(f"Buffer content: {self.buffer}")
            
            # Fallback: try to construct from individual field buffers
            try:
                fallback_data = {
                    "displayEnhancement": self.enhancement_flag if self.enhancement_flag is not None else False,
                    "displayEnhancedText": self.field_buffers.get("displayEnhancedText", ""),
                    "voiceOverText": self.field_buffers.get("voiceOverText", "")
                }
                
                decision = EnhancementDecision(**fallback_data)
                logger.warning("Used fallback parsing for EnhancementDecision")
                return decision
                
            except Exception as fallback_error:
                logger.error(f"Fallback parsing also failed: {fallback_error}")
        
        return None
    
    def reset(self):
        """Reset parser state for reuse."""
        self.buffer = ""
        self.current_field = None
        self.voice_buffer = ""
        self.display_buffer = ""
        self.enhancement_flag = None
        self.parsing_state = "waiting"
        self.field_buffers = {
            "displayEnhancement": "",
            "displayEnhancedText": "", 
            "voiceOverText": ""
        }


class StreamingEnhancementGenerator:
    """
    Generator class for streaming enhancement decisions from OpenAI API.
    
    This class handles the OpenAI streaming API and yields parsed content
    as it becomes available.
    """
    
    def __init__(self, openai_client, model: str = "gpt-4o-mini"):
        """
        Initialize the streaming generator.
        
        Args:
            openai_client: OpenAI async client instance
            model: Model name to use for streaming
        """
        self.openai_client = openai_client
        self.model = model
    
    async def stream_enhancement_decision(
        self, 
        messages: list,
        functions: list = None,
        voice_injection_callback: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> EnhancementDecision:
        """
        Stream enhancement decision from OpenAI API.
        
        Args:
            messages: Messages for OpenAI API
            functions: Available functions for tool calling
            voice_injection_callback: Callback for voice-over injection
            
        Returns:
            Final EnhancementDecision object with real-time voice injection
        """
        parser = EnhancementStreamingParser(voice_injection_callback)
        
        try:
            # Check if we need to handle function calling first
            if functions:
                # Initial call to check for function calls
                response = await self.openai_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    functions=functions,
                    function_call="auto",
                    temperature=0.3
                )
                
                reply = response.choices[0].message
                
                # If function call detected, handle it
                if hasattr(reply, 'function_call') and reply.function_call:
                    # Function call path - handle separately and return enhancement=True
                    func_call = reply.function_call
                    func_name = func_call.name
                    args = json.loads(func_call.arguments or "{}")
                    
                    # Provide immediate voice feedback for function calls
                    if voice_injection_callback:
                        await voice_injection_callback("I'm using tools to help answer your question. ")
                    
                    # For function calls, we'll force enhancement and provide placeholder decision
                    decision = EnhancementDecision(
                        displayEnhancement=True,
                        displayEnhancedText="Tool call in progress...",
                        voiceOverText="I'm using tools to help answer your question..."
                    )
                    
                    return decision
            
            # Stream the structured response
            async with self.openai_client.beta.chat.completions.stream(
                model=self.model,
                messages=messages + [{"role": "user", "content": "Provide your structured enhancement decision."}],
                response_format=EnhancementDecision,
                temperature=0.3
            ) as stream:
                
                async for event in stream:
                    if hasattr(event, 'chunk') and event.chunk.choices:
                        delta = event.chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            chunk_content = delta.content
                            
                            # Process chunk through parser - voice injection happens here
                            await parser.process_chunk(chunk_content)
            
            # Finalize and return complete decision
            final_decision = await parser.finalize()
            if final_decision:
                return final_decision
            else:
                # Fallback decision
                return EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText="Error parsing enhancement decision",
                    voiceOverText="Error processing response"
                )
                
        except Exception as e:
            logger.error(f"Error in streaming enhancement decision: {e}", exc_info=True)
            # Return fallback decision
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText="Error in streaming processing",
                voiceOverText="Error processing response"
            )
        finally:
            parser.reset() 