"""
Ada Interaction Engine - Per-Connection Chat Routes

This module provides the new WebSocket handler that supports configuration-first
handshake and per-connection resource management for multi-tenant scenarios.
"""

import json
import uuid
import asyncio
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.models import (
    ConnectionConfig, ConnectionConfigMessage, ConnectionEstablishedMessage,
    ErrorMessage, ChatMessage, ConnectionState
)
from app.connection_manager import connection_manager
from app.chat_history_manager import chat_history_manager

logger = logging.getLogger(__name__)

# Router for per-connection chat endpoints
router = APIRouter(tags=["per-connection-chat"])

@router.websocket("/ws/per-connection-messages")
async def websocket_per_connection_messages(websocket: WebSocket):
    """
    Enhanced WebSocket handler with configuration-first handshake
    and per-connection resource management.
    
    Flow:
    1. Accept WebSocket connection
    2. Send connection_established message
    3. Wait for connection_config message from client
    4. Validate and configure connection (MCP + visualization)
    5. Start per-connection message processing
    """
    await websocket.accept()
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    connection_id = None
    
    try:
        # Register connection with manager
        connection_id = await connection_manager.register_connection(websocket)
        logger.info(f"WebSocket connection registered: {connection_id} from {client_info}")
        
        # Send initial establishment message
        establishment_msg = ConnectionEstablishedMessage(connection_id=connection_id)
        await websocket.send_text(establishment_msg.model_dump_json())
        
        # Wait for configuration message with timeout
        config_success = await _wait_for_configuration(websocket, connection_id)
        if not config_success:
            return
        
        # Start per-connection message processing
        context = connection_manager.connections[connection_id]
        await _run_connection_loops(context)
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id or 'unknown'} from {client_info}")
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id or 'unknown'}: {e}", exc_info=True)
        
        # Send error message if websocket is still connected
        try:
            error_msg = ErrorMessage(
                message=f"Connection error: {str(e)}",
                connection_id=connection_id
            )
            await websocket.send_text(error_msg.model_dump_json())
        except:
            pass
    finally:
        # Cleanup connection resources
        if connection_id:
            await connection_manager.cleanup_connection(connection_id)

async def _wait_for_configuration(websocket: WebSocket, connection_id: str) -> bool:
    """Wait for and process configuration message"""
    try:
        # Wait for configuration with 30 second timeout
        config_data = await asyncio.wait_for(
            websocket.receive_text(), 
            timeout=30.0
        )
        
        # Parse configuration message
        try:
            config_payload = json.loads(config_data)
            config_message = ConnectionConfigMessage(**config_payload)
        except (json.JSONDecodeError, ValidationError) as e:
            error_msg = ErrorMessage(
                message=f"Invalid configuration format: {str(e)}",
                error_code="INVALID_CONFIG_FORMAT",
                connection_id=connection_id
            )
            await websocket.send_text(error_msg.model_dump_json())
            return False
        
        # Configure the connection
        success = await connection_manager.configure_connection(
            connection_id, config_message.config
        )
        
        return success
        
    except asyncio.TimeoutError:
        error_msg = ErrorMessage(
            message="Configuration timeout. Please send config within 30 seconds.",
            error_code="CONFIG_TIMEOUT",
            connection_id=connection_id
        )
        await websocket.send_text(error_msg.model_dump_json())
        return False
    except Exception as e:
        logger.error(f"Configuration error for {connection_id}: {e}")
        error_msg = ErrorMessage(
            message=f"Configuration error: {str(e)}",
            error_code="CONFIG_ERROR",
            connection_id=connection_id
        )
        await websocket.send_text(error_msg.model_dump_json())
        return False

