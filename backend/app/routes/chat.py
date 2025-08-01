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
    ErrorMessage, ChatMessage, UserInteractionMessage, ConnectionState
)
from app.connection_manager import connection_manager
from app.chat_history_manager import chat_history_manager

logger = logging.getLogger(__name__)

# Global interaction deduplication tracking
# Format: {connection_id: {interaction_hash: timestamp}}
interaction_dedup_cache: Dict[str, Dict[str, float]] = {}
DEDUP_WINDOW_SECONDS = 5.0  # Time window to consider interactions as duplicates

# Router for per-connection chat endpoints
router = APIRouter(tags=["per-connection-chat"])

def _generate_interaction_hash(interaction_type: str, interaction_context: Dict[str, Any]) -> str:
    """Generate a unique hash for an interaction to detect duplicates"""
    import hashlib
    import time
    
    # Create a deterministic string from the interaction
    interaction_str = f"{interaction_type}:{json.dumps(interaction_context, sort_keys=True)}"
    return hashlib.md5(interaction_str.encode()).hexdigest()

def _is_duplicate_interaction(connection_id: str, interaction_hash: str) -> bool:
    """Check if this interaction is a duplicate within the deduplication window"""
    import time
    current_time = time.time()
    
    # Clean up old entries first
    _cleanup_old_interactions(connection_id, current_time)
    
    # Check if this interaction exists in the cache
    if connection_id in interaction_dedup_cache:
        if interaction_hash in interaction_dedup_cache[connection_id]:
            last_time = interaction_dedup_cache[connection_id][interaction_hash]
            if current_time - last_time < DEDUP_WINDOW_SECONDS:
                return True
    
    # Mark this interaction as processed
    if connection_id not in interaction_dedup_cache:
        interaction_dedup_cache[connection_id] = {}
    
    interaction_dedup_cache[connection_id][interaction_hash] = current_time
    return False

