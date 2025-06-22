"""
Shared Pydantic Schemas for the Ada Interaction Engine

This module contains shared data models used across different parts of the application
to prevent circular import errors.
"""

from pydantic import BaseModel, Field
from typing import Optional

class EnhancementDecision(BaseModel):
    """
    Pydantic model for the structured decision made by the MCP enhancement agent.
    This decision dictates how a response should be displayed and spoken.
    """
    displayEnhancement: bool = Field(
        description="Whether the response should be enhanced with dynamic UI components."
    )
    displayEnhancedText: str = Field(
        description="The text to use for UI generation (if enhancement is true) or plain text display (if enhancement is false)."
    )
    voiceOverText: Optional[str] = Field(
        default=None,
        description="The text to be spoken via TTS. This should be natural and conversational. It can be None if no additional voice-over is needed."
    )
