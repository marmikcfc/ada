"""
Ada Interaction Engine - Chat Routes Module

This module handles text-based chat interactions and bridges to the Thesys system.
It provides endpoints for:
1. WebSocket streaming of messages
2. WebSocket bridge for Thesys C1Chat integration
3. Chat message processing and enhancement
"""

import logging
import json
import uuid
from typing import Dict, List, Any, Optional
import re

import asyncio  # Needed for asyncio.sleep used in WebSocket loop

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException
from typing import Union
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import config
from app.queues import (
    enqueue_llm_message,
    get_llm_message,
    mark_llm_message_done,
    create_user_transcription,
    enqueue_raw_llm_output,
    create_text_chat_response
)
from agent.enhanced_mcp_client_agent import EnhancedMCPClient
from utils.thesys_prompts import format_thesys_messages_for_visualize, load_thesys_prompt

logger = logging.getLogger(__name__)

# Router for chat endpoints
router = APIRouter(prefix="/api", tags=["chat"])

# --------------------------------------------------------------------------- #
# Chat history integration
# --------------------------------------------------------------------------- #
from app.chat_history_manager import chat_history_manager  # noqa: E402

# WebSocket router (needs different prefix)
ws_router = APIRouter(tags=["websocket"])

class ThesysBridgeRequest(BaseModel):
    """Request model for Thesys C1Chat bridge"""
    prompt: dict  # Contains the user message in OpenAI format
    threadId: Optional[str] = None
    responseId: str

class ChatRequest(BaseModel):
    """Request model for chat messages"""
    message: str
    thread_id: Optional[str] = None

def extract_message_and_thread_id(request: Union[ChatRequest, ThesysBridgeRequest]) -> tuple[str, Optional[str]]:
    """
    Extract message and thread_id from either ChatRequest or ThesysBridgeRequest
    
    Args:
        request: Either ChatRequest or ThesysBridgeRequest
        
    Returns:
        Tuple of (message, thread_id)
    """
    if isinstance(request, ChatRequest):
        return request.message, request.thread_id
    elif isinstance(request, ThesysBridgeRequest):
        # Extract message from prompt["content"] and thread_id from threadId
        message = request.prompt.get("content", "")
        thread_id = request.threadId
        return message, thread_id
    else:
        raise ValueError(f"Unsupported request type: {type(request)}")


async def _handle_debug_command(message: str, thread_id: str) -> Optional[str]:
    """
    Handle debug commands for UI framework testing.
    
    Supported commands:
    - "tailwind form", "tailwind table", "tailwind list", "tailwind tabs"
    - "shadcn form", "shadcn table", "shadcn list", "shadcn tabs"
    
    Returns:
        HTML content if debug command detected, None otherwise
    """
    # Pattern matching for debug commands
    pattern = r'^(tailwind|shadcn)\s+(form|table|list|tabs)$'
    match = re.match(pattern, message.lower().strip())
    
    if not match:
        return None
    
    framework, element = match.groups()
    logger.info(f"Debug command detected: {framework} {element}")
    
    # Load appropriate prompt
    if framework == 'tailwind':
        system_prompt = load_thesys_prompt('openai_tailwind_generator_system')
    else:  # shadcn
        system_prompt = load_thesys_prompt('openai_shadcn_generator_system')
    
    # Element-specific instructions
    element_instructions = {
        'form': f"Create a contact form with name, email, and message fields using {framework} styling.",
        'table': f"Create a user management table with name, email, status columns and action buttons using {framework} styling.",
        'list': f"Create an interactive task list with checkboxes and action buttons using {framework} styling.",
        'tabs': f"Create a dashboard with 3 tabs (Overview, Analytics, Settings) using {framework} styling."
    }
    
    # Return hardcoded HTML components based on framework and element
    try:
        html_content = _get_hardcoded_component(framework, element)
        logger.info(f"Returned hardcoded {framework} {element} component")
        return html_content
        
    except Exception as e:
        logger.error(f"Error generating debug component: {e}", exc_info=True)
        
        # Return error component
        error_html = f'''
        <div class="p-4 border border-red-300 rounded-md bg-red-50">
            <h3 class="text-red-800 font-semibold">Debug Command Error</h3>
            <p class="text-red-700">Failed to generate {framework} {element}: {str(e)}</p>
        </div>
        '''
        return error_html


