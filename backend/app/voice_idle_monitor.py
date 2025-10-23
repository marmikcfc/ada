"""
Voice Idle Monitor Service

This module monitors voice connections for idle timeout and sends warnings/disconnections
based on configured thresholds.
"""

import asyncio
import time
import logging
from typing import Dict, Set
from datetime import datetime

from app.config import config
from app.connection_manager import connection_manager

logger = logging.getLogger(__name__)


class VoiceIdleMonitor:
    """Service that monitors voice connections for idle timeout"""
    
    def __init__(self):
        self.is_running = False
        self.monitor_task = None
        self.warned_connections: Set[str] = set()  # Track connections that have been warned
        
        # Load configuration
        self.idle_timeout = config.voice.voice_idle_timeout
        self.check_interval = config.voice.voice_idle_check_interval
        self.warning_time = config.voice.voice_idle_warning_time
        
        logger.info(f"VoiceIdleMonitor initialized with timeout={self.idle_timeout}s, "
                   f"check_interval={self.check_interval}s, warning_time={self.warning_time}s")
    
    async def start(self):
        """Start the idle monitoring service"""
        if self.is_running:
            logger.warning("VoiceIdleMonitor is already running")
            return
        
        if self.idle_timeout <= 0:
            logger.info("Voice idle timeout is disabled (timeout=0)")
            return
        
        self.is_running = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("VoiceIdleMonitor started")
    
    async def stop(self):
        """Stop the idle monitoring service"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        self.warned_connections.clear()
        logger.info("VoiceIdleMonitor stopped")
    
    async def _monitor_loop(self):
        """Main monitoring loop that checks connections periodically"""
        while self.is_running:
            try:
                await self._check_idle_connections()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in voice idle monitor loop: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)
    
    async def _check_idle_connections(self):
        """Check all connections for idle timeout"""
        try:
            # Iterate through all connections directly
            for connection_id, context in connection_manager.connections.items():
                # Skip if voice idle is disabled for this connection
                if not context.voice_idle_enabled or context.voice_idle_timeout <= 0:
                    self.warned_connections.discard(connection_id)
                    continue
                
                # Skip connections without voice
                if not context.voice_agent:
                    self.warned_connections.discard(connection_id)
                    continue
                
                # Skip if idle timer is not active
                if not context.voice_idle_timer_active or not context.last_bot_speech_end_time:
                    self.warned_connections.discard(connection_id)
                    continue
                
                # Calculate idle time
                current_time = time.time()
                seconds_idle = current_time - context.last_bot_speech_end_time
                
                # Use connection-specific timeout values
                timeout = context.voice_idle_timeout
                warning_time = context.voice_idle_warning_time
                
                # Check if we need to disconnect
                if seconds_idle >= timeout:
                    await self._handle_idle_timeout(connection_id)
                    self.warned_connections.discard(connection_id)
                
                # Check if we need to warn
                elif seconds_idle >= (timeout - warning_time):
                    if connection_id not in self.warned_connections:
                        remaining = timeout - seconds_idle
                        await self._send_idle_warning(connection_id, remaining)
                        self.warned_connections.add(connection_id)
                
                # Remove from warned set if back to active
                else:
                    self.warned_connections.discard(connection_id)
                    
        except Exception as e:
            logger.error(f"Error checking idle connections: {e}", exc_info=True)
    
    async def _send_idle_warning(self, connection_id: str, seconds_remaining: float):
        """Send idle warning to a connection"""
        try:
            logger.info(f"Sending idle warning to connection {connection_id} "
                       f"({seconds_remaining:.0f}s remaining)")
            
            # Get connection context
            context = connection_manager.connections.get(connection_id)
            if not context:
                return
            
            # Create warning message
            warning_message = {
                "type": "voice_idle_warning",
                "message": f"Voice connection will disconnect in {int(seconds_remaining)} seconds due to inactivity",
                "seconds_remaining": int(seconds_remaining),
                "connection_id": connection_id,
                "timestamp": time.time()
            }
            
            # Send to connection's message queue
            await context.message_queue.put(warning_message)
            
        except Exception as e:
            logger.error(f"Error sending idle warning to {connection_id}: {e}")
    
    async def _handle_idle_timeout(self, connection_id: str):
        """Handle idle timeout for a connection"""
        try:
            logger.info(f"Handling idle timeout for connection {connection_id}")
            
            # Get connection context
            context = connection_manager.connections.get(connection_id)
            if not context or not context.voice_agent:
                return
            
            # Send disconnect notification
            disconnect_message = {
                "type": "voice_idle_disconnect",
                "message": "Voice connection disconnected due to inactivity",
                "reason": "idle_timeout",
                "connection_id": connection_id,
                "timestamp": time.time()
            }
            
            # Send to connection's message queue
            await context.message_queue.put(disconnect_message)
            
            # Disconnect the voice connection
            if context.webrtc_connection:
                try:
                    # Close the WebRTC connection
                    await context.webrtc_connection.close()
                    logger.info(f"Closed WebRTC connection for {connection_id} due to idle timeout")
                except Exception as e:
                    logger.error(f"Error closing WebRTC connection: {e}")
            
            # Unregister voice agent
            await connection_manager.unregister_voice_agent(connection_id)
            
        except Exception as e:
            logger.error(f"Error handling idle timeout for {connection_id}: {e}")
    
    def reset_warning(self, connection_id: str):
        """Reset warning state for a connection (called when user becomes active)"""
        self.warned_connections.discard(connection_id)


# Global instance
voice_idle_monitor = VoiceIdleMonitor()