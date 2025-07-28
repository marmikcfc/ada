"""
Ada Interaction Engine - Connection-Aware Voice Manager

This module replaces the global voice agent registry with connection-aware
voice management, enabling proper isolation between concurrent voice users.
"""

import logging
from typing import Optional, Any, Dict, List
from app.connection_manager import connection_manager

logger = logging.getLogger(__name__)

class ConnectionAwareVoiceManager:
    """
    Manager for voice agents that are tied to specific WebSocket connections.
    This replaces the global voice agent registry for better isolation.
    """
    
    def __init__(self):
        self.connection_manager = connection_manager
        # Maintain a mapping from thread_id to connection_id for routing
        self.thread_to_connection_map: Dict[str, str] = {}
    
    async def register_voice_agent(self, connection_id: str, voice_agent: Any, webrtc_connection: Any, voice_thread_id: str) -> bool:
        """
        Register a voice agent for a specific connection.
        
        Args:
            connection_id: WebSocket connection ID
            voice_agent: VoiceInterfaceAgent instance
            webrtc_connection: SmallWebRTCConnection instance
            voice_thread_id: Thread ID for voice conversations
            
        Returns:
            True if registration successful, False otherwise
        """
        success = await self.connection_manager.register_voice_agent(
            connection_id, voice_agent, webrtc_connection, voice_thread_id
        )
        
        if success:
            # Maintain thread-to-connection mapping for routing
            self.thread_to_connection_map[voice_thread_id] = connection_id
            logger.info(f"Voice agent registered for connection {connection_id} with thread {voice_thread_id}")
        else:
            logger.warning(f"Failed to register voice agent for connection {connection_id}")
        
        return success
    
    async def unregister_voice_agent(self, connection_id: str) -> bool:
        """
        Unregister voice agent for a specific connection.
        
        Args:
            connection_id: WebSocket connection ID
            
        Returns:
            True if unregistration successful, False otherwise
        """
        # Find and remove thread mapping first
        thread_id_to_remove = None
        for thread_id, conn_id in self.thread_to_connection_map.items():
            if conn_id == connection_id:
                thread_id_to_remove = thread_id
                break
        
        if thread_id_to_remove:
            del self.thread_to_connection_map[thread_id_to_remove]
            logger.info(f"Removed thread mapping {thread_id_to_remove} -> {connection_id}")
        
        success = await self.connection_manager.unregister_voice_agent(connection_id)
        
        if success:
            logger.info(f"Voice agent unregistered for connection {connection_id}")
        
        return success
    
    async def get_voice_agent_by_connection(self, connection_id: str) -> Optional[Any]:
        """
        Get voice agent for a specific connection.
        
        Args:
            connection_id: WebSocket connection ID
            
        Returns:
            VoiceInterfaceAgent instance or None
        """
        return await self.connection_manager.get_voice_agent_by_connection(connection_id)
    
    async def get_voice_agent_by_thread_id(self, thread_id: str) -> tuple[Optional[Any], Optional[str]]:
        """
        Get voice agent and connection ID by thread ID.
        
        Args:
            thread_id: Voice conversation thread ID
            
        Returns:
            Tuple of (VoiceInterfaceAgent, connection_id) or (None, None)
        """
        return await self.connection_manager.get_voice_agent_by_thread_id(thread_id)
    
    async def inject_tts_voice_over(self, voice_text: str, target_thread_id: Optional[str] = None, target_connection_id: Optional[str] = None) -> bool:
        """
        Inject TTS voice-over text to specific voice agent(s).
        This replaces the global broadcast function with targeted injection.
        
        Args:
            voice_text: Text to be spoken
            target_thread_id: Specific thread ID to target (preferred)
            target_connection_id: Specific connection ID to target (fallback)
            
        Returns:
            True if injection successful, False otherwise
        """
        if not voice_text or not voice_text.strip():
            logger.debug("No voice text to inject")
            return False
        
        # Try to find target by thread ID first
        if target_thread_id:
            voice_agent, connection_id = await self.get_voice_agent_by_thread_id(target_thread_id)
            if voice_agent and connection_id:
                return await self.connection_manager.inject_tts_to_connection(connection_id, voice_text)
            else:
                logger.warning(f"No voice agent found for thread_id: {target_thread_id}")
                return False
        
        # Fallback to connection ID
        if target_connection_id:
            return await self.connection_manager.inject_tts_to_connection(target_connection_id, voice_text)
        
        logger.warning("No target specified for TTS injection - cannot inject without target")
        return False
    
    async def get_active_voice_connections(self) -> List[Dict[str, Any]]:
        """
        Get list of active voice connections.
        
        Returns:
            List of voice connection info dictionaries
        """
        metrics = await self.connection_manager.get_connection_metrics()
        active_voice_connections = []
        
        for conn in metrics["connections"]:
            if conn["has_voice_agent"]:
                active_voice_connections.append({
                    "connection_id": conn["connection_id"],
                    "client_id": conn["client_id"],
                    "voice_thread_id": conn["voice_thread_id"],
                    "state": conn["state"]
                })
        
        return active_voice_connections
    
    async def get_voice_connection_count(self) -> int:
        """
        Get count of active voice connections.
        
        Returns:
            Number of active voice connections
        """
        connections = await self.get_active_voice_connections()
        return len(connections)
    
    def get_connection_id_by_thread(self, thread_id: str) -> Optional[str]:
        """
        Get connection ID for a given thread ID.
        
        Args:
            thread_id: Voice conversation thread ID
            
        Returns:
            Connection ID or None if not found
        """
        return self.thread_to_connection_map.get(thread_id)
    
    def get_all_thread_mappings(self) -> Dict[str, str]:
        """
        Get all thread-to-connection mappings.
        
        Returns:
            Dictionary mapping thread_id to connection_id
        """
        return self.thread_to_connection_map.copy()

# Global instance
voice_manager = ConnectionAwareVoiceManager()