def _get_hardcoded_component(framework: str, element: str) -> str:
    """Return hardcoded HTML components for testing."""
    
    if framework == 'tailwind':
        if element == 'form':
            return '''
            <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">Contact Form</h2>
                <form onsubmit="window.geuiSDK.handleFormSubmit(event, 'contact-form')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input type="text" name="name" placeholder="Enter your name" 
                               onchange="window.geuiSDK.handleInputChange(event, 'name')"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                               required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" placeholder="Enter your email" 
                               onchange="window.geuiSDK.handleInputChange(event, 'email')"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                               required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea name="message" rows="4" placeholder="Enter your message"
                                  onchange="window.geuiSDK.handleInputChange(event, 'message')"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                  required></textarea>
                    </div>
                    <button type="submit" 
                            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200">
                        Send Message
                    </button>
                </form>
            </div>
            '''
            
        elif element == 'table':
            return '''
            <div class="overflow-x-auto bg-white rounded-lg shadow">
                <table class="min-w-full table-auto">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">John Doe</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">john@example.com</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'edit-user', {id: 1})"
                                        class="text-blue-600 hover:text-blue-900">Edit</button>
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-user', {id: 1})"
                                        class="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                        </tr>
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Jane Smith</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">jane@example.com</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'edit-user', {id: 2})"
                                        class="text-blue-600 hover:text-blue-900">Edit</button>
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-user', {id: 2})"
                                        class="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            '''
            
        elif element == 'list':
            return '''
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4 text-gray-800">Task List</h2>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" onchange="window.geuiSDK.handleInputChange(event, 'task-1')"
                                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                            <span class="text-sm text-gray-700">Complete project proposal</span>
                        </div>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 1})"
                                class="text-red-500 hover:text-red-700">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" checked onchange="window.geuiSDK.handleInputChange(event, 'task-2')"
                                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                            <span class="text-sm text-gray-700 line-through">Review team feedback</span>
                        </div>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 2})"
                                class="text-red-500 hover:text-red-700">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" onchange="window.geuiSDK.handleInputChange(event, 'task-3')"
                                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                            <span class="text-sm text-gray-700">Update documentation</span>
                        </div>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 3})"
                                class="text-red-500 hover:text-red-700">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <button onclick="window.geuiSDK.handleButtonClick(event, 'add-task', {})"
                        class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200">
                    Add New Task
                </button>
            </div>
            '''
            
        elif element == 'tabs':
            return '''
            <div class="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'overview'})"
                                class="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600">
                            Overview
                        </button>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'analytics'})"
                                class="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                            Analytics
                        </button>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'settings'})"
                                class="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                            Settings
                        </button>
                    </nav>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-900">Total Users</h3>
                            <p class="text-3xl font-bold text-blue-600">2,543</p>
                            <p class="text-sm text-blue-700">+12% from last month</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-green-900">Revenue</h3>
                            <p class="text-3xl font-bold text-green-600">$45,231</p>
                            <p class="text-sm text-green-700">+8% from last month</p>
                        </div>
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-purple-900">Orders</h3>
                            <p class="text-3xl font-bold text-purple-600">1,234</p>
                            <p class="text-sm text-purple-700">+15% from last month</p>
                        </div>
                    </div>
                </div>
            </div>
            '''
    
    elif framework == 'shadcn':
        if element == 'form':
            return '''
            <div class="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md mx-auto">
                <div class="flex flex-col space-y-1.5 p-6">
                    <h3 class="text-2xl font-semibold leading-none tracking-tight">Contact Form</h3>
                    <p class="text-sm text-muted-foreground">Send us a message and we'll get back to you.</p>
                </div>
                <div class="p-6 pt-0">
                    <form onsubmit="window.geuiSDK.handleFormSubmit(event, 'shadcn-contact-form')" class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                            <input type="text" name="name" placeholder="Enter your name" 
                                   onchange="window.geuiSDK.handleInputChange(event, 'name')"
                                   class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                   required>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <input type="email" name="email" placeholder="Enter your email" 
                                   onchange="window.geuiSDK.handleInputChange(event, 'email')"
                                   class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                   required>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                            <textarea name="message" rows="4" placeholder="Enter your message"
                                      onchange="window.geuiSDK.handleInputChange(event, 'message')"
                                      class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                      required></textarea>
                        </div>
                        <button type="submit" 
                                class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
            '''
            
        elif element == 'table':
            return '''
            <div class="w-full overflow-auto">
                <table class="w-full caption-bottom text-sm">
                    <thead class="[&_tr]:border-b">
                        <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Name</th>
                            <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Email</th>
                            <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Status</th>
                            <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="[&_tr:last-child]:border-0">
                        <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">John Doe</td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">john@example.com</td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                    Active
                                </div>
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'edit-user', {id: 1})"
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                                    ✏️
                                </button>
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-user', {id: 1})"
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                        <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">Jane Smith</td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">jane@example.com</td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                                    Pending
                                </div>
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'edit-user', {id: 2})"
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                                    ✏️
                                </button>
                                <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-user', {id: 2})"
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            '''
            
        elif element == 'list':
            return '''
            <div class="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md mx-auto">
                <div class="flex flex-col space-y-1.5 p-6">
                    <h3 class="text-2xl font-semibold leading-none tracking-tight">Task List</h3>
                    <p class="text-sm text-muted-foreground">Manage your daily tasks</p>
                </div>
                <div class="p-6 pt-0 space-y-3">
                    <div class="flex items-center space-x-2 p-3 rounded-md border">
                        <input type="checkbox" onchange="window.geuiSDK.handleInputChange(event, 'task-1')"
                               class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Complete project proposal
                        </label>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 1})"
                                class="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive">
                            🗑️
                        </button>
                    </div>
                    <div class="flex items-center space-x-2 p-3 rounded-md border">
                        <input type="checkbox" checked onchange="window.geuiSDK.handleInputChange(event, 'task-2')"
                               class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 line-through text-muted-foreground">
                            Review team feedback
                        </label>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 2})"
                                class="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive">
                            🗑️
                        </button>
                    </div>
                    <div class="flex items-center space-x-2 p-3 rounded-md border">
                        <input type="checkbox" onchange="window.geuiSDK.handleInputChange(event, 'task-3')"
                               class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Update documentation
                        </label>
                        <button onclick="window.geuiSDK.handleButtonClick(event, 'delete-task', {id: 3})"
                                class="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="flex items-center p-6 pt-0">
                    <button onclick="window.geuiSDK.handleButtonClick(event, 'add-task', {})"
                            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                        Add New Task
                    </button>
                </div>
            </div>
            '''
            
        elif element == 'tabs':
            return '''
            <div class="w-full max-w-4xl mx-auto">
                <div class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
                    <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'overview'})"
                            class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground shadow-sm">
                        Overview
                    </button>
                    <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'analytics'})"
                            class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                        Analytics
                    </button>
                    <button onclick="window.geuiSDK.handleButtonClick(event, 'switch-tab', {tab: 'settings'})"
                            class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                        Settings
                    </button>
                </div>
                <div class="mt-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div class="p-6">
                        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                                    <h3 class="tracking-tight text-sm font-medium">Total Revenue</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground">
                                        <path d="M12 2v20m9-9H3"/>
                                    </svg>
                                </div>
                                <div class="p-6 pt-0">
                                    <div class="text-2xl font-bold">$45,231.89</div>
                                    <p class="text-xs text-muted-foreground">+20.1% from last month</p>
                                </div>
                            </div>
                            <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                                    <h3 class="tracking-tight text-sm font-medium">Subscriptions</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3"/>
                                    </svg>
                                </div>
                                <div class="p-6 pt-0">
                                    <div class="text-2xl font-bold">+2350</div>
                                    <p class="text-xs text-muted-foreground">+180.1% from last month</p>
                                </div>
                            </div>
                            <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                                    <h3 class="tracking-tight text-sm font-medium">Sales</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground">
                                        <rect width="20" height="14" x="2" y="5" rx="2"/>
                                        <path d="M2 10h20"/>
                                    </svg>
                                </div>
                                <div class="p-6 pt-0">
                                    <div class="text-2xl font-bold">+12,234</div>
                                    <p class="text-xs text-muted-foreground">+19% from last month</p>
                                </div>
                            </div>
                            <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                                    <h3 class="tracking-tight text-sm font-medium">Active Now</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                    </svg>
                                </div>
                                <div class="p-6 pt-0">
                                    <div class="text-2xl font-bold">+573</div>
                                    <p class="text-xs text-muted-foreground">+201 since last hour</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            '''
    
    return f'<div class="p-4 text-center">Unknown component: {framework} {element}</div>'


