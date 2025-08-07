"""
Ada Interaction Engine - Voice Broadcast Manager

This module provides an in-memory broadcast manager that distributes voice messages
to all relevant connections, solving the cross-contamination issue where multiple
voice bridges compete for messages from a single queue.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
import time

logger = logging.getLogger(__name__)

# Connection mapper import removed - no longer needed for ID translation

@dataclass
class VoiceSubscription:
    """Represents a voice message subscription for a connection"""
    connection_id: str
    queue: asyncio.Queue
    voice_thread_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    message_count: int = 0

    def matches_message(self, message: dict) -> bool:
        """Check if this subscription should receive the given message"""
        if not isinstance(message, dict):
            return False
        
        message_type = message.get('type', '')
        
        # Only process voice-related message types
        voice_message_types = {
            'user_transcription',      # User voice transcriptions
            'immediate_voice_response', # Fast-path voice responses
            'voice_response'           # Complete voice responses
        }
        
        if message_type not in voice_message_types:
            return False
        
        # Check for connection-specific markers
        message_connection_id = message.get('connection_id')
        if message_connection_id and message_connection_id != self.connection_id:
            return False
        
        # Check for thread-based matching
        message_thread_id = message.get('threadId') or message.get('thread_id')
        if message_thread_id:
            # If this subscription has a voice thread, only match messages for that thread
            if self.voice_thread_id and message_thread_id != self.voice_thread_id:
                return False
        
        return True

class VoiceBroadcastManager:
    """
    In-memory broadcast manager for voice messages.
    
    This manager maintains a list of subscribers (voice bridges) and broadcasts
    voice messages to all relevant subscribers based on connection and thread filtering.
    """
    
    def __init__(self):
        self._subscribers: Dict[str, VoiceSubscription] = {}
        self._lock = asyncio.Lock()
        self._stats = {
            'total_broadcasts': 0,
            'total_deliveries': 0,
            'failed_deliveries': 0,
            'active_subscribers': 0
        }
    
    async def subscribe(
        self, 
        connection_id: str, 
        voice_thread_id: Optional[str] = None,
        queue_maxsize: int = 100
    ) -> asyncio.Queue:
        """
        Subscribe a connection to voice messages.
        
        Args:
            connection_id: WebSocket connection ID
            voice_thread_id: Optional thread ID for thread-specific filtering
            queue_maxsize: Maximum size for the subscriber's queue
            
        Returns:
            Queue that will receive voice messages for this connection
        """
        async with self._lock:
            # Create new queue for this subscriber
            queue = asyncio.Queue(maxsize=queue_maxsize)
            
            subscription = VoiceSubscription(
                connection_id=connection_id,
                queue=queue,
                voice_thread_id=voice_thread_id
            )
            
            self._subscribers[connection_id] = subscription
            self._stats['active_subscribers'] = len(self._subscribers)
            
            logger.info(f"Voice broadcast subscription created for connection {connection_id} "
                       f"with thread_id {voice_thread_id}")
            
            return queue
    
    async def unsubscribe(self, connection_id: str) -> bool:
        """
        Unsubscribe a connection from voice messages.
        
        Args:
            connection_id: WebSocket connection ID
            
        Returns:
            True if unsubscription successful, False if connection wasn't subscribed
        """
        async with self._lock:
            subscription = self._subscribers.pop(connection_id, None)
            if subscription:
                # Clear any remaining messages in the queue
                while not subscription.queue.empty():
                    try:
                        subscription.queue.get_nowait()
                        subscription.queue.task_done()
                    except asyncio.QueueEmpty:
                        break
                
                self._stats['active_subscribers'] = len(self._subscribers)
                logger.info(f"Voice broadcast subscription removed for connection {connection_id} "
                           f"(processed {subscription.message_count} messages)")
                return True
            
            logger.warning(f"Attempted to unsubscribe unknown connection: {connection_id}")
            return False
    
    async def update_thread_id(self, connection_id: str, voice_thread_id: str) -> bool:
        """
        Update the thread ID for an existing subscription.
        
        Args:
            connection_id: WebSocket connection ID
            voice_thread_id: New thread ID
            
        Returns:
            True if update successful, False if connection not found
        """
        async with self._lock:
            subscription = self._subscribers.get(connection_id)
            if subscription:
                old_thread_id = subscription.voice_thread_id
                subscription.voice_thread_id = voice_thread_id
                subscription.last_activity = time.time()
                
                logger.info(f"Updated voice thread for connection {connection_id}: "
                           f"{old_thread_id} -> {voice_thread_id}")
                return True
            
            logger.warning(f"Attempted to update thread for unknown connection: {connection_id}")
            return False
    
    # broadcast_from_rtc method removed - no longer needed
    # Voice agents now call broadcast() directly with the correct connection_id
    
    async def broadcast(self, message: dict) -> int:
        """
        Broadcast a voice message to all relevant subscribers.
        
        Args:
            message: Voice message to broadcast
            
        Returns:
            Number of subscribers that received the message
        """
        if not isinstance(message, dict):
            logger.warning(f"Invalid message type for broadcast: {type(message)}")
            return 0
        
        message_type = message.get('type', 'unknown')
        message_id = message.get('id', 'no-id')
        
        async with self._lock:
            subscribers = list(self._subscribers.values())
        
        if not subscribers:
            logger.debug(f"No subscribers for voice message {message_type} (ID: {message_id})")
            return 0
        
        delivery_tasks = []
        matching_subscribers = []
        
        # Find matching subscribers
        for subscription in subscribers:
            if subscription.matches_message(message):
                matching_subscribers.append(subscription)
                delivery_tasks.append(self._deliver_message(subscription, message))
        
        if not matching_subscribers:
            logger.debug(f"No matching subscribers for message {message_type} (ID: {message_id})")
            return 0
        
        # Execute all deliveries concurrently
        results = await asyncio.gather(*delivery_tasks, return_exceptions=True)
        
        # Count successful deliveries
        successful_deliveries = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to deliver message to {matching_subscribers[i].connection_id}: {result}")
                self._stats['failed_deliveries'] += 1
            else:
                successful_deliveries += 1
                self._stats['total_deliveries'] += 1
        
        self._stats['total_broadcasts'] += 1
        
        logger.info(f"✅ Broadcasted {message_type} (ID: {message_id}) to "
                   f"{successful_deliveries}/{len(matching_subscribers)} subscribers")
        
        return successful_deliveries
    
    async def _deliver_message(self, subscription: VoiceSubscription, message: dict) -> None:
        """
        Deliver a message to a specific subscription.
        
        Args:
            subscription: Target subscription
            message: Message to deliver
        """
        try:
            # Try to put message without blocking (fail fast if queue is full)
            subscription.queue.put_nowait(message)
            subscription.message_count += 1
            subscription.last_activity = time.time()
            
            logger.debug(f"Delivered message {message.get('type')} to connection "
                        f"{subscription.connection_id}")
            
        except asyncio.QueueFull:
            logger.warning(f"Queue full for connection {subscription.connection_id}, "
                          f"dropping message {message.get('type')}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error delivering message to {subscription.connection_id}: {e}")
            raise
    
    async def get_subscriber_queue(self, connection_id: str) -> Optional[asyncio.Queue]:
        """
        Get the queue for a specific subscriber.
        
        Args:
            connection_id: WebSocket connection ID
            
        Returns:
            Queue for the subscriber or None if not found
        """
        async with self._lock:
            subscription = self._subscribers.get(connection_id)
            return subscription.queue if subscription else None
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get broadcast manager statistics.
        
        Returns:
            Dictionary containing statistics
        """
        async with self._lock:
            stats = self._stats.copy()
            stats['subscribers'] = []
            
            for subscription in self._subscribers.values():
                stats['subscribers'].append({
                    'connection_id': subscription.connection_id,
                    'voice_thread_id': subscription.voice_thread_id,
                    'created_at': subscription.created_at,
                    'last_activity': subscription.last_activity,
                    'message_count': subscription.message_count,
                    'queue_size': subscription.queue.qsize()
                })
            
            return stats
    
    async def cleanup_stale_subscriptions(self, max_idle_time: float = 3600.0) -> int:
        """
        Clean up stale subscriptions that haven't been active recently.
        
        Args:
            max_idle_time: Maximum idle time in seconds before cleanup
            
        Returns:
            Number of subscriptions cleaned up
        """
        current_time = time.time()
        stale_connections = []
        
        async with self._lock:
            for connection_id, subscription in self._subscribers.items():
                if current_time - subscription.last_activity > max_idle_time:
                    stale_connections.append(connection_id)
        
        cleanup_count = 0
        for connection_id in stale_connections:
            if await self.unsubscribe(connection_id):
                cleanup_count += 1
        
        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} stale voice subscriptions")
        
        return cleanup_count
    
    def get_subscriber_count(self) -> int:
        """Get the current number of active subscribers."""
        return len(self._subscribers)

# Global broadcast manager instance
voice_broadcast_manager = VoiceBroadcastManager()