def _cleanup_old_interactions(connection_id: str, current_time: float):
    """Remove old interaction entries outside the deduplication window"""
    if connection_id not in interaction_dedup_cache:
        return
    
    expired_hashes = []
    for interaction_hash, timestamp in interaction_dedup_cache[connection_id].items():
        if current_time - timestamp > DEDUP_WINDOW_SECONDS:
            expired_hashes.append(interaction_hash)
    
    for hash_to_remove in expired_hashes:
        del interaction_dedup_cache[connection_id][hash_to_remove]
    
    # Remove connection entry if empty
    if not interaction_dedup_cache[connection_id]:
        del interaction_dedup_cache[connection_id]

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
    """Run sender, receiver, and voice bridge loops for the connection"""
    try:
        # Start sender, receiver, and voice bridge tasks
        sender_task = asyncio.create_task(_per_connection_sender(context))
        receiver_task = asyncio.create_task(_per_connection_receiver(context))
        voice_bridge_task = asyncio.create_task(_per_connection_voice_bridge(context))
        
        # Wait for any task to complete
        done, pending = await asyncio.wait(
            {sender_task, receiver_task, voice_bridge_task}, 
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
    logger.info(f"Per-connection sender started for {context.connection_id}")
    while context.state in [ConnectionState.ACTIVE, ConnectionState.READY]:
        try:
            # Get message from connection's queue
            message = await asyncio.wait_for(
                context.message_queue.get(), 
                timeout=1.0
            )
            
            logger.info(f"Per-connection sender {context.connection_id}: got message from queue: {message.get('type', 'unknown')} with ID {message.get('id', 'no-id')}")
            
            # Send to WebSocket
            serialized = message if isinstance(message, str) else json.dumps(message)
            await context.websocket.send_text(serialized)
            logger.info(f"Per-connection sender {context.connection_id}: sent message to WebSocket: {message.get('type', 'unknown')}")
            
            # Mark task as done
            context.message_queue.task_done()
            context.last_activity = asyncio.get_event_loop().time()
            
        except asyncio.TimeoutError:
            # No message available, continue
            logger.debug(f"Per-connection sender {context.connection_id}: timeout waiting for messages")
            continue
        except Exception as e:
            logger.error(f"Sender error for {context.connection_id}: {e}")
            break
    
    logger.info(f"Per-connection sender stopped for {context.connection_id}")

async def _per_connection_receiver(context):
    """Receive messages from WebSocket and process them"""
    while context.state in [ConnectionState.ACTIVE, ConnectionState.READY]:
        try:
            # Receive message from WebSocket
            data = await context.websocket.receive_text()
            logger.info(f"Received message: {data}")
            context.last_activity = asyncio.get_event_loop().time()
            
            # Parse message
            try:
                payload = json.loads(data)
                logger.info(f"Payload: {payload}")
                
                # Determine message type and parse accordingly
                message_type = payload.get('type', '')
                
                if message_type == 'user_interaction':
                    # Handle user interaction message
                    interaction_message = UserInteractionMessage(**payload)
                    await _process_user_interaction(context, interaction_message)
                else:
                    # Handle chat message (chat, chat_request, thesys_bridge)
                    chat_message = ChatMessage(**payload)
                    await _process_per_connection_chat(context, chat_message)
                    
            except (json.JSONDecodeError, ValidationError) as e:
                logger.warning(f"Invalid message format from {context.connection_id}: {e}")
                continue
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for {context.connection_id}")
            break
        except Exception as e:
            logger.error(f"Receiver error for {context.connection_id}: {e}")
            break

async def _per_connection_voice_bridge(context):
    """Bridge voice messages from broadcast manager to per-connection queue"""
    from app.voice_broadcast_manager import voice_broadcast_manager
    
    logger.info(f"Starting voice bridge for connection {context.connection_id}")
    
    # Subscribe to voice broadcasts
    try:
        voice_queue = await voice_broadcast_manager.subscribe(
            connection_id=context.connection_id,
            voice_thread_id=context.voice_thread_id
        )
        logger.info(f"Subscribed to voice broadcasts for connection {context.connection_id}")
    except Exception as e:
        logger.error(f"Failed to subscribe to voice broadcasts for {context.connection_id}: {e}")
        return
    
    try:
        while context.state in [ConnectionState.ACTIVE, ConnectionState.READY]:
            try:
                # Get message from broadcast subscription queue
                logger.debug(f"Voice bridge {context.connection_id}: waiting for broadcast message...")
                message = await asyncio.wait_for(voice_queue.get(), timeout=1.0)
                logger.info(f"Voice bridge {context.connection_id}: received broadcast message type '{message.get('type')}' with ID {message.get('id')}")
                
                try:
                    # Forward to per-connection queue
                    await context.message_queue.put(message)
                    logger.info(f"✅ Successfully queued voice message {message.get('type')} to per-connection queue for {context.connection_id}")
                    
                    # Mark task as done in broadcast queue
                    voice_queue.task_done()
                    
                except Exception as e:
                    logger.error(f"❌ ERROR queuing voice message to per-connection queue for {context.connection_id}: {e}")
                    # Still mark as done even if forwarding failed
                    voice_queue.task_done()
                
            except asyncio.TimeoutError:
                # No message available, continue
                logger.debug(f"Voice bridge {context.connection_id}: timeout waiting for broadcast messages")
                continue
            except Exception as e:
                logger.error(f"Voice bridge error for {context.connection_id}: {e}")
                break
    
    finally:
        # Unsubscribe from broadcasts when bridge stops
        try:
            await voice_broadcast_manager.unsubscribe(context.connection_id)
            logger.info(f"Unsubscribed from voice broadcasts for connection {context.connection_id}")
        except Exception as e:
            logger.error(f"Error unsubscribing from voice broadcasts for {context.connection_id}: {e}")
    
    logger.info(f"Voice bridge stopped for connection {context.connection_id}")

# Note: _should_forward_voice_message function removed - filtering is now handled by VoiceBroadcastManager

async def _process_user_interaction(context, interaction_message: UserInteractionMessage):
    """Process a user interaction message and display it as a user message"""
    try:
        # Extract interaction details
        interaction_type = interaction_message.interactionType
        interaction_context = interaction_message.context
        
        logger.info(f"Processing {interaction_type} for {context.connection_id}: {interaction_context}")
        
        # Generate interaction hash for deduplication
        interaction_hash = _generate_interaction_hash(interaction_type, interaction_context)
        
        # Check if this is a duplicate interaction
        if _is_duplicate_interaction(context.connection_id, interaction_hash):
            logger.info(f"Duplicate {interaction_type} interaction detected for {context.connection_id}, skipping processing")
            return
        
        logger.info(f"Processing new {interaction_type} interaction for {context.connection_id} (hash: {interaction_hash[:8]})")
        
        # Detect framework from interaction context
        detected_framework = _detect_framework_from_interaction(interaction_context)
        if detected_framework:
            logger.info(f"Detected framework from interaction: {detected_framework}")
        
        # Convert interaction to human-readable user message
        user_message_content = _convert_interaction_to_user_message(interaction_type, interaction_context)
        logger.info(f"User message will be: {user_message_content}")
        
        # Use existing thread if available, otherwise create new one
        # For now, just create a consistent thread per interaction type to avoid fragmentation
        thread_id = f"{context.connection_id}:main_thread"
        
        # Send the user interaction as a user message first
        # Create a proper user message structure
        user_msg_response = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "type": "text_chat_response",
            "content": user_message_content,
            "threadId": thread_id
        }
        await context.message_queue.put(user_msg_response)
        
        # Store as user message in history
        await _store_connection_message(
            context.connection_id, thread_id, "user", user_message_content
        )
        
        # For certain interaction types, we might want to trigger an AI response
        if interaction_type in ['form_submit', 'button_click']:
            # Create a contextual message for AI processing
            ai_context_message = _convert_interaction_to_ai_context(interaction_type, interaction_context)
            
            # Create a synthetic ChatMessage for AI processing
            synthetic_chat = ChatMessage(
                type="chat",
                message=ai_context_message,
                connection_id=context.connection_id,
                thread_id=thread_id
            )
            
            # Process through the standard chat pipeline for AI response
            await _process_per_connection_chat(context, synthetic_chat)
        
        # For input_change, just acknowledge the change without AI processing
        # This prevents overwhelming the system with AI responses for every keystroke
        
    except Exception as e:
        logger.error(f"User interaction processing error for {context.connection_id}: {e}", exc_info=True)
        
        # Send error response
        error_card = {
            "component": "Callout",
            "props": {
                "variant": "error",
                "title": "Interaction Error", 
                "description": f"Failed to process your interaction: {str(e)}"
            }
        }
        
        from app.queues import create_text_chat_response
        error_response = create_text_chat_response(
            content=f'<content>{json.dumps(error_card)}</content>',
            content_type="c1",
            framework="c1",
            thread_id=None
        )
        
        await context.message_queue.put(error_response)