async def _process_chat_logic(message: str, thread_id: str, *, is_c1_action: bool, app_state) -> None:
    """Internal helper to process a chat message just like the POST endpoint."""

    # Use lazy initialization for MCP client
    from app.server import get_or_create_mcp_client
    enhanced_mcp_client: EnhancedMCPClient = await get_or_create_mcp_client(app_state)
    if not enhanced_mcp_client:
        raise HTTPException(status_code=500, detail="Chat service not available")

    # ------------------------------------------------------------------- #
    # 1. Persist USER message in history
    # ------------------------------------------------------------------- #
    if is_c1_action:
        await chat_history_manager.add_c1_action(thread_id, message)
    else:
        await chat_history_manager.add_user_message(thread_id, message)

    # Step 1: Send user message to WebSocket immediately
    # For text chat, don't echo user message back (frontend already displays it)
    # Only voice transcriptions need to be sent back to frontend as user_transcription

    # Gather recent history for context
    conversation_history = await chat_history_manager.get_recent_history(thread_id)

    # ------------------------------------------------------------------- #
    # Check for debug commands before MCP client processing
    # ------------------------------------------------------------------- #
    debug_html = await _handle_debug_command(message, thread_id)
    if debug_html:
        # Send debug HTML response directly
        response = create_text_chat_response(content=debug_html, thread_id=thread_id)
        await enqueue_llm_message(response)
        
        # Persist debug response in history
        await chat_history_manager.add_assistant_message(thread_id, debug_html)
        logger.info(f"Debug command processed and response sent for thread {thread_id}")
        return

    # Step 2: Process the message through the MCP client
    response = await enhanced_mcp_client.chat_with_tools(
        user_message=message,
        conversation_history=conversation_history  # real history
    )
    logger.info(f"MCP client response: {response[:100]}...")

    # ------------------------------------------------------------------- #
    # 3. Persist ASSISTANT response in history
    # ------------------------------------------------------------------- #
    await chat_history_manager.add_assistant_message(thread_id, response)

    # Fetch updated conversation history for downstream processors
    conversation_history = await chat_history_manager.get_recent_history(thread_id)

    # Generate a unique message_id for streaming correlation
    message_id = str(uuid.uuid4())

    # Step 4: Send response through enhancement pipeline (like voice messages)
    await enqueue_raw_llm_output(
        assistant_response=response,
        history=conversation_history,
        metadata={
            "source": "text_chat",
            "thread_id": thread_id,
            "message_id": message_id  # Add message_id for streaming correlation
        }
    )
    logger.info(f"Enqueued response to enhancement pipeline with message_id: {message_id}")