async def _run_connection_loops(context):
    """Run sender and receiver loops for the connection"""
    try:
        # Start both sender and receiver tasks
        sender_task = asyncio.create_task(_per_connection_sender(context))
        receiver_task = asyncio.create_task(_per_connection_receiver(context))
        
        # Wait for either task to complete
        done, pending = await asyncio.wait(
            {sender_task, receiver_task}, 
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
                
    except Exception as e:
        logger.error(f"Connection loop error for {context.connection_id}: {e}")

async def _per_connection_sender(context):
    """Send messages from connection's queue to WebSocket"""
    while context.state in [ConnectionState.ACTIVE, ConnectionState.READY]:
        try:
            # Get message from connection's queue
            message = await asyncio.wait_for(
                context.message_queue.get(), 
                timeout=1.0
            )
            
            # Send to WebSocket
            serialized = message if isinstance(message, str) else json.dumps(message)
            await context.websocket.send_text(serialized)
            
            # Mark task as done
            context.message_queue.task_done()
            context.last_activity = asyncio.get_event_loop().time()
            
        except asyncio.TimeoutError:
            # No message available, continue
            continue
        except Exception as e:
            logger.error(f"Sender error for {context.connection_id}: {e}")
            break

async def _per_connection_receiver(context):
    """Receive messages from WebSocket and process them"""
    while context.state in [ConnectionState.ACTIVE, ConnectionState.READY]:
        try:
            # Receive message from WebSocket
            data = await context.websocket.receive_text()
            context.last_activity = asyncio.get_event_loop().time()
            
            # Parse message
            try:
                payload = json.loads(data)
                chat_message = ChatMessage(**payload)
            except (json.JSONDecodeError, ValidationError) as e:
                logger.warning(f"Invalid message format from {context.connection_id}: {e}")
                continue
            
            # Process chat message
            await _process_per_connection_chat(context, chat_message)
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for {context.connection_id}")
            break
        except Exception as e:
            logger.error(f"Receiver error for {context.connection_id}: {e}")
            break

async def _process_per_connection_chat(context, chat_message: ChatMessage):
    """Process a chat message using connection's resources"""
    try:
        message = chat_message.message
        thread_id = chat_message.thread_id or str(uuid.uuid4())
        
        logger.info(f"Processing chat for {context.connection_id}: {message[:100]}...")
        
        # Get conversation history from connection's storage
        history = await _get_connection_history(context.connection_id, thread_id)
        
        # Add user message to history
        await _store_connection_message(
            context.connection_id, thread_id, "user", message
        )
        
        # Process through connection's MCP client
        if not context.mcp_client:
            raise Exception("MCP client not available for this connection")
        
        response = await context.mcp_client.chat_with_tools(
            user_message=message,
            conversation_history=history
        )
        
        logger.info(f"MCP response for {context.connection_id}: {response[:100]}...")
        
        # Add assistant response to history
        await _store_connection_message(
            context.connection_id, thread_id, "assistant", response
        )
        
        # Get updated history for processor
        updated_history = await _get_connection_history(context.connection_id, thread_id)
        
        # Queue for enhancement processing
        await context.raw_output_queue.put({
            "assistant_response": response,
            "history": updated_history,
            "metadata": {
                "connection_id": context.connection_id,
                "thread_id": thread_id,
                "message_id": str(uuid.uuid4()),
                "source": "per_connection_chat"
            }
        })
        
        logger.info(f"Queued response for enhancement processing: {context.connection_id}")
        
    except Exception as e:
        logger.error(f"Chat processing error for {context.connection_id}: {e}", exc_info=True)
        
        # Send error response
        error_card = {
            "component": "Callout",
            "props": {
                "variant": "error",
                "title": "Chat Error",
                "description": f"Failed to process your message: {str(e)}"
            }
        }
        
        from app.queues import create_text_chat_response
        error_response = create_text_chat_response(
            content=f'<content>{json.dumps(error_card)}</content>',
            thread_id=chat_message.thread_id
        )
        
        await context.message_queue.put(error_response)

async def _get_connection_history(connection_id: str, thread_id: str) -> list:
    """Get conversation history for a specific connection and thread"""
    try:
        # Use the global chat history manager with connection prefix
        prefixed_thread_id = f"{connection_id}:{thread_id}"
        return await chat_history_manager.get_recent_history(prefixed_thread_id)
    except Exception as e:
        logger.error(f"Error getting history for {connection_id}:{thread_id}: {e}")
        return []

async def _store_connection_message(connection_id: str, thread_id: str, role: str, content: str):
    """Store a message in the connection's conversation history"""
    try:
        # Use the global chat history manager with connection prefix
        prefixed_thread_id = f"{connection_id}:{thread_id}"
        
        if role == "user":
            await chat_history_manager.add_user_message(prefixed_thread_id, content)
        elif role == "assistant":
            await chat_history_manager.add_assistant_message(prefixed_thread_id, content)
        else:
            logger.warning(f"Unknown message role: {role}")
            
    except Exception as e:
        logger.error(f"Error storing message for {connection_id}:{thread_id}: {e}")

# Add endpoint for connection metrics
@router.get("/connections/metrics")
async def get_connection_metrics():
    """Get metrics for all active connections"""
    return await connection_manager.get_connection_metrics()

# Add endpoint to list active connections
@router.get("/connections")
async def list_connections():
    """List all active connections"""
    metrics = await connection_manager.get_connection_metrics()
    return {
        "total": metrics["total_connections"],
        "by_state": metrics["connections_by_state"],
        "connections": [
            {
                "connection_id": conn["connection_id"],
                "client_id": conn["client_id"],
                "state": conn["state"],
                "mcp_servers": conn["mcp_servers"],
                "viz_provider": conn["viz_provider"],
                "uptime": conn["last_activity"] - conn["created_at"]
            }
            for conn in metrics["connections"]
        ]
    }

# Add endpoint to get connection details
@router.get("/connections/{connection_id}")
async def get_connection_details(connection_id: str):
    """Get details for a specific connection"""
    if connection_id not in connection_manager.connections:
        return {"error": "Connection not found"}
    
    context = connection_manager.connections[connection_id]
    
    return {
        "connection_id": connection_id,
        "client_id": context.config.client_id if context.config else None,
        "state": context.state.value,
        "created_at": context.created_at,
        "last_activity": context.last_activity,
        "mcp_servers": len(context.mcp_client.sessions) if context.mcp_client else 0,
        "mcp_tools": len(context.mcp_client.available_tools) if context.mcp_client else 0,
        "viz_provider": context.config.visualization_provider.provider_type if context.config else None,
        "queue_sizes": {
            "message_queue": context.message_queue.qsize() if context.message_queue else 0,
            "raw_output_queue": context.raw_output_queue.qsize() if context.raw_output_queue else 0
        },
        "metrics": {
            "messages_sent": context.metrics.messages_sent,
            "messages_received": context.metrics.messages_received,
            "mcp_calls": context.metrics.mcp_calls,
            "viz_requests": context.metrics.viz_requests,
            "errors": context.metrics.errors
        }
    }