def _convert_interaction_to_user_message(interaction_type: str, context: Dict[str, Any]) -> str:
    """Convert user interaction data into a user message that will be displayed in chat"""
    try:
        if interaction_type == "form_submit":
            form_id = context.get("formId", "form")
            form_data = context.get("formData", {})
            
            # Create a user-friendly message about what they submitted
            data_summary = []
            for field, value in form_data.items():
                if value and str(value).strip():  # Only include non-empty values
                    data_summary.append(f"{field}: {value}")
            
            if data_summary:
                return f"Submitted {form_id} with: {', '.join(data_summary)}"
            else:
                return f"Submitted {form_id}"
                
        elif interaction_type == "button_click":
            action_type = context.get("actionType", "button")
            button_context = context.get("context", {})
            
            if button_context:
                context_str = ", ".join([f"{k}: {v}" for k, v in button_context.items() if v])
                return f"Clicked {action_type} ({context_str})"
            else:
                return f"Clicked {action_type}"
                
        elif interaction_type == "input_change":
            field_name = context.get("fieldName", "field")
            value = context.get("value", "")
            
            # For input changes, show what they entered
            return f"Updated {field_name}: {value}"
            
        else:
            return f"Performed {interaction_type} interaction"
            
    except Exception as e:
        logger.error(f"Error converting interaction to user message: {e}")
        return f"Performed an interaction"

def _convert_interaction_to_ai_context(interaction_type: str, context: Dict[str, Any]) -> str:
    """Convert user interaction data into context for AI processing"""
    try:
        if interaction_type == "form_submit":
            form_id = context.get("formId", "unknown form")
            form_data = context.get("formData", {})
            
            # Create a detailed context message for AI
            data_summary = []
            for field, value in form_data.items():
                if value and str(value).strip():  # Only include non-empty values
                    data_summary.append(f"{field}: {value}")
            
            if data_summary:
                return f"The user submitted a {form_id} with the following information: {', '.join(data_summary)}. Please acknowledge this submission and provide any relevant next steps or feedback."
            else:
                return f"The user submitted a {form_id} but it was empty. Please provide guidance on what information is needed."
                
        elif interaction_type == "button_click":
            action_type = context.get("actionType", "unknown action")
            button_context = context.get("context", {})
            
            if button_context:
                context_str = ", ".join([f"{k}: {v}" for k, v in button_context.items() if v])
                return f"The user clicked a {action_type} button with context: {context_str}. Please provide an appropriate response for this action."
            else:
                return f"The user clicked a {action_type} button. Please acknowledge this action and provide relevant information or next steps."
                
        elif interaction_type == "input_change":
            # For input changes, we usually don't want to trigger AI responses
            # But if we do, it should be minimal
            field_name = context.get("fieldName", "unknown field")
            value = context.get("value", "")
            return f"The user updated the {field_name} field to: {value}. You can acknowledge this briefly if helpful."
            
        else:
            return f"The user performed a {interaction_type} interaction. Please respond appropriately."
            
    except Exception as e:
        logger.error(f"Error converting interaction to AI context: {e}")
        return f"The user performed an interaction. Please acknowledge this."

