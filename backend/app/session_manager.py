"""
Ada Interaction Engine - Session Manager

This module manages persistent session IDs that survive thread switches,
coordinating connections between WebSocket and WebRTC for the same user session.
"""

import asyncio
import logging
from typing import Dict, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class SessionInfo:
    """Information about a user session"""
    session_id: str
    current_thread_id: Optional[str] = None
    current_ws_connection_id: Optional[str] = None
    current_rtc_connection_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    thread_history: list = field(default_factory=list)
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()

class SessionManager:
    """
    Manages user sessions across thread switches.
    
    A session persists across thread switches, while connection IDs change.
    This allows proper coordination between WebSocket and WebRTC connections.
    """
    
    def __init__(self):
        # Core mappings
        self.sessions: Dict[str, SessionInfo] = {}  # session_id -> SessionInfo
        self.ws_to_session: Dict[str, str] = {}  # ws_connection_id -> session_id
        self.rtc_to_session: Dict[str, str] = {}  # rtc_connection_id -> session_id
        
        # Thread safety
        self._lock = asyncio.Lock()
    
    async def register_websocket_connection(
        self,
        session_id: str,
        ws_connection_id: str,
        thread_id: str
    ) -> bool:
        """
        Register a WebSocket connection for a session.
        
        Args:
            session_id: Persistent session ID from frontend
            ws_connection_id: WebSocket connection ID
            thread_id: Current thread ID
            
        Returns:
            True if registration successful
        """
        async with self._lock:
            # Get or create session
            if session_id not in self.sessions:
                self.sessions[session_id] = SessionInfo(session_id=session_id)
                logger.info(f"Created new session: {session_id}")
            
            session = self.sessions[session_id]
            
            # Clean up old WebSocket connection for this session
            if session.current_ws_connection_id:
                old_ws_id = session.current_ws_connection_id
                self.ws_to_session.pop(old_ws_id, None)
                logger.info(f"Removed old WebSocket {old_ws_id} from session {session_id}")
            
            # Register new connection
            session.current_ws_connection_id = ws_connection_id
            session.current_thread_id = thread_id
            session.update_activity()
            
            # Add to thread history
            if thread_id not in session.thread_history:
                session.thread_history.append(thread_id)
            
            # Update mapping
            self.ws_to_session[ws_connection_id] = session_id
            
            logger.info(
                f"✅ Registered WebSocket {ws_connection_id} for session {session_id}, "
                f"thread {thread_id}"
            )
            return True
    
    async def register_rtc_connection(
        self,
        session_id: str,
        rtc_connection_id: str,
        thread_id: str
    ) -> bool:
        """
        Register a WebRTC connection for a session.
        
        Args:
            session_id: Persistent session ID from frontend
            rtc_connection_id: WebRTC connection ID (pc_id)
            thread_id: Current thread ID
            
        Returns:
            True if registration successful
        """
        async with self._lock:
            if session_id not in self.sessions:
                logger.warning(
                    f"Attempted to register RTC for unknown session {session_id}"
                )
                return False
            
            session = self.sessions[session_id]
            
            # Verify thread matches
            if session.current_thread_id != thread_id:
                logger.warning(
                    f"Thread mismatch: session {session_id} is on thread "
                    f"{session.current_thread_id}, but RTC trying to register for {thread_id}"
                )
                # Update to new thread if different
                session.current_thread_id = thread_id
            
            # Clean up old RTC connection for this session
            if session.current_rtc_connection_id:
                old_rtc_id = session.current_rtc_connection_id
                self.rtc_to_session.pop(old_rtc_id, None)
                logger.info(f"Removed old RTC {old_rtc_id} from session {session_id}")
            
            # Register new connection
            session.current_rtc_connection_id = rtc_connection_id
            session.update_activity()
            
            # Update mapping
            self.rtc_to_session[rtc_connection_id] = session_id
            
            logger.info(
                f"✅ Registered RTC {rtc_connection_id} for session {session_id}, "
                f"thread {thread_id}"
            )
            return True
    
    async def get_session_for_ws(self, ws_connection_id: str) -> Optional[SessionInfo]:
        """Get session info for a WebSocket connection"""
        async with self._lock:
            session_id = self.ws_to_session.get(ws_connection_id)
            if session_id:
                return self.sessions.get(session_id)
            return None
    
    async def get_session_for_rtc(self, rtc_connection_id: str) -> Optional[SessionInfo]:
        """Get session info for a WebRTC connection"""
        async with self._lock:
            session_id = self.rtc_to_session.get(rtc_connection_id)
            if session_id:
                return self.sessions.get(session_id)
            return None
    
    async def get_linked_ws_for_rtc(self, rtc_connection_id: str) -> Optional[str]:
        """
        Get the WebSocket connection ID linked to a WebRTC connection.
        
        Args:
            rtc_connection_id: WebRTC connection ID
            
        Returns:
            WebSocket connection ID if found
        """
        async with self._lock:
            session_id = self.rtc_to_session.get(rtc_connection_id)
            if session_id and session_id in self.sessions:
                return self.sessions[session_id].current_ws_connection_id
            return None
    
    async def get_linked_rtc_for_ws(self, ws_connection_id: str) -> Optional[str]:
        """
        Get the WebRTC connection ID linked to a WebSocket connection.
        
        Args:
            ws_connection_id: WebSocket connection ID
            
        Returns:
            WebRTC connection ID if found
        """
        async with self._lock:
            session_id = self.ws_to_session.get(ws_connection_id)
            if session_id and session_id in self.sessions:
                return self.sessions[session_id].current_rtc_connection_id
            return None
    
    async def get_session_connections(self, session_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get both WebSocket and WebRTC connection IDs for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Tuple of (ws_connection_id, rtc_connection_id)
        """
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                return session.current_ws_connection_id, session.current_rtc_connection_id
            return None, None
    
    async def unregister_ws_connection(self, ws_connection_id: str) -> bool:
        """
        Unregister a WebSocket connection.
        
        Args:
            ws_connection_id: WebSocket connection ID
            
        Returns:
            True if unregistered successfully
        """
        async with self._lock:
            session_id = self.ws_to_session.pop(ws_connection_id, None)
            if session_id and session_id in self.sessions:
                session = self.sessions[session_id]
                if session.current_ws_connection_id == ws_connection_id:
                    session.current_ws_connection_id = None
                    logger.info(f"Unregistered WebSocket {ws_connection_id} from session {session_id}")
                    return True
            return False
    
    async def unregister_rtc_connection(self, rtc_connection_id: str) -> bool:
        """
        Unregister a WebRTC connection.
        
        Args:
            rtc_connection_id: WebRTC connection ID
            
        Returns:
            True if unregistered successfully
        """
        async with self._lock:
            session_id = self.rtc_to_session.pop(rtc_connection_id, None)
            if session_id and session_id in self.sessions:
                session = self.sessions[session_id]
                if session.current_rtc_connection_id == rtc_connection_id:
                    session.current_rtc_connection_id = None
                    logger.info(f"Unregistered RTC {rtc_connection_id} from session {session_id}")
                    return True
            return False
    
    async def cleanup_stale_sessions(self, max_age_hours: float = 24.0) -> int:
        """
        Clean up stale sessions older than max_age_hours.
        
        Args:
            max_age_hours: Maximum age in hours before cleanup
            
        Returns:
            Number of sessions cleaned up
        """
        now = datetime.now()
        max_age = timedelta(hours=max_age_hours)
        stale_sessions = []
        
        async with self._lock:
            for session_id, session in self.sessions.items():
                if now - session.last_activity > max_age:
                    stale_sessions.append(session_id)
        
        cleaned = 0
        for session_id in stale_sessions:
            async with self._lock:
                session = self.sessions.pop(session_id, None)
                if session:
                    # Clean up mappings
                    if session.current_ws_connection_id:
                        self.ws_to_session.pop(session.current_ws_connection_id, None)
                    if session.current_rtc_connection_id:
                        self.rtc_to_session.pop(session.current_rtc_connection_id, None)
                    cleaned += 1
                    logger.info(f"Cleaned up stale session: {session_id}")
        
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} stale sessions")
        
        return cleaned
    
    async def get_stats(self) -> Dict:
        """
        Get session manager statistics.
        
        Returns:
            Dictionary with statistics
        """
        async with self._lock:
            return {
                "total_sessions": len(self.sessions),
                "active_ws_connections": len(self.ws_to_session),
                "active_rtc_connections": len(self.rtc_to_session),
                "sessions": [
                    {
                        "session_id": session.session_id,
                        "current_thread": session.current_thread_id,
                        "ws_connection": session.current_ws_connection_id,
                        "rtc_connection": session.current_rtc_connection_id,
                        "created_at": session.created_at.isoformat(),
                        "last_activity": session.last_activity.isoformat(),
                        "thread_history": session.thread_history
                    }
                    for session in self.sessions.values()
                ]
            }

# Global singleton instance
session_manager = SessionManager()

# Export for easy access
__all__ = ['SessionManager', 'session_manager', 'SessionInfo']