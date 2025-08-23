"""
Ada Interaction Engine - Thread Management Routes

This module provides RESTful API endpoints for managing conversation threads,
including listing, loading, creating, updating, and searching threads.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from app.chat_history_manager import chat_history_manager

logger = logging.getLogger(__name__)

# Router for thread management endpoints
router = APIRouter(prefix="/api/threads", tags=["threads"])

# -------------------- Pydantic Models -------------------- #

class ThreadSummary(BaseModel):
    """Summary information for a thread"""
    thread_id: str
    title: Optional[str] = None
    created_at: str
    last_activity: str
    message_count: int
    last_message: Optional[str] = None
    archived: bool = False
    tags: List[str] = []
    connection_id: Optional[str] = None
    session_id: Optional[str] = None

class ThreadMessage(BaseModel):
    """Message within a thread"""
    role: str
    content: str
    message_id: Optional[str] = None
    timestamp: Optional[float] = None
    content_type: Optional[str] = None  # 'text', 'html', 'c1', 'enhanced'

class ThreadDetail(BaseModel):
    """Detailed thread information with messages"""
    thread_id: str
    title: Optional[str] = None
    created_at: str
    last_activity: str
    message_count: int
    archived: bool = False
    tags: List[str] = []
    messages: List[ThreadMessage] = []
    connection_id: Optional[str] = None
    session_id: Optional[str] = None

class CreateThreadRequest(BaseModel):
    """Request to create a new thread"""
    thread_id: Optional[str] = None  # Allow frontend to provide thread ID
    title: Optional[str] = None
    initial_message: Optional[str] = None
    connection_id: Optional[str] = None
    session_id: Optional[str] = None
    tags: List[str] = []

class UpdateThreadRequest(BaseModel):
    """Request to update thread metadata"""
    title: Optional[str] = None
    archived: Optional[bool] = None
    tags: Optional[List[str]] = None

class ThreadListResponse(BaseModel):
    """Response for thread listing"""
    threads: List[ThreadSummary]
    total_count: int
    has_more: bool
    next_offset: Optional[int] = None

class MessageListResponse(BaseModel):
    """Response for message listing"""
    messages: List[ThreadMessage]
    total_count: int
    has_more: bool
    next_offset: Optional[int] = None

# -------------------- Helper Functions -------------------- #

def extract_connection_id(thread_id: str) -> Optional[str]:
    """No longer extract connection_id from thread_id - threads are now UUIDs"""
    return None

def extract_base_thread_id(thread_id: str) -> str:
    """Return thread_id as-is - threads are now UUIDs without prefix"""
    return thread_id

def parse_message_content(message: Dict[str, Any]) -> ThreadMessage:
    """Parse a message from storage format to API format"""
    content = message.get('content', '')
    content_type = 'text'
    
    # Try to detect enhanced responses
    try:
        if content.startswith('{') and 'type' in content:
            parsed = json.loads(content)
            if parsed.get('type') == 'enhanced_response':
                content_type = 'enhanced'
                # Extract the actual content
                content = parsed.get('content', content)
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Detect HTML content
    if content.startswith('<') and ('</div>' in content or '</html>' in content):
        content_type = 'html'
    # Detect C1 content
    elif content.startswith('<content>') and content.endswith('</content>'):
        content_type = 'c1'
    
    return ThreadMessage(
        role=message.get('role', 'unknown'),
        content=content,
        message_id=message.get('id'),
        timestamp=message.get('timestamp'),
        content_type=content_type
    )

# -------------------- API Endpoints -------------------- #

@router.get("/list", response_model=ThreadListResponse)
async def list_threads(
    connection_id: Optional[str] = Query(None, description="Filter by connection ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of threads to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort_by: str = Query("last_activity", description="Sort field: last_activity, created_at, message_count"),
    archived: Optional[bool] = Query(None, description="Filter by archived status")
) -> ThreadListResponse:
    """
    List all threads with pagination and filtering.
    
    Returns thread summaries with metadata but without full message history.
    """
    try:
        # Get all threads from chat history manager
        all_thread_ids = await chat_history_manager.get_all_threads()
        
        # Filter by connection_id if provided
        if connection_id:
            filtered_ids = [tid for tid in all_thread_ids if tid.startswith(f"{connection_id}:")]
        else:
            filtered_ids = all_thread_ids
        
        # Get thread information for each thread
        threads_data = []
        for thread_id in filtered_ids:
            thread_info = await chat_history_manager.get_thread_info(thread_id)
            
            if not thread_info.get('exists'):
                continue
            
            # Get last message preview
            recent_messages = await chat_history_manager.get_recent_history(thread_id, max_messages=1)
            last_message = None
            if recent_messages:
                last_msg = recent_messages[-1]
                last_message = last_msg.get('content', '')[:100]  # First 100 chars
            
            # Extract metadata
            conn_id = extract_connection_id(thread_id)
            base_thread_id = extract_base_thread_id(thread_id)
            
            # Get extended metadata if available
            extended_meta = await chat_history_manager.get_thread_extended_metadata(thread_id)
            
            thread_summary = ThreadSummary(
                thread_id=thread_id,
                title=extended_meta.get('title') if extended_meta else None,
                created_at=thread_info.get('created_at', ''),
                last_activity=thread_info.get('last_activity', ''),
                message_count=thread_info.get('message_count', 0),
                last_message=last_message,
                archived=extended_meta.get('archived', False) if extended_meta else False,
                tags=extended_meta.get('tags', []) if extended_meta else [],
                connection_id=conn_id,
                session_id=extended_meta.get('session_id') if extended_meta else None
            )
            
            # Apply archived filter if specified
            if archived is not None and thread_summary.archived != archived:
                continue
            
            threads_data.append(thread_summary)
        
        # Sort threads
        if sort_by == "last_activity":
            threads_data.sort(key=lambda x: x.last_activity, reverse=True)
        elif sort_by == "created_at":
            threads_data.sort(key=lambda x: x.created_at, reverse=True)
        elif sort_by == "message_count":
            threads_data.sort(key=lambda x: x.message_count, reverse=True)
        
        # Apply pagination
        total_count = len(threads_data)
        paginated = threads_data[offset:offset + limit]
        has_more = (offset + limit) < total_count
        next_offset = offset + limit if has_more else None
        
        return ThreadListResponse(
            threads=paginated,
            total_count=total_count,
            has_more=has_more,
            next_offset=next_offset
        )
        
    except Exception as e:
        logger.error(f"Error listing threads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{thread_id}", response_model=ThreadDetail)
async def get_thread_detail(
    thread_id: str,
    message_limit: int = Query(50, ge=1, le=200, description="Number of recent messages to include")
) -> ThreadDetail:
    """
    Get detailed information about a specific thread including recent messages.
    """
    try:
        # Get thread info
        thread_info = await chat_history_manager.get_thread_info(thread_id)
        
        if not thread_info.get('exists'):
            raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found")
        
        # Get recent messages
        messages = await chat_history_manager.get_recent_history(thread_id, max_messages=message_limit)
        
        # Parse messages
        parsed_messages = [parse_message_content(msg) for msg in messages]
        
        # Get extended metadata
        extended_meta = await chat_history_manager.get_thread_extended_metadata(thread_id)
        
        # Extract connection info
        conn_id = extract_connection_id(thread_id)
        
        return ThreadDetail(
            thread_id=thread_id,
            title=extended_meta.get('title') if extended_meta else None,
            created_at=thread_info.get('created_at', ''),
            last_activity=thread_info.get('last_activity') or thread_info.get('created_at', ''),
            message_count=thread_info.get('message_count', 0),
            archived=extended_meta.get('archived', False) if extended_meta else False,
            tags=extended_meta.get('tags', []) if extended_meta else [],
            messages=parsed_messages,
            connection_id=conn_id,
            session_id=extended_meta.get('session_id') if extended_meta else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{thread_id}/messages", response_model=MessageListResponse)
async def get_thread_messages(
    thread_id: str,
    limit: int = Query(50, ge=1, le=200, description="Number of messages to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    before_timestamp: Optional[float] = Query(None, description="Get messages before this timestamp")
) -> MessageListResponse:
    """
    Get paginated messages for a specific thread.
    
    Supports loading older messages for infinite scroll implementations.
    """
    try:
        # Check if thread exists
        thread_info = await chat_history_manager.get_thread_info(thread_id)
        
        if not thread_info.get('exists'):
            raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found")
        
        # Get messages with pagination support
        messages = await chat_history_manager.get_paginated_messages(
            thread_id=thread_id,
            limit=limit,
            offset=offset,
            before_timestamp=before_timestamp
        )
        
        # Parse messages
        parsed_messages = [parse_message_content(msg) for msg in messages['messages']]
        
        return MessageListResponse(
            messages=parsed_messages,
            total_count=messages['total_count'],
            has_more=messages['has_more'],
            next_offset=messages.get('next_offset')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread messages: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create", response_model=ThreadDetail)
async def create_thread(request: CreateThreadRequest) -> ThreadDetail:
    """
    Create a new conversation thread.
    
    Optionally include an initial message to start the conversation.
    """
    try:
        # Use provided thread_id or generate a new one
        if request.thread_id:
            # Use the frontend-provided UUID
            thread_id = request.thread_id
        else:
            # Fallback to generating a UUID if not provided
            thread_id = str(uuid.uuid4())
        
        # Create thread metadata
        metadata = {
            'title': request.title,
            'tags': request.tags,
            'session_id': request.session_id,
            'archived': False
        }
        
        # Store extended metadata
        await chat_history_manager.update_thread_extended_metadata(thread_id, metadata)
        
        # Add initial message if provided (this will create the thread in the system)
        if request.initial_message:
            await chat_history_manager.add_user_message(thread_id, request.initial_message)
        else:
            # Create an empty thread by adding and immediately clearing
            # This ensures the thread exists with proper timestamps
            await chat_history_manager.add_user_message(thread_id, "[Thread initialized]")
            await chat_history_manager.clear_history(thread_id)
        
        # Get thread details to return
        thread_info = await chat_history_manager.get_thread_info(thread_id)
        
        # Ensure we have valid timestamps
        created_at = thread_info.get('created_at', datetime.now().isoformat())
        last_activity = thread_info.get('last_activity', created_at)
        messages = await chat_history_manager.get_recent_history(thread_id, max_messages=50)
        parsed_messages = [parse_message_content(msg) for msg in messages]
        
        return ThreadDetail(
            thread_id=thread_id,
            title=request.title,
            created_at=created_at,
            last_activity=last_activity,
            message_count=thread_info.get('message_count', 0),
            archived=False,
            tags=request.tags,
            messages=parsed_messages,
            connection_id=request.connection_id,
            session_id=request.session_id
        )
        
    except Exception as e:
        logger.error(f"Error creating thread: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{thread_id}", response_model=ThreadDetail)
async def update_thread(
    thread_id: str,
    request: UpdateThreadRequest
) -> ThreadDetail:
    """
    Update thread metadata (title, archived status, tags).
    
    Does not modify the message history.
    """
    try:
        # Check if thread exists
        thread_info = await chat_history_manager.get_thread_info(thread_id)
        
        if not thread_info.get('exists'):
            raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found")
        
        # Get current metadata
        current_meta = await chat_history_manager.get_thread_extended_metadata(thread_id)
        if not current_meta:
            current_meta = {}
        
        # Update metadata fields
        if request.title is not None:
            current_meta['title'] = request.title
        if request.archived is not None:
            current_meta['archived'] = request.archived
        if request.tags is not None:
            current_meta['tags'] = request.tags
        
        # Store updated metadata
        await chat_history_manager.update_thread_extended_metadata(thread_id, current_meta)
        
        # Return updated thread details
        messages = await chat_history_manager.get_recent_history(thread_id, max_messages=50)
        parsed_messages = [parse_message_content(msg) for msg in messages]
        
        conn_id = extract_connection_id(thread_id)
        
        return ThreadDetail(
            thread_id=thread_id,
            title=current_meta.get('title'),
            created_at=thread_info.get('created_at', ''),
            last_activity=thread_info.get('last_activity') or thread_info.get('created_at', ''),
            message_count=thread_info.get('message_count', 0),
            archived=current_meta.get('archived', False),
            tags=current_meta.get('tags', []),
            messages=parsed_messages,
            connection_id=conn_id,
            session_id=current_meta.get('session_id')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thread: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{thread_id}")
async def delete_thread(thread_id: str) -> Dict[str, str]:
    """
    Delete a thread and all its messages.
    
    This action cannot be undone.
    """
    try:
        # Check if thread exists
        thread_info = await chat_history_manager.get_thread_info(thread_id)
        
        if not thread_info.get('exists'):
            raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found")
        
        # Delete the thread
        await chat_history_manager.delete_thread(thread_id)
        
        return {"status": "success", "message": f"Thread {thread_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting thread: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=ThreadListResponse)
async def search_threads(
    query: str = Query(..., description="Search query"),
    connection_id: Optional[str] = Query(None, description="Filter by connection ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
) -> ThreadListResponse:
    """
    Search across thread messages and metadata.
    
    Searches in message content, thread titles, and tags.
    """
    try:
        # Perform search
        search_results = await chat_history_manager.search_threads(
            query=query,
            connection_id=connection_id,
            limit=limit,
            offset=offset
        )
        
        # Format results
        threads_data = []
        for result in search_results['results']:
            thread_id = result['thread_id']
            thread_info = await chat_history_manager.get_thread_info(thread_id)
            extended_meta = await chat_history_manager.get_thread_extended_metadata(thread_id)
            
            # Get matching message preview
            last_message = result.get('matching_content', '')[:100]
            
            conn_id = extract_connection_id(thread_id)
            
            thread_summary = ThreadSummary(
                thread_id=thread_id,
                title=extended_meta.get('title') if extended_meta else None,
                created_at=thread_info.get('created_at', ''),
                last_activity=thread_info.get('last_activity', ''),
                message_count=thread_info.get('message_count', 0),
                last_message=last_message,
                archived=extended_meta.get('archived', False) if extended_meta else False,
                tags=extended_meta.get('tags', []) if extended_meta else [],
                connection_id=conn_id,
                session_id=extended_meta.get('session_id') if extended_meta else None
            )
            
            threads_data.append(thread_summary)
        
        return ThreadListResponse(
            threads=threads_data,
            total_count=search_results['total_count'],
            has_more=search_results['has_more'],
            next_offset=search_results.get('next_offset')
        )
        
    except Exception as e:
        logger.error(f"Error searching threads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))