def _detect_framework_from_interaction(context: Dict[str, Any]) -> Optional[str]:
    """
    Detect UI framework based on interaction context clues
    
    Args:
        context: Interaction context containing form data, element classes, etc.
        
    Returns:
        Detected framework name or None if unable to detect
    """
    try:
        # Check for framework-specific CSS classes or patterns
        
        # Look for element classes in context
        element_classes = context.get("elementClasses", "")
        if element_classes:
            # Shadcn/ui specific classes
            if any(cls in element_classes for cls in [
                "rounded-lg border bg-card text-card-foreground",
                "bg-primary text-primary-foreground",
                "border-input bg-background",
                "text-muted-foreground"
            ]):
                return "shadcn"
            
            # Tailwind specific patterns
            if any(cls in element_classes for cls in [
                "bg-blue-600 text-white",
                "border-gray-300 rounded-md",
                "focus:ring-blue-500",
                "hover:bg-blue-700"
            ]):
                return "tailwind"
            
            # Chakra UI specific classes
            if any(cls in element_classes for cls in [
                "chakra-",
                "css-"
            ]):
                return "chakra"
            
            # Material UI specific classes
            if any(cls in element_classes for cls in [
                "MuiButton-",
                "MuiTextField-",
                "makeStyles-"
            ]):
                return "mui"
        
        # Check for framework markers in form data or metadata
        framework_hint = context.get("framework")
        if framework_hint:
            return framework_hint
        
        # Check for data attributes that might indicate framework
        if context.get("dataFramework"):
            return context.get("dataFramework")
        
        # Look for bootstrap classes
        if element_classes and any(cls in element_classes for cls in [
            "btn-primary", "form-control", "card-body", "table-striped"
        ]):
            return "bootstrap"
        
        return None
        
    except Exception as e:
        logger.error(f"Error detecting framework from interaction: {e}")
        return None

def _convert_interaction_to_chat(interaction_type: str, context: Dict[str, Any]) -> str:
    """Convert user interaction data into a human-readable chat message (legacy function)"""
    # Keep this for backward compatibility, but redirect to user message version
    return _convert_interaction_to_user_message(interaction_type, context)

async def _process_per_connection_chat(context, chat_message: ChatMessage):
    """Process a chat message using connection's resources"""
    try:
        # Extract message content and thread_id based on message type
        if chat_message.type == 'thesys_bridge':
            # For thesys_bridge messages, extract content from prompt
            message = chat_message.prompt.get('content', '') if chat_message.prompt else ''
            thread_id = chat_message.threadId or chat_message.thread_id or str(uuid.uuid4())
            is_c1_action = True
        else:
            # For regular chat messages
            message = chat_message.message or ''
            thread_id = chat_message.thread_id or str(uuid.uuid4())
            is_c1_action = False
        
        logger.info(f"Processing {chat_message.type} for {context.connection_id}: {message[:100]}...")
        
        # Get conversation history from connection's storage
        history = await _get_connection_history(context.connection_id, thread_id)
        
        # Add user message to history (using appropriate method based on message type)
        if is_c1_action:
            # For C1 actions, use add_c1_action method if available
            await _store_connection_c1_action(context.connection_id, thread_id, message)
        else:
            # For regular chat, use regular user message
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
                "source": "text_chat"
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
            content_type="c1",
            framework="c1",
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

async def _store_connection_c1_action(connection_id: str, thread_id: str, content: str):
    """Store a C1 action in the connection's conversation history"""
    try:
        # Use the global chat history manager with connection prefix
        prefixed_thread_id = f"{connection_id}:{thread_id}"
        await chat_history_manager.add_c1_action(prefixed_thread_id, content)
    except Exception as e:
        logger.error(f"Error storing C1 action for {connection_id}:{thread_id}: {e}")