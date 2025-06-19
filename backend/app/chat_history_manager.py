"""
Chat History Manager for Ada Interaction Engine

This module provides a thread-safe chat history manager that maintains
conversation history per thread_id across different interaction types
(text chat, voice chat, C1 component actions).
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

logger = logging.getLogger(__name__)

class ChatHistoryManager:
    """
    Thread-safe manager for maintaining conversation history across different threads.
    
    This class:
    - Stores messages in OpenAI format (role/content) per thread_id
    - Handles different message sources (text, voice, C1 components)
    - Provides methods to add, retrieve, and clear history
    - Manages context window by limiting history size when needed
    """
    
    def __init__(self, max_history_per_thread: int = 50, max_inactive_time: int = 3600):
        """
        Initialize the chat history manager.
        
        Args:
            max_history_per_thread: Maximum number of messages to store per thread
            max_inactive_time: Maximum time (in seconds) to keep inactive threads
        """
        # Main storage: thread_id -> list of messages
        self._history: Dict[str, List[Dict[str, Any]]] = {}
        
        # Thread metadata: thread_id -> last_activity_timestamp
        self._thread_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.max_history_per_thread = max_history_per_thread
        self.max_inactive_time = max_inactive_time
        
        # Thread safety
        self._lock = asyncio.Lock()
        
        logger.info(f"Chat history manager initialized with max_history={max_history_per_thread}, max_inactive_time={max_inactive_time}s")
    
    async def add_user_message(self, thread_id: str, message: str, message_id: Optional[str] = None) -> None:
        """
        Add a user message to the conversation history.
        
        Args:
            thread_id: The thread identifier
            message: The user message content
            message_id: Optional message identifier
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style message
            formatted_message = {
                "role": "user",
                "content": message
            }
            
            # Add optional message_id if provided
            if message_id:
                formatted_message["id"] = message_id
                
            # Add to history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            await self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added user message to thread {thread_id}: {message[:50]}...")
    
    async def add_assistant_message(self, thread_id: str, message: str, message_id: Optional[str] = None) -> None:
        """
        Add an assistant message to the conversation history.
        
        Args:
            thread_id: The thread identifier
            message: The assistant message content
            message_id: Optional message identifier
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style message
            formatted_message = {
                "role": "assistant",
                "content": message
            }
            
            # Add optional message_id if provided
            if message_id:
                formatted_message["id"] = message_id
                
            # Add to history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            await self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added assistant message to thread {thread_id}: {message[:50]}...")
    
    async def add_function_message(self, thread_id: str, function_name: str, content: str) -> None:
        """
        Add a function message to the conversation history (for tool calls).
        
        Args:
            thread_id: The thread identifier
            function_name: The name of the function/tool
            content: The function result content
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style function message
            formatted_message = {
                "role": "function",
                "name": function_name,
                "content": content
            }
                
            # Add to history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            await self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added function message to thread {thread_id} for function {function_name}: {content[:50]}...")
    
    async def add_function_call(self, thread_id: str, function_name: str, arguments: Dict[str, Any]) -> None:
        """
        Add a function call to the conversation history.
        
        Args:
            thread_id: The thread identifier
            function_name: The name of the function/tool being called
            arguments: The arguments passed to the function
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            import json
            
            # Format as OpenAI-style function call message
            formatted_message = {
                "role": "assistant",
                "content": None,
                "function_call": {
                    "name": function_name,
                    "arguments": json.dumps(arguments)
                }
            }
                
            # Add to history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            await self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added function call to thread {thread_id} for function {function_name}")
    
    async def add_system_message(self, thread_id: str, message: str) -> None:
        """
        Add a system message to the conversation history.
        
        Args:
            thread_id: The thread identifier
            message: The system message content
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style message
            formatted_message = {
                "role": "system",
                "content": message
            }
                
            # Add to history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            await self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added system message to thread {thread_id}: {message[:50]}...")
    
    async def add_c1_action(self, thread_id: str, action_message: str) -> None:
        """
        Add a C1 component action to the conversation history as a user message.
        
        Args:
            thread_id: The thread identifier
            action_message: The C1 action message (typically from llmFriendlyMessage)
        """
        # C1 actions are treated as user messages for conversation history
        await self.add_user_message(thread_id, action_message)
        logger.debug(f"Added C1 action as user message to thread {thread_id}: {action_message[:50]}...")
    
    async def get_history(self, thread_id: str) -> List[Dict[str, Any]]:
        """
        Get the complete conversation history for a thread.
        
        Args:
            thread_id: The thread identifier
            
        Returns:
            List of messages in OpenAI format
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Return a copy of the history to prevent external modification
            history = self._history[thread_id].copy()
            
            logger.debug(f"Retrieved history for thread {thread_id}: {len(history)} messages")
            return history
    
    async def get_recent_history(self, thread_id: str, max_messages: int = None) -> List[Dict[str, Any]]:
        """
        Get the most recent messages from the conversation history.
        
        Args:
            thread_id: The thread identifier
            max_messages: Maximum number of messages to return (default: uses class max_history)
            
        Returns:
            List of recent messages in OpenAI format
        """
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Use provided max_messages or class default
            limit = max_messages if max_messages is not None else self.max_history_per_thread
            
            # Get the most recent messages
            history = self._history[thread_id][-limit:].copy()
            
            logger.debug(f"Retrieved {len(history)} recent messages for thread {thread_id}")
            return history
    
    async def clear_history(self, thread_id: str) -> None:
        """
        Clear the conversation history for a thread.
        
        Args:
            thread_id: The thread identifier
        """
        async with self._lock:
            if thread_id in self._history:
                self._history[thread_id] = []
                
                # Update thread metadata
                self._update_thread_activity(thread_id)
                
                logger.info(f"Cleared history for thread {thread_id}")
            else:
                logger.debug(f"Attempted to clear non-existent thread {thread_id}")
    
    async def delete_thread(self, thread_id: str) -> None:
        """
        Delete a thread and its history completely.
        
        Args:
            thread_id: The thread identifier
        """
        async with self._lock:
            if thread_id in self._history:
                del self._history[thread_id]
                
                # Remove thread metadata
                if thread_id in self._thread_metadata:
                    del self._thread_metadata[thread_id]
                
                logger.info(f"Deleted thread {thread_id}")
            else:
                logger.debug(f"Attempted to delete non-existent thread {thread_id}")
    
    async def cleanup_inactive_threads(self) -> int:
        """
        Clean up inactive threads that haven't been used for a while.
        
        Returns:
            Number of threads cleaned up
        """
        async with self._lock:
            current_time = time.time()
            threads_to_delete = []
            
            for thread_id, metadata in self._thread_metadata.items():
                last_activity = metadata.get('last_activity', 0)
                if current_time - last_activity > self.max_inactive_time:
                    threads_to_delete.append(thread_id)
            
            # Delete inactive threads
            for thread_id in threads_to_delete:
                if thread_id in self._history:
                    del self._history[thread_id]
                if thread_id in self._thread_metadata:
                    del self._thread_metadata[thread_id]
            
            if threads_to_delete:
                logger.info(f"Cleaned up {len(threads_to_delete)} inactive threads")
            
            return len(threads_to_delete)
    
    async def get_thread_info(self, thread_id: str) -> Dict[str, Any]:
        """
        Get information about a thread.
        
        Args:
            thread_id: The thread identifier
            
        Returns:
            Dictionary with thread metadata
        """
        async with self._lock:
            if thread_id not in self._thread_metadata:
                return {
                    "exists": False,
                    "message_count": 0,
                    "last_activity": None
                }
            
            metadata = self._thread_metadata[thread_id]
            message_count = len(self._history.get(thread_id, []))
            
            return {
                "exists": True,
                "message_count": message_count,
                "last_activity": datetime.fromtimestamp(metadata.get('last_activity', 0)).isoformat(),
                "created_at": datetime.fromtimestamp(metadata.get('created_at', 0)).isoformat()
            }
    
    async def get_all_threads(self) -> List[str]:
        """
        Get a list of all thread IDs.
        
        Returns:
            List of thread IDs
        """
        async with self._lock:
            return list(self._history.keys())
    
    async def _ensure_thread_exists(self, thread_id: str) -> None:
        """
        Ensure a thread exists in the history storage.
        
        Args:
            thread_id: The thread identifier
        """
        if thread_id not in self._history:
            self._history[thread_id] = []
            
            # Initialize thread metadata
            current_time = time.time()
            self._thread_metadata[thread_id] = {
                'created_at': current_time,
                'last_activity': current_time
            }
            
            logger.info(f"Created new thread {thread_id}")
    
    def _update_thread_activity(self, thread_id: str) -> None:
        """
        Update the last activity timestamp for a thread.
        
        Args:
            thread_id: The thread identifier
        """
        if thread_id in self._thread_metadata:
            self._thread_metadata[thread_id]['last_activity'] = time.time()
        else:
            # Initialize if not exists
            current_time = time.time()
            self._thread_metadata[thread_id] = {
                'created_at': current_time,
                'last_activity': current_time
            }
    
    async def _trim_history_if_needed(self, thread_id: str) -> None:
        """
        Trim the history if it exceeds the maximum allowed size.
        
        Args:
            thread_id: The thread identifier
        """
        if thread_id in self._history:
            history = self._history[thread_id]
            if len(history) > self.max_history_per_thread:
                # Keep the most recent messages
                excess = len(history) - self.max_history_per_thread
                self._history[thread_id] = history[excess:]
                logger.debug(f"Trimmed {excess} old messages from thread {thread_id}")

# Create a singleton instance
chat_history_manager = ChatHistoryManager()