@router.post("/chat")
async def chat_enhanced(request: Union[ChatRequest, ThesysBridgeRequest], fastapi_req: Request):
    """
    Process a chat message through the full enhancement pipeline
    
    This endpoint accepts both ChatRequest and ThesysBridgeRequest formats:
    - ChatRequest: Direct message format
    - ThesysBridgeRequest: Thesys interactive element format
    
    This endpoint:
    1. Extracts message and thread_id from the request
    2. Enqueues the user message to the WebSocket stream
    3. Processes the message through the MCP client
    4. Sends the response through the enhancement pipeline (like voice messages)
    5. Returns a simple acknowledgment
    
    Args:
        request: Either ChatRequest or ThesysBridgeRequest
        fastapi_req: FastAPI request object
        
    Returns:
        JSON response with thread_id and status
    """
    # Extract message and thread_id from either request format
    message, thread_id = extract_message_and_thread_id(request)
    
    # Initialize thread_id early so it's available in error handling
    thread_id = thread_id or str(uuid.uuid4())
    
    # Log the request type and extracted data
    request_type = "ThesysBridgeRequest" if isinstance(request, ThesysBridgeRequest) else "ChatRequest"
    logger.info(f"Processing {request_type} - Message: {message[:100]}..., Thread ID: {thread_id}")
    
    try:
        await _process_chat_logic(
            message,
            thread_id,
            is_c1_action=isinstance(request, ThesysBridgeRequest),
            app_state=fastapi_req.app.state,
        )
        return {
            "status": "processing",
            "thread_id": thread_id,
            "message": "Message sent for processing. Response will be delivered via WebSocket."
        }
    except Exception as e:
        logger.error(f"Enhanced Chat Error: {e}", exc_info=True)
        # Send error message to WebSocket
        try:
            error_response = create_text_chat_response(
                content=f'<content>{{"component": "Callout", "props": {{"variant": "error", "title": "Chat Error", "description": "Failed to process your message: {str(e)}"}} }}</content>',
                thread_id=thread_id
            )
            await enqueue_llm_message(error_response)
        except Exception as enqueue_error:
            logger.error(f"Failed to enqueue error message: {enqueue_error}", exc_info=True)
        
        raise HTTPException(status_code=500, detail=str(e))

