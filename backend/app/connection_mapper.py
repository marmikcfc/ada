"""
Ada Interaction Engine - Connection ID Mapper

This module provides a mapping service between WebRTC connection IDs (pc_id/thread_id)
and WebSocket connection IDs to enable proper message routing between voice and text channels.
"""

from typing import Dict, Optional, Set
import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConnectionMapper:
    """
    Maps WebRTC connection IDs to WebSocket connection IDs.
    
    This is necessary because:
    - WebRTC connections use pc_id/thread_id for identification
    - WebSocket connections use connection_id for identification
    - Voice messages need to be routed to the correct WebSocket subscribers
    """
    
    def __init__(self):
        # Core mappings
        self.rtc_to_ws: Dict[str, str] = {}  # Maps WebRTC ID -> WebSocket ID
        self.ws_to_rtc: Dict[str, str] = {}  # Maps WebSocket ID -> WebRTC ID
        
        # Track active connections
        self.active_ws: Set[str] = set()
        self.active_rtc: Set[str] = set()
        
        # Connection metadata for debugging
        self.connection_times: Dict[str, datetime] = {}
        
        # Thread safety
        self._lock = asyncio.Lock()
    
    async def link_connections(self, ws_id: str, rtc_id: str) -> bool:
        """
        Link WebRTC and WebSocket connection IDs.
        
        Args:
            ws_id: WebSocket connection ID
            rtc_id: WebRTC connection ID (pc_id or thread_id)
            
        Returns:
            True if linking successful, False if already linked
        """
        async with self._lock:
            # Check if already linked
            if rtc_id in self.rtc_to_ws:
                existing_ws = self.rtc_to_ws[rtc_id]
                if existing_ws != ws_id:
                    logger.warning(
                        f"RTC {rtc_id} already linked to {existing_ws}, "
                        f"updating to {ws_id}"
                    )
                    # Remove old mapping
                    self.ws_to_rtc.pop(existing_ws, None)
                else:
                    logger.debug(f"RTC {rtc_id} already linked to {ws_id}")
                    return False
            
            # Check if WebSocket already has a different RTC connection
            if ws_id in self.ws_to_rtc:
                old_rtc = self.ws_to_rtc[ws_id]
                if old_rtc != rtc_id:
                    logger.info(
                        f"WebSocket {ws_id} updating RTC connection from {old_rtc} to {rtc_id}"
                    )
                    # Remove old mapping
                    self.rtc_to_ws.pop(old_rtc, None)
            
            # Create bidirectional mapping
            self.rtc_to_ws[rtc_id] = ws_id
            self.ws_to_rtc[ws_id] = rtc_id
            
            # Track active connections
            self.active_ws.add(ws_id)
            self.active_rtc.add(rtc_id)
            
            # Track connection time
            self.connection_times[rtc_id] = datetime.now()
            
            logger.info(f"✅ Linked WebRTC {rtc_id} ↔ WebSocket {ws_id}")
            return True
    
    async def get_ws_id(self, rtc_id: str) -> Optional[str]:
        """
        Get WebSocket ID for a WebRTC connection.
        
        Args:
            rtc_id: WebRTC connection ID
            
        Returns:
            WebSocket ID if found, None otherwise
        """
        return self.rtc_to_ws.get(rtc_id)
    
    async def get_rtc_id(self, ws_id: str) -> Optional[str]:
        """
        Get WebRTC ID for a WebSocket connection.
        
        Args:
            ws_id: WebSocket connection ID
            
        Returns:
            WebRTC ID if found, None otherwise
        """
        return self.ws_to_rtc.get(ws_id)
    
    async def unlink_rtc(self, rtc_id: str) -> bool:
        """
        Remove mappings when WebRTC disconnects.
        
        Args:
            rtc_id: WebRTC connection ID to unlink
            
        Returns:
            True if unlinked successfully, False if not found
        """
        async with self._lock:
            ws_id = self.rtc_to_ws.pop(rtc_id, None)
            if ws_id:
                self.ws_to_rtc.pop(ws_id, None)
                logger.info(f"Unlinked WebRTC {rtc_id} from WebSocket {ws_id}")
                
                self.active_rtc.discard(rtc_id)
                self.connection_times.pop(rtc_id, None)
                return True
            
            logger.debug(f"WebRTC {rtc_id} not found in mappings")
            return False
    
    async def unlink_ws(self, ws_id: str) -> bool:
        """
        Remove mappings when WebSocket disconnects.
        
        Args:
            ws_id: WebSocket connection ID to unlink
            
        Returns:
            True if unlinked successfully, False if not found
        """
        async with self._lock:
            rtc_id = self.ws_to_rtc.pop(ws_id, None)
            if rtc_id:
                self.rtc_to_ws.pop(rtc_id, None)
                logger.info(f"Unlinked WebSocket {ws_id} from WebRTC {rtc_id}")
                
                self.active_ws.discard(ws_id)
                return True
            
            logger.debug(f"WebSocket {ws_id} not found in mappings")
            return False
    
    async def get_stats(self) -> Dict:
        """
        Get current mapping statistics for debugging.
        
        Returns:
            Dictionary with mapping statistics
        """
        async with self._lock:
            return {
                "total_rtc_connections": len(self.rtc_to_ws),
                "total_ws_connections": len(self.ws_to_rtc),
                "active_ws": len(self.active_ws),
                "active_rtc": len(self.active_rtc),
                "mappings": [
                    {
                        "rtc_id": rtc_id,
                        "ws_id": ws_id,
                        "connected_at": self.connection_times.get(rtc_id, "unknown")
                    }
                    for rtc_id, ws_id in self.rtc_to_ws.items()
                ]
            }
    
    async def cleanup_stale_connections(self, max_age_hours: float = 24.0) -> int:
        """
        Clean up stale connections older than max_age_hours.
        
        Args:
            max_age_hours: Maximum age in hours before cleanup
            
        Returns:
            Number of connections cleaned up
        """
        now = datetime.now()
        max_age = timedelta(hours=max_age_hours)
        stale_connections = []
        
        async with self._lock:
            for rtc_id, connected_at in self.connection_times.items():
                if now - connected_at > max_age:
                    stale_connections.append(rtc_id)
        
        cleaned = 0
        for rtc_id in stale_connections:
            if await self.unlink_rtc(rtc_id):
                cleaned += 1
                logger.info(f"Cleaned up stale connection: {rtc_id}")
        
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} stale connections")
        
        return cleaned
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"ConnectionMapper("
            f"rtc_mappings={len(self.rtc_to_ws)}, "
            f"ws_mappings={len(self.ws_to_rtc)})"
        )

# Global singleton instance
connection_mapper = ConnectionMapper()

# Export for easy access
__all__ = ['ConnectionMapper', 'connection_mapper']