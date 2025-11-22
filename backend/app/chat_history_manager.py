"""
Chat History Manager for Ada Interaction Engine

This module provides a thread-safe chat history manager that maintains
conversation history per thread_id across different interaction types
(text chat, voice chat, C1 component actions) with SQLite persistence.
"""

import asyncio
import logging
import time
import json
import os
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import aiosqlite

logger = logging.getLogger(__name__)

class ChatHistoryManager:
    """
    Thread-safe manager for maintaining conversation history across different threads.
    
    This class:
    - Stores messages in OpenAI format (role/content) per thread_id
    - Persists messages to SQLite database for durability
    - Maintains in-memory cache for performance
    - Handles different message sources (text, voice, C1 components)
    - Provides methods to add, retrieve, and clear history
    - Manages context window by limiting history size when needed
    """
    
    def __init__(self, max_history_per_thread: int = 50, max_inactive_time: int = 3600, db_path: str = None):
        """
        Initialize the chat history manager with SQLite persistence.
        
        Args:
            max_history_per_thread: Maximum number of messages to store per thread
            max_inactive_time: Maximum time (in seconds) to keep inactive threads
            db_path: Path to SQLite database file (default: data/chat_history.db)
        """
        # Main storage: thread_id -> list of messages (in-memory cache)
        self._history: Dict[str, List[Dict[str, Any]]] = {}
        
        # Thread metadata: thread_id -> metadata
        self._thread_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.max_history_per_thread = max_history_per_thread
        self.max_inactive_time = max_inactive_time
        
        # Database configuration
        if db_path is None:
            # Create data directory if it doesn't exist
            data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, 'chat_history.db')
        
        self.db_path = db_path
        self._db: Optional[aiosqlite.Connection] = None
        
        # Thread safety
        self._lock = asyncio.Lock()
        self._db_lock = asyncio.Lock()
        
        # Track if database is initialized
        self._db_initialized = False
        
        logger.info(f"Chat history manager initialized with max_history={max_history_per_thread}, "
                   f"max_inactive_time={max_inactive_time}s, db_path={db_path}")
    
    async def initialize(self) -> None:
        """Initialize database connection and create tables if needed."""
        if self._db_initialized:
            return
            
        async with self._db_lock:
            if self._db_initialized:  # Double-check after acquiring lock
                return
                
            try:
                # Open database connection
                self._db = await aiosqlite.connect(self.db_path)
                self._db.row_factory = aiosqlite.Row
                
                # Enable WAL mode for better concurrency
                await self._db.execute("PRAGMA journal_mode=WAL")
                await self._db.execute("PRAGMA busy_timeout=5000")  # Wait up to 5 seconds for locks
                
                # Create tables if they don't exist
                await self._create_tables()
                
                # Ensure extended metadata table exists
                await self._ensure_extended_metadata_table()
                
                # Load recent threads into memory
                await self._load_recent_threads()
                
                self._db_initialized = True
                logger.info(f"Database initialized at {self.db_path}")
                
            except Exception as e:
                logger.error(f"Failed to initialize database: {e}")
                # Don't raise - allow the system to work without persistence
                self._db = None
                self._db_initialized = False
    
    async def _create_tables(self) -> None:
        """Create database tables if they don't exist."""
        # Messages table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                message_id TEXT,
                timestamp REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Thread metadata table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS thread_metadata (
                thread_id TEXT PRIMARY KEY,
                created_at REAL NOT NULL,
                last_activity REAL NOT NULL,
                message_count INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_thread_timestamp 
            ON messages(thread_id, timestamp DESC)
        """)
        
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_thread_metadata_activity 
            ON thread_metadata(last_activity DESC)
        """)
        
        await self._db.commit()
        logger.debug("Database tables created/verified")
    
    async def _load_recent_threads(self, hours: int = 24) -> None:
        """Load recent thread messages from database into memory cache."""
        try:
            # Calculate cutoff time
            cutoff_time = time.time() - (hours * 3600)
            
            # Get recent threads
            cursor = await self._db.execute("""
                SELECT thread_id, created_at, last_activity, message_count
                FROM thread_metadata
                WHERE last_activity > ?
                ORDER BY last_activity DESC
            """, (cutoff_time,))
            
            threads = await cursor.fetchall()
            
            for thread in threads:
                thread_id = thread['thread_id']
                
                # Load thread metadata
                self._thread_metadata[thread_id] = {
                    'created_at': thread['created_at'],
                    'last_activity': thread['last_activity'],
                    'message_count': thread['message_count']
                }
                
                # Load recent messages for this thread
                msg_cursor = await self._db.execute("""
                    SELECT role, content, message_id, timestamp
                    FROM messages
                    WHERE thread_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (thread_id, self.max_history_per_thread))
                
                messages = await msg_cursor.fetchall()
                
                # Store in memory (reverse to get chronological order)
                self._history[thread_id] = []
                for msg in reversed(messages):
                    formatted_msg = {
                        "role": msg['role'],
                        "content": msg['content']
                    }
                    if msg['message_id']:
                        formatted_msg["id"] = msg['message_id']
                    self._history[thread_id].append(formatted_msg)
                
                logger.debug(f"Loaded {len(messages)} messages for thread {thread_id}")
            
            logger.info(f"Loaded {len(threads)} recent threads from database")
            
        except Exception as e:
            logger.error(f"Error loading recent threads: {e}")
    
    async def _persist_message(self, thread_id: str, role: str, content: str, 
                              message_id: Optional[str] = None) -> None:
        """Persist a single message to the database."""
        try:
            async with self._db_lock:
                if not self._db:
                    return
                
                timestamp = time.time()
                
                # Insert message
                await self._db.execute("""
                    INSERT INTO messages (thread_id, role, content, message_id, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (thread_id, role, content, message_id, timestamp))
                
                # Update thread metadata
                await self._db.execute("""
                    INSERT INTO thread_metadata (thread_id, created_at, last_activity, message_count)
                    VALUES (?, ?, ?, 1)
                    ON CONFLICT(thread_id) DO UPDATE SET
                        last_activity = ?,
                        message_count = message_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                """, (thread_id, timestamp, timestamp, timestamp))
                
                await self._db.commit()
                
        except Exception as e:
            logger.error(f"Error persisting message to database: {e}")
    
    async def _persist_thread_deletion(self, thread_id: str) -> None:
        """Remove a thread and its messages from the database."""
        try:
            async with self._db_lock:
                if not self._db:
                    return
                
                # Delete messages
                await self._db.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
                
                # Delete thread metadata
                await self._db.execute("DELETE FROM thread_metadata WHERE thread_id = ?", (thread_id,))
                
                await self._db.commit()
                
        except Exception as e:
            logger.error(f"Error deleting thread from database: {e}")
    
    async def add_user_message(self, thread_id: str, message: str, message_id: Optional[str] = None) -> None:
        """
        Add a user message to the conversation history and persist to database.
        
        Args:
            thread_id: The thread identifier
            message: The user message content
            message_id: Optional message identifier
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
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
                
            # Add to in-memory history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added user message to thread {thread_id}: {message[:50]}...")
        
        # Persist to database (outside of main lock to avoid blocking)
        await self._persist_message(thread_id, "user", message, message_id)
    
    async def add_assistant_message(self, thread_id: str, message: str, message_id: Optional[str] = None) -> None:
        """
        Add an assistant message to the conversation history and persist to database.
        
        Args:
            thread_id: The thread identifier
            message: The assistant message content
            message_id: Optional message identifier
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
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
                
            # Add to in-memory history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added assistant message to thread {thread_id}: {message[:50]}...")
        
        # Persist to database (outside of main lock to avoid blocking)
        await self._persist_message(thread_id, "assistant", message, message_id)
    
    async def add_function_message(self, thread_id: str, function_name: str, content: str) -> None:
        """
        Add a function message to the conversation history (for tool calls).
        
        Args:
            thread_id: The thread identifier
            function_name: The name of the function/tool
            content: The function result content
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style function message
            formatted_message = {
                "role": "function",
                "name": function_name,
                "content": content
            }
                
            # Add to in-memory history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added function message to thread {thread_id} for function {function_name}: {content[:50]}...")
        
        # Persist to database (store function info in content as JSON)
        function_content = json.dumps({"name": function_name, "content": content})
        await self._persist_message(thread_id, "function", function_content, None)
    
    async def add_function_call(self, thread_id: str, function_name: str, arguments: Dict[str, Any]) -> None:
        """
        Add a function call to the conversation history.
        
        Args:
            thread_id: The thread identifier
            function_name: The name of the function/tool being called
            arguments: The arguments passed to the function
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
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
                
            # Add to in-memory history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added function call to thread {thread_id} for function {function_name}")
        
        # Persist to database (store function call in content as JSON)
        function_call_content = json.dumps({
            "function_call": {
                "name": function_name,
                "arguments": arguments
            }
        })
        await self._persist_message(thread_id, "assistant", function_call_content, None)
    
    async def add_system_message(self, thread_id: str, message: str) -> None:
        """
        Add a system message to the conversation history.
        
        Args:
            thread_id: The thread identifier
            message: The system message content
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
        async with self._lock:
            await self._ensure_thread_exists(thread_id)
            
            # Format as OpenAI-style message
            formatted_message = {
                "role": "system",
                "content": message
            }
                
            # Add to in-memory history
            self._history[thread_id].append(formatted_message)
            
            # Update thread metadata
            self._update_thread_activity(thread_id)
            
            # Trim history if needed
            self._trim_history_if_needed(thread_id)
            
            logger.debug(f"Added system message to thread {thread_id}: {message[:50]}...")
        
        # Persist to database
        await self._persist_message(thread_id, "system", message, None)
    
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
        First checks memory cache, then loads from database if needed.
        
        Args:
            thread_id: The thread identifier
            
        Returns:
            List of messages in OpenAI format
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
        async with self._lock:
            # Check if thread is in memory
            if thread_id not in self._history:
                # Try to load from database
                await self._load_thread_from_db(thread_id)
            
            await self._ensure_thread_exists(thread_id)
            
            # Return a copy of the history to prevent external modification
            history = self._history[thread_id].copy()
            
            logger.debug(f"Retrieved history for thread {thread_id}: {len(history)} messages")
            return history
    
    async def get_recent_history(self, thread_id: str, max_messages: int = None) -> List[Dict[str, Any]]:
        """
        Get the most recent messages from the conversation history.
        First checks memory cache, then loads from database if needed.
        
        Args:
            thread_id: The thread identifier
            max_messages: Maximum number of messages to return (default: uses class max_history)
            
        Returns:
            List of recent messages in OpenAI format
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
        async with self._lock:
            # Check if thread is in memory
            if thread_id not in self._history:
                # Try to load from database
                await self._load_thread_from_db(thread_id)
            
            await self._ensure_thread_exists(thread_id)
            
            # Use provided max_messages or class default
            limit = max_messages if max_messages is not None else self.max_history_per_thread
            
            # Get the most recent messages
            raw_history = self._history[thread_id][-limit:].copy()
            
            # Process messages to handle enhanced responses
            processed_history = []
            for msg in raw_history:
                # Check if this is an enhanced response
                if msg.get("role") == "assistant" and msg.get("content", "").startswith('{"type": "enhanced_response"'):
                    try:
                        import json
                        enhanced_data = json.loads(msg["content"])
                        # Extract the original response if available, otherwise skip this message
                        if enhanced_data.get("original_response"):
                            processed_msg = {
                                "role": "assistant",
                                "content": enhanced_data["original_response"]
                            }
                            if "id" in msg:
                                processed_msg["id"] = msg["id"]
                            processed_history.append(processed_msg)
                        # Skip enhanced messages without original_response
                    except (json.JSONDecodeError, KeyError):
                        # If parsing fails, include as-is (shouldn't happen)
                        processed_history.append(msg)
                else:
                    # Include all other messages as-is
                    processed_history.append(msg)
            
            logger.debug(f"Retrieved {len(processed_history)} recent messages for thread {thread_id} (from {len(raw_history)} raw)")
            return processed_history
    
    async def _load_thread_from_db(self, thread_id: str) -> None:
        """
        Load a thread's messages from database into memory cache.
        This is called when a thread is accessed but not in memory.
        """
        if not self._db:
            return
        
        try:
            # Load thread metadata
            cursor = await self._db.execute("""
                SELECT created_at, last_activity, message_count
                FROM thread_metadata
                WHERE thread_id = ?
            """, (thread_id,))
            
            thread_meta = await cursor.fetchone()
            
            if thread_meta:
                self._thread_metadata[thread_id] = {
                    'created_at': thread_meta['created_at'],
                    'last_activity': thread_meta['last_activity'],
                    'message_count': thread_meta['message_count']
                }
                
                # Load messages
                msg_cursor = await self._db.execute("""
                    SELECT role, content, message_id, timestamp
                    FROM messages
                    WHERE thread_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (thread_id, self.max_history_per_thread))
                
                messages = await msg_cursor.fetchall()
                
                # Store in memory (reverse to get chronological order)
                self._history[thread_id] = []
                for msg in reversed(messages):
                    formatted_msg = {
                        "role": msg['role'],
                        "content": msg['content']
                    }
                    if msg['message_id']:
                        formatted_msg["id"] = msg['message_id']
                    self._history[thread_id].append(formatted_msg)
                
                logger.info(f"Loaded thread {thread_id} from database with {len(messages)} messages")
                
        except Exception as e:
            logger.error(f"Error loading thread from database: {e}")
    
    async def clear_history(self, thread_id: str) -> None:
        """
        Clear the conversation history for a thread (both memory and database).
        
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
        
        # Clear from database
        try:
            async with self._db_lock:
                if self._db:
                    await self._db.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
                    await self._db.commit()
        except Exception as e:
            logger.error(f"Error clearing thread from database: {e}")
    
    async def delete_thread(self, thread_id: str) -> None:
        """
        Delete a thread and its history completely (both memory and database).
        
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
        
        # Delete from database
        await self._persist_thread_deletion(thread_id)
    
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
            
            # Delete inactive threads from memory
            for thread_id in threads_to_delete:
                if thread_id in self._history:
                    del self._history[thread_id]
                if thread_id in self._thread_metadata:
                    del self._thread_metadata[thread_id]
            
            if threads_to_delete:
                logger.info(f"Cleaned up {len(threads_to_delete)} inactive threads")
            
            # Note: We don't delete from database during cleanup - only from memory
            # This allows threads to be recovered if needed
            
            return len(threads_to_delete)
    
    async def get_thread_info(self, thread_id: str) -> Dict[str, Any]:
        """
        Get information about a thread.
        
        Args:
            thread_id: The thread identifier
            
        Returns:
            Dictionary with thread metadata
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
            
        async with self._lock:
            if thread_id not in self._thread_metadata:
                # Try to load from database
                await self._load_thread_from_db(thread_id)
                
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
        Get a list of all thread IDs (from both memory and database).
        
        Returns:
            List of thread IDs
        """
        # Ensure database is initialized
        if not self._db_initialized:
            await self.initialize()
        
        threads = set()
        
        # Get threads from memory
        async with self._lock:
            threads.update(self._history.keys())
        
        # Get threads from database
        if self._db:
            try:
                cursor = await self._db.execute("SELECT DISTINCT thread_id FROM thread_metadata")
                db_threads = await cursor.fetchall()
                threads.update(row['thread_id'] for row in db_threads)
            except Exception as e:
                logger.error(f"Error getting threads from database: {e}")
        
        return list(threads)
    
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
    
    def _trim_history_if_needed(self, thread_id: str) -> None:
        """
        Trim the history if it exceeds the maximum allowed size.
        Only trims in-memory cache; database keeps full history.
        
        Args:
            thread_id: The thread identifier
        """
        if thread_id in self._history:
            history = self._history[thread_id]
            if len(history) > self.max_history_per_thread:
                # Keep the most recent messages
                excess = len(history) - self.max_history_per_thread
                self._history[thread_id] = history[excess:]
                logger.debug(f"Trimmed {excess} old messages from thread {thread_id} (memory only)")
    
    async def get_thread_extended_metadata(self, thread_id: str) -> Dict[str, Any]:
        """Get extended metadata for a thread (title, tags, archived status, etc.)."""
        try:
            if not self._db:
                return {}
            
            cursor = await self._db.execute("""
                SELECT title, archived, tags, session_id, connection_id
                FROM thread_extended_metadata
                WHERE thread_id = ?
            """, (thread_id,))
            
            row = await cursor.fetchone()
            
            if row:
                return {
                    'title': row['title'],
                    'archived': bool(row['archived']),
                    'tags': json.loads(row['tags']) if row['tags'] else [],
                    'session_id': row['session_id'],
                    'connection_id': row['connection_id']
                }
            return {}
            
        except Exception as e:
            logger.error(f"Error getting extended metadata for thread {thread_id}: {e}")
            return {}
    
    async def update_thread_extended_metadata(self, thread_id: str, metadata: Dict[str, Any]) -> None:
        """Update extended metadata for a thread."""
        try:
            async with self._db_lock:
                if not self._db:
                    return
                
                # Ensure extended metadata table exists
                await self._ensure_extended_metadata_table()
                
                # Extract metadata fields
                title = metadata.get('title', '')
                archived = int(metadata.get('archived', False))
                tags = json.dumps(metadata.get('tags', []))
                session_id = metadata.get('session_id', '')
                
                # Get connection_id from metadata if provided
                connection_id = metadata.get('connection_id', '')
                
                # Upsert metadata
                await self._db.execute("""
                    INSERT INTO thread_extended_metadata 
                    (thread_id, title, archived, tags, session_id, connection_id, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(thread_id) DO UPDATE SET
                        title = excluded.title,
                        archived = excluded.archived,
                        tags = excluded.tags,
                        session_id = excluded.session_id,
                        connection_id = excluded.connection_id,
                        updated_at = CURRENT_TIMESTAMP
                """, (thread_id, title, archived, tags, session_id, connection_id))
                
                await self._db.commit()
                logger.debug(f"Updated extended metadata for thread {thread_id}")
                
        except Exception as e:
            logger.error(f"Error updating extended metadata for thread {thread_id}: {e}")
    
    async def get_paginated_messages(self, thread_id: str, limit: int = 50, 
                                    offset: int = 0, before_timestamp: Optional[float] = None) -> Dict[str, Any]:
        """Get paginated messages for a thread."""
        try:
            # Check if thread is in memory
            if thread_id not in self._history:
                # Try to load from database
                await self._load_thread_from_db(thread_id)
            
            if thread_id not in self._history:
                return {
                    'messages': [],
                    'total_count': 0,
                    'has_more': False
                }
            
            # Get all messages
            all_messages = self._history[thread_id]
            
            # Filter by timestamp if provided
            if before_timestamp:
                filtered_messages = []
                for msg in all_messages:
                    # Try to get timestamp from message or use a default
                    # Note: We may need to store timestamps with messages
                    filtered_messages.append(msg)
                all_messages = filtered_messages
            
            # Apply pagination
            total_count = len(all_messages)
            start_idx = offset
            end_idx = offset + limit
            paginated = all_messages[start_idx:end_idx]
            has_more = end_idx < total_count
            next_offset = end_idx if has_more else None
            
            return {
                'messages': paginated,
                'total_count': total_count,
                'has_more': has_more,
                'next_offset': next_offset
            }
            
        except Exception as e:
            logger.error(f"Error getting paginated messages: {e}")
            return {
                'messages': [],
                'total_count': 0,
                'has_more': False
            }
    
    async def search_threads(self, query: str, connection_id: Optional[str] = None, 
                           limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Search across threads for matching content."""
        try:
            if not self._db:
                return {'results': [], 'total_count': 0, 'has_more': False}
            
            # Build query based on connection filter
            base_query = """
                SELECT DISTINCT m.thread_id, m.content, m.timestamp
                FROM messages m
                LEFT JOIN thread_extended_metadata tem ON m.thread_id = tem.thread_id
                WHERE (m.content LIKE ? OR tem.title LIKE ? OR tem.tags LIKE ?)
            """
            
            params = [f'%{query}%', f'%{query}%', f'%{query}%']
            
            if connection_id:
                base_query += " AND m.thread_id LIKE ?"
                params.append(f'{connection_id}:%')
            
            base_query += " ORDER BY m.timestamp DESC"
            
            # Get total count
            count_query = f"SELECT COUNT(DISTINCT thread_id) FROM ({base_query})"
            cursor = await self._db.execute(count_query, params)
            total_count = (await cursor.fetchone())[0]
            
            # Apply pagination
            paginated_query = base_query + f" LIMIT {limit} OFFSET {offset}"
            cursor = await self._db.execute(paginated_query, params)
            rows = await cursor.fetchall()
            
            # Format results
            results = []
            for row in rows:
                results.append({
                    'thread_id': row['thread_id'],
                    'matching_content': row['content'],
                    'timestamp': row['timestamp']
                })
            
            has_more = (offset + limit) < total_count
            next_offset = offset + limit if has_more else None
            
            return {
                'results': results,
                'total_count': total_count,
                'has_more': has_more,
                'next_offset': next_offset
            }
            
        except Exception as e:
            logger.error(f"Error searching threads: {e}")
            return {'results': [], 'total_count': 0, 'has_more': False}
    
    async def _ensure_extended_metadata_table(self) -> None:
        """Ensure the extended metadata table exists."""
        try:
            await self._db.execute("""
                CREATE TABLE IF NOT EXISTS thread_extended_metadata (
                    thread_id TEXT PRIMARY KEY,
                    title TEXT,
                    archived INTEGER DEFAULT 0,
                    tags TEXT,
                    session_id TEXT,
                    connection_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for better search performance
            await self._db.execute("""
                CREATE INDEX IF NOT EXISTS idx_extended_metadata_connection
                ON thread_extended_metadata(connection_id)
            """)
            
            await self._db.execute("""
                CREATE INDEX IF NOT EXISTS idx_extended_metadata_session
                ON thread_extended_metadata(session_id)
            """)
            
            await self._db.execute("""
                CREATE INDEX IF NOT EXISTS idx_extended_metadata_archived
                ON thread_extended_metadata(archived)
            """)
            
            await self._db.commit()
            
        except Exception as e:
            logger.error(f"Error ensuring extended metadata table: {e}")
    
    async def close(self) -> None:
        """Close database connection gracefully."""
        if self._db:
            await self._db.close()
            self._db = None
            self._db_initialized = False
            logger.info("Database connection closed")

# Create a singleton instance
chat_history_manager = ChatHistoryManager()