@ws_router.websocket("/ws/messages")
async def websocket_llm_messages(websocket: WebSocket):
    """Bidirectional WebSocket for chat messages and streaming responses."""
    await websocket.accept()
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"WebSocket /ws/messages connection accepted from {client_info}")

    async def sender():
        while True:
            msg = await get_llm_message()
            try:
                serialized = msg if isinstance(msg, str) else json.dumps(msg)
                await websocket.send_text(serialized)
            except Exception as send_error:
                logger.error(
                    f"WebSocket error sending message to {client_info}: {send_error}",
                    exc_info=True,
                )
                break
            finally:
                mark_llm_message_done()
            await asyncio.sleep(0)

    async def receiver():
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            try:
                payload = json.loads(data)
            except Exception:
                logger.warning(f"Invalid WS payload from {client_info}: {data}")
                continue
            mtype = payload.get("type")
            if mtype in ("chat", "chat_request"):
                text = payload.get("message") or payload.get("content", "")
                thread_id = payload.get("thread_id") or payload.get("threadId")
                is_c1 = False
            elif mtype in ("thesys_bridge", "c1_action"):
                text = payload.get("prompt", {}).get("content", "")
                thread_id = payload.get("thread_id") or payload.get("threadId")
                is_c1 = True
            else:
                logger.warning(f"Unknown WS message type from {client_info}: {mtype}")
                continue
            thread_id = thread_id or str(uuid.uuid4())
            try:
                await _process_chat_logic(text, thread_id, is_c1_action=is_c1, app_state=websocket.scope["app"].state)
            except Exception as e:
                logger.error(f"WS chat processing error for {client_info}: {e}", exc_info=True)

    await websocket.send_text(json.dumps({"type": "connection_ack", "message": "WebSocket connection established!"}))

    send_task = asyncio.create_task(sender())
    recv_task = asyncio.create_task(receiver())
    done, pending = await asyncio.wait({send_task, recv_task}, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    logger.info(f"Closing WebSocket connection for {client_info}")

def create_streaming_response(content: str):
    """
    Helper function to create streaming response for Thesys C1Chat
    
    Args:
        content: The content to stream
        
    Returns:
        StreamingResponse with the content
    """
    def generate_response():
        yield content
        
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

def format_thesys_error_response(error_message: str) -> str:
    """
    Format error response in Thesys component format
    
    Args:
        error_message: The error message
        
    Returns:
        Formatted error response
    """
    component = {
        "component": "Callout",
        "props": {
            "variant": "warning",
            "title": "WebSocket Bridge Error",
            "description": error_message
        }
    }
    
    return f'<content>{json.dumps(component)}</content>'

async def get_thesys_visualization(
    thesys_client,
    assistant_response: str, 
    conversation_history: List[Dict[str, Any]] = None, 
    enhanced_response: str = None
) -> str:
    """
    Call Thesys Visualize API to get a UI representation for the given text
    
    Args:
        thesys_client: The Thesys client
        assistant_response: The original assistant response
        conversation_history: Optional conversation history
        enhanced_response: Optional enhanced response from MCP agent
        
    Returns:
        Visualized content as string
    """
    if not thesys_client:
        logger.error("Thesys client not initialized. Cannot visualize.")
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning", 
                "title": "Visualization Error",
                "description": "Visualization service not available."
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'

    # Use enhanced response if available, otherwise use original
    final_response = enhanced_response if enhanced_response else assistant_response
    
    # Format messages for Thesys Visualize API
    messages_for_thesys = format_thesys_messages_for_visualize(final_response, conversation_history)

    try:
        logger.info(f"Sending to Thesys Visualize API (content: {final_response[:100]}...)...")
        
        # Use the visualize endpoint
        completion = await thesys_client.chat.completions.create(
            messages=messages_for_thesys,
            model=config.model.thesys_model,
            stream=False
        )
        
        visualized_content = completion.choices[0].message.content
        logger.info(f"Received visualization from Thesys Visualize API")
        logger.debug(f"Visualization content: {visualized_content}")
        
        # Return the content directly as it should already be in the proper format
        return visualized_content

    except Exception as e:
        logger.error(f"Error calling Thesys Visualize API: {e}", exc_info=True)
        error_component = {
            "component": "Callout",
            "props": {
                "variant": "warning",
                "title": "Visualization Error", 
                "description": f"Failed to generate UI: {str(e)}"
            }
        }
        return f'<content>{json.dumps(error_component)}</content>'
