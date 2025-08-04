import asyncio
import json
import os
import re
from typing import Awaitable, Callable, Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging
# Third-party / MCP imports
from openai import AsyncOpenAI
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# Shared data models
from schemas import EnhancementDecision

# Streaming utilities
from streaming_parser import (
    StreamingEnhancementGenerator,
    EnhancementStreamingParser,  # <-- NEW: correct low-level parser
)

# Built-in tools
from tools import get_image_src, get_images

logger = logging.getLogger(__name__)

@dataclass
class MCPServerConfig:
    name: str
    url: str
    transport: str
    description: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None  # HTTP headers for this server

@dataclass
class MCPClientConfig:
    model: str
    openai_api_key: str
    servers: List[MCPServerConfig]

class EnhancedMCPClient:
    """Enhanced MCP client that supports HTTP servers and external configuration."""
    
    def __init__(self, config_path: str, max_tool_calls: int = 10):
        self.config_path = config_path
        self.config: Optional[MCPClientConfig] = None
        self.openai_client: Optional[AsyncOpenAI] = None
        self.sessions: Dict[str, ClientSession] = {}
        self.available_tools: Dict[str, Any] = {}
        # Store connection resources for proper cleanup
        self._connection_resources: Dict[str, Tuple[Any, Any, Any]] = {}
        # Maximum number of tool calls allowed per enhancement decision
        self.max_tool_calls = max_tool_calls
        
        # Add built-in tools to available tools
        self._add_builtin_tools()
        
    async def initialize(self):
        """Initialize the MCP client with configuration from JSON file."""
        try:
            # Load configuration
            self.config = await self._load_config()
            
            # Initialize OpenAI client
            self.openai_client = AsyncOpenAI(api_key=self.config.openai_api_key)
            
            # Connect to all MCP servers
            await self._connect_to_servers()
            
            logger.info(f"Enhanced MCP client initialized with {len(self.sessions)} servers")
            
        except Exception as e:
            logger.error(f"Failed to initialize Enhanced MCP client: {e}")
            raise
    
    async def _load_config(self) -> MCPClientConfig:
        """Load configuration from JSON file."""
        try:
            with open(self.config_path, 'r') as f:
                data = json.load(f)
            
            config_section = data.get('config', {})
            servers_section = data.get('servers', {})
            
            # Get OpenAI API key from environment
            openai_api_key_env = config_section.get('openai_api_key_env', 'OPENAI_API_KEY')
            openai_api_key = os.getenv(openai_api_key_env)
            if not openai_api_key:
                raise ValueError(f"OpenAI API key not found in environment variable: {openai_api_key_env}")
            
            # Parse server configurations
            servers = []
            for name, server_config in servers_section.items():
                # Substitute environment variables in URL
                url = server_config.get('url', '') or ''
                url = self._substitute_env_vars(url)
                # Parse optional headers, with env var substitution
                raw_headers = server_config.get('headers') or {}
                headers = None
                if isinstance(raw_headers, dict):
                    headers = {k: self._substitute_env_vars(str(v)) for k, v in raw_headers.items()}
                
                servers.append(MCPServerConfig(
                    name=name,
                    url=url,
                    transport=server_config.get('transport', 'http'),
                    description=server_config.get('description'),
                    command=server_config.get('command'),
                    args=server_config.get('args', []),
                    headers=headers
                ))
            
            return MCPClientConfig(
                model=config_section.get('model', 'gpt-4o-mini'),
                openai_api_key=openai_api_key,
                servers=servers
            )
            
        except Exception as e:
            logger.error(f"Failed to load MCP configuration: {e}")
            raise
    
    def _substitute_env_vars(self, text: str) -> str:
        """Substitute environment variables in text using {VAR_NAME} format."""
        def replace_var(match):
            var_name = match.group(1)
            env_value = os.getenv(var_name)
            if env_value is None:
                logger.warning(f"Environment variable {var_name} not found, keeping placeholder")
                return match.group(0)  # Return original placeholder if env var not found
            return env_value
        
        # Replace {VAR_NAME} with environment variable values
        return re.sub(r'\{([A-Z_][A-Z0-9_]*)\}', replace_var, text)
    
    def _add_builtin_tools(self):
        """Add built-in Python tools to the available tools."""
        try:
            # Add image search tools
            self.available_tools["builtin_get_image_src"] = {
                'server': 'builtin',
                'tool': type('Tool', (), {
                    'name': 'get_image_src',
                    'description': 'Get the image src URL for the given alt text using Google Images search',
                    'inputSchema': {
                        "type": "object",
                        "properties": {
                            "altText": {
                                "type": "string",
                                "description": "The alt text/search query for the image"
                            },
                            "size": {
                                "type": "string",
                                "description": "Image size filter",
                                "enum": ["small", "medium", "large", "xlarge"],
                                "default": "medium"
                            }
                        },
                        "required": ["altText"]
                    }
                })(),
                'handler': get_image_src,
                'session': None
            }
            
            self.available_tools["builtin_get_images"] = {
                'server': 'builtin',
                'tool': type('Tool', (), {
                    'name': 'get_images',
                    'description': 'Get multiple images for the given search query using Google Images search',
                    'inputSchema': {
                        "type": "object",
                        "properties": {
                            "altText": {
                                "type": "string",
                                "description": "The search query for images"
                            },
                            "size": {
                                "type": "string",
                                "description": "Image size filter",
                                "enum": ["small", "medium", "large", "xlarge"],
                                "default": "medium"
                            },
                            "numResults": {
                                "type": "integer",
                                "description": "Number of results to return (1-10)",
                                "minimum": 1,
                                "maximum": 10,
                                "default": 5
                            }
                        },
                        "required": ["altText"]
                    }
                })(),
                'handler': get_images,
                'session': None
            }
            
            logger.info("Built-in tools added successfully")
            
        except Exception as e:
            logger.error(f"Failed to add built-in tools: {e}")
    
    async def _connect_to_servers(self):
        """Connect to all configured MCP servers."""
        for server in self.config.servers:
            try:
                if server.transport == 'http':
                    await self._connect_http_server(server)
                elif server.transport == 'websocket':
                    await self._connect_websocket_server(server)
                elif server.transport == 'stdio':
                    await self._connect_stdio_server(server)
                else:
                    logger.warning(f"Unknown transport type: {server.transport} for server: {server.name}")
                    
            except Exception as e:
                logger.error(f"Failed to connect to server {server.name}: {e}")
                # Continue with other servers even if one fails
                continue
    
    async def _connect_http_server(self, server: MCPServerConfig):
        """Connect to an HTTP-based MCP server and discover tools."""
        try:
            logger.info(f"Connecting to HTTP MCP server: {server.name} at {server.url}")
            
            # Connect and discover tools using the pattern that works
            # Include any configured headers
            client_kwargs = {}
            if server.headers:
                client_kwargs['headers'] = server.headers
            async with streamablehttp_client(server.url, **client_kwargs) as (read_stream, write_stream, _):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    
                    # Discover tools with timeout
                    try:
                        tools_resp = await asyncio.wait_for(
                            session.list_tools(),
                            timeout=10.0  # 10 second timeout for tool discovery
                        )
                        
                        # Store tool information (but not the session since it will be closed)
                        for tool in tools_resp.tools:
                            # Use underscore instead of colon for OpenAI compatibility
                            tool_key = f"{server.name}_{tool.name}"
                            self.available_tools[tool_key] = {
                                'server': server.name,
                                'tool': tool,
                                'server_url': server.url,  # Store URL for reconnection
                                'headers': server.headers,  # Preserve headers for reconnect
                                'session': None  # We'll reconnect for each call
                            }
                        
                        # Store server info in sessions dict for accurate count
                        # (even though we reconnect for each HTTP call)
                        self.sessions[server.name] = {
                            'type': 'http',
                            'url': server.url,
                            'headers': server.headers,
                            'tool_count': len(tools_resp.tools)
                        }
                        
                        logger.info(f"Connected to {server.name}, discovered {len(tools_resp.tools)} tools")
                        
                    except asyncio.TimeoutError:
                        logger.warning(f"Tool discovery for {server.name} timed out. Continuing with initialization.")
                        
        except Exception as e:
            logger.error(f"Failed to connect to HTTP server {server.name}: {e}")
            # Don't raise - continue with other servers
    
    async def _connect_stdio_server(self, server: MCPServerConfig):
        """Connect to a STDIO-based MCP server."""
        try:
            logger.info(f"Connecting to STDIO MCP server: {server.name}")
            
            from mcp.client.stdio import StdioServerParameters, stdio_client
            
            # Create server parameters
            server_params = StdioServerParameters(
                command=server.command,
                args=server.args or []
            )
            
            # Connect to the server process via stdio
            async with stdio_client(server_params) as (read_stream, write_stream):
                # Create and initialize the session
                session = ClientSession(read_stream, write_stream)
                await session.initialize()
                
                # Store session
                self.sessions[server.name] = session
                
                # Discover tools with timeout
                try:
                    tools_resp = await asyncio.wait_for(
                        session.list_tools(),
                        timeout=10.0  # 10 second timeout for tool discovery
                    )
                    
                    for tool in tools_resp.tools:
                        # Use underscore instead of colon for OpenAI compatibility
                        tool_key = f"{server.name}_{tool.name}"
                        self.available_tools[tool_key] = {
                            'server': server.name,
                            'tool': tool,
                            'session': session
                        }
                    
                    logger.info(f"Connected to {server.name}, discovered {len(tools_resp.tools)} tools")
                except asyncio.TimeoutError:
                    logger.warning(f"Tool discovery for {server.name} timed out. Continuing with initialization.")
                    
        except Exception as e:
            logger.error(f"Failed to connect to STDIO server {server.name}: {e}")
            raise

    async def _connect_websocket_server(self, server: MCPServerConfig):
        """Connect to a WebSocket-based MCP server."""
        # This would use the existing WebSocket connection logic
        # For now, we'll log that it's not implemented in this enhanced version
        logger.warning(f"WebSocket transport not yet implemented in enhanced client for: {server.name}")
    
    async def chat_with_tools(self, user_message: str, conversation_history: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Chat with the assistant using available MCP tools.
        
        Args:
            user_message: The user's message
            conversation_history: Optional conversation history
            
        Returns:
            The assistant's response
        """
        if not self.openai_client:
            raise RuntimeError("MCP client not initialized")
        
        # Prepare messages
        messages = conversation_history or []
        messages.append({"role": "user", "content": user_message})
        
        # Prepare function definitions from available tools
        functions = []
        for tool_key, tool_info in self.available_tools.items():
            tool = tool_info['tool']
            description = tool.description or f"Tool from {tool_info['server']}"
            if tool_info.get("headers"):
                description += f" Note: The following headers are sent with this tool call. If you need any of these headers in payload, use them. For create a contact locationId is needed in body: {json.dumps(tool_info['headers'])}"
            
            functions.append({
                "name": tool_key,  # Use server_tool format (OpenAI compatible)
                "description": description,
                "parameters": tool.inputSchema
            })
        
        try:
            # Initial model call with tool definitions
            if functions:
                logger.info(f"Messages: {messages}")
                response = await self.openai_client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    functions=functions,
                    function_call="auto"
                )
            else:
                # No tools → call without the functions parameter
                response = await self.openai_client.chat.completions.create(
                    model=self.config.model,
                    messages=messages
                )
            
            reply = response.choices[0].message
            
            # Check if the model chose to call a function
            if hasattr(reply, 'function_call') and reply.function_call:
                func_call = reply.function_call
                func_name = func_call.name
                args = json.loads(func_call.arguments or "{}")
                
                logger.info(f"Model requested tool: {func_name} with args {args}")
                
                # Call the MCP tool
                tool_result = await self._call_tool(func_name, args)
                
                # Append the assistant's function call message
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "function_call": {
                        "name": func_name,
                        "arguments": json.dumps(args)
                    }
                })
                
                # Append the function's response
                messages.append({
                    "role": "function",
                    "name": func_name,
                    "content": tool_result
                })
                
                # Second model call with the function result
                final_resp = await self.openai_client.chat.completions.create(
                    model=self.config.model,
                    messages=messages
                )
                
                return final_resp.choices[0].message.content
            else:
                # Model answered directly without tool use
                return reply.content
                
        except Exception as e:
            logger.error(f"Error in chat_with_tools: {e}")
            return f"Error processing request: {str(e)}"
    
    async def _call_tool(self, tool_key: str, args: Dict[str, Any]) -> str:
        """Call a specific MCP tool."""
        if tool_key not in self.available_tools:
            return f"Error: Tool {tool_key} not found"
        
        tool_info = self.available_tools[tool_key]
        tool_name = tool_info['tool'].name
        
        try:
            # Handle built-in tools
            if tool_info['server'] == 'builtin':
                handler = tool_info['handler']
                logger.info(f"Calling built-in tool: {tool_name} with args {args}")
                
                # Convert camelCase to snake_case for function parameters
                converted_args = {}
                for key, value in args.items():
                    if key == 'altText':
                        converted_args['alt_text'] = value
                    elif key == 'numResults':
                        converted_args['num_results'] = value
                    else:
                        converted_args[key] = value
                
                # Call the built-in tool handler
                result = await handler(**converted_args)
                
                # Convert result to string for consistency
                if isinstance(result, list):
                    return json.dumps(result, indent=2)
                else:
                    return str(result)
            
            # If it's an HTTP server, reconnect for the tool call
            elif 'server_url' in tool_info:
                server_url = tool_info['server_url']
                headers = tool_info.get('headers')
                logger.info(f"Reconnecting to HTTP server for tool call: {tool_key}")
                
                client_kwargs = {}
                if headers:
                    client_kwargs['headers'] = headers
                async with streamablehttp_client(server_url, **client_kwargs) as (read_stream, write_stream, _):
                    async with ClientSession(read_stream, write_stream) as session:
                        await session.initialize()
                        # Call the MCP tool with timeout to prevent hanging

                        logger.info(f"Calling tool: {tool_name} with args {args}")
                        if "contacts_create-contact" in tool_name:
                            args = {"body": args}
                            logger.info(f"Arg got revamped for ghl-mcp_contacts_create-contact: {args}")
                        tool_result = await asyncio.wait_for(
                            session.call_tool(tool_name, args),
                            timeout=30.0  # 20 second timeout for tool calls
                        )
                        
                        logger.info(f"Tool result: {tool_result}")

                        # Extract text result
                        if tool_result.isError:
                            return f"Error: {tool_result.content[0].text if tool_result.content else 'Unknown error'}"
                        else:
                            return tool_result.content[0].text if tool_result.content else "No result"
            else:
                # For STDIO servers, use the stored session
                session = tool_info['session']
                if not session:
                    return f"Error: No session available for tool {tool_key}"
                
                # Call the MCP tool with timeout to prevent hanging
                tool_result = await asyncio.wait_for(
                    session.call_tool(tool_name, arguments=args),
                    timeout=20.0  # 20 second timeout for tool calls
                )
                
                # Extract text result
                if tool_result.isError:
                    return f"Error: {tool_result.content[0].text if tool_result.content else 'Unknown error'}"
                else:
                    return tool_result.content[0].text if tool_result.content else "No result"
                
        except asyncio.TimeoutError:
            logger.error(f"Tool call to {tool_key} timed out")
            return f"Error: Tool call timed out after 20 seconds"
        except Exception as e:
            logger.error(f"Error calling tool {tool_key}: {e}")
            return f"Error calling tool: {str(e)}"
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tool names."""
        return list(self.available_tools.keys())
    
    def get_tools(self) -> List[Any]:
        """Get tools in the format expected by LangGraph/LangChain integration."""
        tools = []
        for tool_key, tool_info in self.available_tools.items():
            tool = tool_info['tool']
            # Create a tool object that mimics the expected interface
            class ToolWrapper:
                def __init__(self, name, description, input_schema, call_func):
                    self.name = name
                    self.description = description
                    self.inputSchema = input_schema
                    self._call_func = call_func
                
                async def call(self, arguments):
                    return await self._call_func(arguments)
            
            wrapped_tool = ToolWrapper(
                name=tool_key,
                description=tool.description or f"Tool from {tool_info['server']}",
                input_schema=tool.inputSchema,
                call_func=lambda args, tk=tool_key: self._call_tool(tk, args)
            )
            tools.append(wrapped_tool)
        return tools
        
    async def close(self):
        """Close all MCP sessions."""
        # Close all sessions
        for session in self.sessions.values():
            try:
                await session.close()
            except Exception as e:
                logger.error(f"Error closing session: {e}")
        
        # Close all connection resources
        for server_name, (_, _, close_func) in self._connection_resources.items():
            try:
                if close_func:
                    await close_func()
                    logger.debug(f"Closed connection resources for {server_name}")
            except Exception as e:
                logger.error(f"Error closing connection resources for {server_name}: {e}")
        
        self.sessions.clear()
        self.available_tools.clear()
        self._connection_resources.clear()

    async def make_enhancement_decision_streaming(
        self,
        assistant_response: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        voice_injection_callback: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> EnhancementDecision:
        """
        Make an enhancement decision with full streaming support for both function
        calls and direct answers, enabling real-time voice-over injection.
        Uses the same unified function call pattern as the non-streaming version.
        """
        if not self.openai_client:
            raise RuntimeError("MCP client not initialized")

        try:
            # Load the enhancement prompt
            prompt_path = os.path.join(os.path.dirname(__file__), "../prompts", "mcp_agent_prompt.txt")
            with open(prompt_path, "r") as f:
                enhancement_prompt = f.read().strip()
                
            # Get available tools information
            available_tools_info = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                available_tools_info.append({
                    "name": tool_key,
                    "description": tool.description or f"Tool from {tool_info['server']}",
                    "server": tool_info['server'],
                    "headers": tool_info.get("headers")
                })
            
            # Format the prompt with available tools
            tools_description = "\n".join([
                f"- **{tool['name']}** ({tool['server']}): {tool['description']}" +
                (f" (Headers sent: {json.dumps(tool['headers'])})" if tool.get('headers') else "")
                for tool in available_tools_info
            ])
            
            if not tools_description:
                tools_description = "No tools currently available."
            
            formatted_prompt = enhancement_prompt.format(available_tools=tools_description)
            
            # Prepare conversation context
            context_text = ""
            if conversation_history:
                context_text = "\n\nConversation Context:\n"
                for msg in conversation_history[-3:]:  # Last 3 messages for context
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    context_text += f"{role}: {content}\n"
            
            # Prepare messages for OpenAI with tool-aware prompt
            messages = [
                {"role": "system", "content": formatted_prompt},
                {"role": "user", "content": f"""Analyze this voice assistant response and make an enhancement decision:

Original Response: "{assistant_response}"{context_text}

Instructions:
1. If tools would help improve this response, call them first
2. Once you have all the information you need (from tools or original response), call the process_enhancement_decision function to provide your final decision
3. Always end by calling process_enhancement_decision - this is required to complete the task"""}
            ]
            
            # Prepare function definitions from available tools
            functions = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                description = tool.description or f"Tool from {tool_info['server']}"
                if tool_info.get("headers"):
                    description += f" Note: The following headers are sent with this tool call: {json.dumps(tool_info['headers'])}"
                
                functions.append({
                    "name": tool_key,
                    "description": description,
                    "parameters": tool.inputSchema
                })
            
            # Add the synthetic enhancement decision function
            functions.append({
                "name": "process_enhancement_decision",
                "description": "Process and return the final enhancement decision for the voice assistant response. Call this after using any tools or to provide the final decision.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "displayEnhancement": {
                            "type": "boolean",
                            "description": "Whether to display visual enhancement to the user"
                        },
                        "displayEnhancedText": {
                            "type": "string", 
                            "description": "The enhanced text to display to the user (can include tool results, formatting, etc.)"
                        },
                        "voiceOverText": {
                            "type": "string",
                            "description": "Text for voice-over narration (empty string if no enhancement)"
                        }
                    },
                    "required": ["displayEnhancement", "displayEnhancedText", "voiceOverText"]
                }
            })
            
            # Process function calls in a loop until we get the final decision
            tools_used = []
            max_iterations = 5  # Prevent infinite loops
            iteration = 0
            total_tool_calls = 0  # Track total number of tool calls
            
            while iteration < max_iterations:
                iteration += 1
                
                try:
                    # -- Start of Streaming Logic --
                    stream_params = {
                        "model": self.config.model,
                        "messages": messages,
                        "stream": True,
                        "temperature": 0.3,
                        "functions": functions,
                        "function_call": "auto"
                    }

                    stream = await self.openai_client.chat.completions.create(**stream_params)

                    # Buffers to handle the stream
                    is_function_call = False
                    func_name = ""
                    func_args_buffer = ""
                    content_buffer = ""

                    async for chunk in stream:
                        delta = chunk.choices[0].delta
                        if not delta:
                            continue
                        
                        if delta.function_call:
                            is_function_call = True
                            if delta.function_call.name:
                                func_name = delta.function_call.name
                            if delta.function_call.arguments:
                                func_args_buffer += delta.function_call.arguments
                        
                        if delta.content:
                            content_buffer += delta.content
                            # DO NOT inject regular content - only inject final voiceOverText from enhancement decision
                    
                    # -- End of Streaming, now process the result --
                    
                    if is_function_call:
                        logger.info(f"Streaming detected function call: {func_name} with args: {func_args_buffer}")
                        
                        try:
                            args = json.loads(func_args_buffer)
                        except json.JSONDecodeError:
                            args = {}
                            logger.error(f"Failed to parse function arguments: {func_args_buffer}")
                        
                        # Handle the special enhancement decision function
                        if func_name == "process_enhancement_decision":
                            decision = EnhancementDecision(
                                displayEnhancement=args.get("displayEnhancement", False),
                                displayEnhancedText=args.get("displayEnhancedText", assistant_response),
                                voiceOverText=args.get("voiceOverText", "")
                            )
                            
                            # Handle voice injection callback
                            if decision.displayEnhancement and voice_injection_callback and decision.voiceOverText != "":
                                await voice_injection_callback(decision.voiceOverText)
                            
                            logger.info(f"Enhanced MCP Agent decision (streaming): enhancement={decision.displayEnhancement}, tools_used={len(tools_used)}")
                            return decision
                        
                        # Handle regular MCP tool calls
                        else:
                            # Check if we've reached the tool call limit
                            if total_tool_calls >= self.max_tool_calls:
                                logger.warning(f"Reached maximum tool call limit ({self.max_tool_calls}). Forcing final decision.")
                                return EnhancementDecision(
                                    displayEnhancement=True,
                                    displayEnhancedText=f"[Tool call limit reached after {self.max_tool_calls} calls]",
                                    voiceOverText=f"I've gathered information using {self.max_tool_calls} tools."
                                )
                            
                            # Inject voice-over for tool usage
                            if voice_injection_callback:
                                await voice_injection_callback(f"I'm using the {func_name.split('_')[-1]} tool. ")
                            
                            tool_result = await self._call_tool(func_name, args)
                            tools_used.append(func_name)
                            total_tool_calls += 1
                            logger.info(f"Tool call {total_tool_calls}/{self.max_tool_calls}: {func_name}")
                            
                            # Append the assistant's function call message
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "function_call": {
                                    "name": func_name,
                                    "arguments": json.dumps(args)
                                }
                            })
                            
                            # Append the function's response
                            messages.append({
                                "role": "function", 
                                "name": func_name,
                                "content": tool_result
                            })
                            
                            # Continue the loop to let the model make the next decision
                            continue
                    
                    else:
                        # Model provided content without function call - this shouldn't happen with our prompt
                        logger.warning("Model provided response without calling process_enhancement_decision function")
                        # Force a final decision
                        return EnhancementDecision(
                            displayEnhancement=len(tools_used) > 0,
                            displayEnhancedText=content_buffer or assistant_response,
                            voiceOverText="I used tools to help answer your question." if tools_used else ""
                        )
                
                except asyncio.TimeoutError:
                    logger.error(f"Streaming function call iteration {iteration} timed out")
                    break
                except Exception as e:
                    logger.error(f"Error in streaming function call iteration {iteration}: {e}")
                    break
            
            # Fallback if we exit the loop without a decision
            logger.warning("Reached max iterations or error in streaming, returning fallback decision")
            return EnhancementDecision(
                displayEnhancement=len(tools_used) > 0,
                displayEnhancedText=assistant_response,
                voiceOverText="I used tools to help answer your question." if tools_used else ""
            )

        except Exception as e:
            logger.error(f"Error in streaming enhanced MCP agent decision: {e}", exc_info=True)
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=""
            )