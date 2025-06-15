import asyncio
import json
import os
import re
from typing import Awaitable, Callable, Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging
from openai import AsyncOpenAI
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# Import the EnhancementDecision model
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

@dataclass
class MCPServerConfig:
    name: str
    url: str
    transport: str
    description: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None

@dataclass
class MCPClientConfig:
    model: str
    openai_api_key: str
    servers: List[MCPServerConfig]

class EnhancementDecision(BaseModel):
    """Pydantic model for MCP agent's enhancement decision response."""
    displayEnhancement: bool = Field(
        description="Whether the response should be enhanced with dynamic UI components"
    )
    displayEnhancedText: str = Field(
        description="The text to use for UI generation (if enhancement is true) or plain text display (if enhancement is false)"
    )
    voiceOverText: str = Field(
        description="The text to be spoken via TTS - should be natural and conversational"
    )

class EnhancedMCPClient:
    """Enhanced MCP client that supports HTTP servers and external configuration."""
    
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config: Optional[MCPClientConfig] = None
        self.openai_client: Optional[AsyncOpenAI] = None
        self.sessions: Dict[str, ClientSession] = {}
        self.available_tools: Dict[str, Any] = {}
        # Store connection resources for proper cleanup
        self._connection_resources: Dict[str, Tuple[Any, Any, Any]] = {}
        
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
                url = server_config.get('url', '')
                url = self._substitute_env_vars(url)
                
                servers.append(MCPServerConfig(
                    name=name,
                    url=url,
                    transport=server_config.get('transport', 'http'),
                    description=server_config.get('description'),
                    command=server_config.get('command'),
                    args=server_config.get('args', [])
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
            async with streamablehttp_client(server.url) as (read_stream, write_stream, _):
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
                                'session': None  # We'll reconnect for each call
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
            functions.append({
                "name": tool_key,  # Use server_tool format (OpenAI compatible)
                "description": tool.description or f"Tool from {tool_info['server']}",
                "parameters": tool.inputSchema
            })
        
        try:
            # Initial model call with tool definitions
            if functions:
                # Tools available → expose them to the model
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
            # If it's an HTTP server, reconnect for the tool call
            if 'server_url' in tool_info:
                server_url = tool_info['server_url']
                logger.info(f"Reconnecting to HTTP server for tool call: {tool_key}")
                
                async with streamablehttp_client(server_url) as (read_stream, write_stream, _):
                    async with ClientSession(read_stream, write_stream) as session:
                        await session.initialize()
                        
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
    
    def get_tools_for_langchain(self) -> List[Dict[str, Any]]:
        """Get tools in LangChain format for integration."""
        tools = []
        for tool_key, tool_info in self.available_tools.items():
            tool = tool_info['tool']
            tools.append({
                'name': tool_key,
                'description': tool.description or f"Tool from {tool_info['server']}",
                'parameters': tool.inputSchema,
                'function': lambda args, tk=tool_key: self._call_tool(tk, args)
            })
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
        Make an enhancement decision with streaming support for real-time voice-over injection.
        
        Args:
            assistant_response: The original voice assistant response
            conversation_history: Optional conversation history for context
            voice_injection_callback: Async callback for real-time voice-over injection
            
        Returns:
            EnhancementDecision with display and voice-over recommendations
        """
        if not self.openai_client:
            raise RuntimeError("MCP client not initialized")
        
        try:
            from .streaming_parser import StreamingEnhancementGenerator
            
            # Load the enhancement prompt
            prompt_path = os.path.join(os.path.dirname(__file__), "..", "..", "prompts", "voice_enhancement_mcp_prompt.txt")
            try:
                with open(prompt_path, "r") as f:
                    enhancement_prompt = f.read().strip()
            except FileNotFoundError:
                enhancement_prompt = """You are an AI assistant that decides whether a response should be enhanced with dynamic UI or displayed as plain text.

Available tools: {available_tools}

Analyze the assistant response and determine:
1. If the content would benefit from visual enhancement
2. What enhanced text should be used for UI generation
3. What text should be used for voice-over/TTS
4. If any tools should be called to improve the response

For simple conversational responses, set displayEnhancement to false.
For responses with data, analysis, or tool usage, set displayEnhancement to true."""
            
            # Get available tools information
            available_tools_info = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                available_tools_info.append({
                    "name": tool_key,
                    "description": tool.description or f"Tool from {tool_info['server']}",
                    "server": tool_info['server']
                })
            
            # Format the prompt with available tools
            tools_description = "\n".join([
                f"- **{tool['name']}** ({tool['server']}): {tool['description']}"
                for tool in available_tools_info
            ])
            
            if not tools_description:
                tools_description = "No tools currently available."
            
            formatted_prompt = enhancement_prompt.format(available_tools=tools_description)
            
            # Prepare conversation context
            context_text = ""
            if conversation_history:
                context_text = "\n\nConversation Context:\n"
                for msg in conversation_history[-3:]:
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    context_text += f"{role}: {content}\n"
            
            # Prepare messages for OpenAI with tool-aware prompt
            messages = [
                {"role": "system", "content": formatted_prompt},
                {"role": "user", "content": f"""Analyze this voice assistant response and make an enhancement decision:

Original Response: "{assistant_response}"{context_text}

Consider:
1. Should any tools be called to improve this response?
2. Would visual enhancement improve user experience?
3. What's the best voice-over approach?

If tools would help, call them. Then provide your structured enhancement decision."""}
            ]
            
            # Prepare function definitions from available tools
            functions = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                functions.append({
                    "name": tool_key,
                    "description": tool.description or f"Tool from {tool_info['server']}",
                    "parameters": tool.inputSchema
                })
            
            # Use streaming generator
            generator = StreamingEnhancementGenerator(self.openai_client, self.config.model)
            
            # Handle function calls and streaming
            if functions:
                # Check for function calls first
                response = await asyncio.wait_for(
                    self.openai_client.chat.completions.create(
                        model=self.config.model,
                        messages=messages,
                        functions=functions,
                        function_call="auto",
                        temperature=0.3
                    ),
                    timeout=30.0
                )
                
                reply = response.choices[0].message
                
                # If function call detected, handle it and then stream the final decision
                if hasattr(reply, 'function_call') and reply.function_call:
                    func_call = reply.function_call
                    func_name = func_call.name
                    args = json.loads(func_call.arguments or "{}")
                    
                    logger.info(f"Model requested tool: {func_name} with args {args}")
                    
                    # Call the MCP tool
                    tool_result = await self._call_tool(func_name, args)
                    
                    # Send immediate voice feedback about tool usage
                    if voice_injection_callback:
                        await voice_injection_callback("I'm using tools to help answer your question. ")
                    
                    # Update messages with tool result
                    messages.extend([
                        {
                            "role": "assistant",
                            "content": None,
                            "function_call": {
                                "name": func_name,
                                "arguments": json.dumps(args)
                            }
                        },
                        {
                            "role": "function",
                            "name": func_name,
                            "content": tool_result
                        },
                        {
                            "role": "user", 
                            "content": "Now provide your structured enhancement decision based on the tool results."
                        }
                    ])
                    
                    # Stream the final decision with tool results
                    final_decision = await generator.stream_enhancement_decision(
                        messages, 
                        voice_injection_callback=voice_injection_callback
                    )
                    
                    # Force display enhancement since tools were used
                    if isinstance(final_decision, EnhancementDecision):
                        final_decision.displayEnhancement = True
                        if not final_decision.voiceOverText.strip():
                            final_decision.voiceOverText = f"I used the {func_name} tool to help answer your question."
                        
                        logger.info(f"Enhanced MCP Agent decision (with tools): enhancement={final_decision.displayEnhancement}")
                        return final_decision
                    else:
                        # Fallback for tool calls
                        return EnhancementDecision(
                            displayEnhancement=True,
                            displayEnhancedText=f"Tool Result: {tool_result}",
                            voiceOverText=f"I used the {func_name} tool to help answer your question."
                        )
            
            # No function calls - stream the decision directly  
            final_decision = await generator.stream_enhancement_decision(
                messages,
                voice_injection_callback=voice_injection_callback
            )
            
            if isinstance(final_decision, EnhancementDecision):
                logger.info(f"Enhanced MCP Agent decision (streaming): enhancement={final_decision.displayEnhancement}")
                return final_decision
            else:
                # Fallback decision
                return EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText=assistant_response,
                    voiceOverText=assistant_response
                )
                
        except Exception as e:
            logger.error(f"Error in streaming enhanced MCP agent decision: {e}", exc_info=True)
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=assistant_response
            )

    async def make_enhancement_decision(self, assistant_response: str, conversation_history: Optional[List[Dict[str, Any]]] = None) -> EnhancementDecision:
        """
        Make an enhancement decision for a voice assistant response using MCP tools and OpenAI.
        Optimized to use minimal LLM calls - one call if no tools, multiple only if tools are used.
        
        Args:
            assistant_response: The original voice assistant response
            conversation_history: Optional conversation history for context
            
        Returns:
            EnhancementDecision with display and voice-over recommendations
        """
        if not self.openai_client:
            raise RuntimeError("MCP client not initialized")
        
        try:
            # Load the enhancement prompt
            prompt_path = os.path.join(os.path.dirname(__file__), "..", "..", "prompts", "voice_enhancement_mcp_prompt.txt")
            try:
                with open(prompt_path, "r") as f:
                    enhancement_prompt = f.read().strip()
            except FileNotFoundError:
                # Fallback prompt if file not found
                enhancement_prompt = """You are an AI assistant that decides whether a response should be enhanced with dynamic UI or displayed as plain text.

Available tools: {available_tools}

Analyze the assistant response and determine:
1. If the content would benefit from visual enhancement
2. What enhanced text should be used for UI generation
3. What text should be used for voice-over/TTS
4. If any tools should be called to improve the response

For simple conversational responses, set displayEnhancement to false.
For responses with data, analysis, or tool usage, set displayEnhancement to true."""
            
            # Get available tools information
            available_tools_info = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                available_tools_info.append({
                    "name": tool_key,
                    "description": tool.description or f"Tool from {tool_info['server']}",
                    "server": tool_info['server']
                })
            
            # Format the prompt with available tools
            tools_description = "\n".join([
                f"- **{tool['name']}** ({tool['server']}): {tool['description']}"
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

Consider:
1. Should any tools be called to improve this response?
2. Would visual enhancement improve user experience?
3. What's the best voice-over approach?

If tools would help, call them. Then provide your structured enhancement decision."""}
            ]
            
            # Prepare function definitions from available tools
            functions = []
            for tool_key, tool_info in self.available_tools.items():
                tool = tool_info['tool']
                functions.append({
                    "name": tool_key,  # Use server_tool format (OpenAI compatible)
                    "description": tool.description or f"Tool from {tool_info['server']}",
                    "parameters": tool.inputSchema
                })
            
            # Single LLM call with tools attached
            tools_were_used = False
            final_response_text = assistant_response
            
            try:
                # Initial model call with tool definitions and structured output
                if functions:
                    # Call with tools available
                    response = await asyncio.wait_for(
                        self.openai_client.chat.completions.create(
                            model=self.config.model,
                            messages=messages,
                            functions=functions,
                            function_call="auto",
                            temperature=0.3
                        ),
                        timeout=30.0
                    )
                else:
                    # No tools available, direct call
                    response = await asyncio.wait_for(
                        self.openai_client.beta.chat.completions.parse(
                            model=self.config.model,
                            messages=messages,
                            response_format=EnhancementDecision,
                            temperature=0.3
                        ),
                        timeout=30.0
                    )
                    return response.choices[0].message.parsed
                
                reply = response.choices[0].message
                
                # Check if the model chose to call a function
                if hasattr(reply, 'function_call') and reply.function_call:
                    func_call = reply.function_call
                    func_name = func_call.name
                    args = json.loads(func_call.arguments or "{}")
                    
                    logger.info(f"Model requested tool: {func_name} with args {args}")
                    
                    # Call the MCP tool
                    tool_result = await self._call_tool(func_name, args)
                    tools_were_used = True
                    
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
                    
                    # Update the final response text to include tool results
                    final_response_text = f"{assistant_response}\n\nTool Result: {tool_result}"
                    
                    # Second model call with the function result to get enhancement decision
                    final_messages = messages + [
                        {"role": "user", "content": "Now provide your structured enhancement decision based on the tool results."}
                    ]
                    
                    try:
                        final_resp = await asyncio.wait_for(
                            self.openai_client.beta.chat.completions.parse(
                                model=self.config.model,
                                messages=final_messages,
                                response_format=EnhancementDecision,
                                temperature=0.3
                            ),
                            timeout=30.0
                        )
                        
                        decision = final_resp.choices[0].message.parsed
                        
                        # Force display enhancement since tools were used
                        decision.displayEnhancement = True
                        if not decision.voiceOverText.startswith("I used"):
                            decision.voiceOverText = f"I used tools to help answer your question. {decision.voiceOverText}"
                        
                        logger.info(f"Enhanced MCP Agent decision (with tools): enhancement={decision.displayEnhancement}")
                        return decision
                        
                    except Exception as structured_error:
                        logger.warning(f"Structured output failed after tool use, falling back: {structured_error}")
                        
                        # Fallback to regular completion
                        regular_completion = await asyncio.wait_for(
                            self.openai_client.chat.completions.create(
                                model=self.config.model,
                                messages=final_messages + [{"role": "user", "content": "Respond with JSON: {\"displayEnhancement\": boolean, \"displayEnhancedText\": \"text\", \"voiceOverText\": \"text\"}"}],
                                temperature=0.3
                            ),
                            timeout=30.0
                        )
                        
                        # Parse JSON manually
                        try:
                            json_response = json.loads(regular_completion.choices[0].message.content)
                            decision = EnhancementDecision(
                                displayEnhancement=True,  # Force true since tools were used
                                displayEnhancedText=json_response.get("displayEnhancedText", final_response_text),
                                voiceOverText=f"I used tools to help answer your question. {json_response.get('voiceOverText', final_response_text)}"
                            )
                            
                            logger.info(f"Enhanced MCP Agent decision (fallback with tools): enhancement={decision.displayEnhancement}")
                            return decision
                            
                        except Exception as parse_error:
                            logger.error(f"Failed to parse JSON fallback after tool use: {parse_error}")
                            # Return fallback decision with tool context
                            return EnhancementDecision(
                                displayEnhancement=True,
                                displayEnhancedText=final_response_text,
                                voiceOverText=f"I used tools to help answer your question. {final_response_text}"
                            )
                else:
                    # Model answered directly without tool use - now get enhancement decision
                    enhanced_messages = messages + [
                        {"role": "assistant", "content": reply.content or assistant_response},
                        {"role": "user", "content": "Now provide your structured enhancement decision for this response."}
                    ]
                    
                    try:
                        decision_resp = await asyncio.wait_for(
                            self.openai_client.beta.chat.completions.parse(
                                model=self.config.model,
                                messages=enhanced_messages,
                                response_format=EnhancementDecision,
                                temperature=0.3
                            ),
                            timeout=30.0
                        )
                        
                        decision = decision_resp.choices[0].message.parsed
                        logger.info(f"Enhanced MCP Agent decision (no tools): enhancement={decision.displayEnhancement}")
                        return decision
                        
                    except Exception as structured_error:
                        logger.warning(f"Structured output failed, falling back to regular completion: {structured_error}")
                        
                        # Fallback to regular completion
                        regular_completion = await asyncio.wait_for(
                            self.openai_client.chat.completions.create(
                                model=self.config.model,
                                messages=enhanced_messages + [{"role": "user", "content": "Respond with JSON: {\"displayEnhancement\": boolean, \"displayEnhancedText\": \"text\", \"voiceOverText\": \"text\"}"}],
                                temperature=0.3
                            ),
                            timeout=30.0
                        )
                        
                        # Parse JSON manually
                        try:
                            json_response = json.loads(regular_completion.choices[0].message.content)
                            decision = EnhancementDecision(
                                displayEnhancement=json_response.get("displayEnhancement", False),
                                displayEnhancedText=json_response.get("displayEnhancedText", assistant_response),
                                voiceOverText=json_response.get("voiceOverText", assistant_response)
                            )
                            
                            logger.info(f"Enhanced MCP Agent decision (fallback no tools): enhancement={decision.displayEnhancement}")
                            return decision
                            
                        except Exception as parse_error:
                            logger.error(f"Failed to parse JSON fallback: {parse_error}")
                            raise structured_error
                            
            except asyncio.TimeoutError:
                logger.error("Enhancement decision timed out after 30 seconds")
                # Return fallback decision
                return EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText=assistant_response,
                    voiceOverText=assistant_response
                )
            except Exception as e:
                logger.error(f"Error in optimized enhancement decision: {e}", exc_info=True)
                # Return fallback decision
                return EnhancementDecision(
                    displayEnhancement=False,
                    displayEnhancedText=assistant_response,
                    voiceOverText=assistant_response
                )
                
        except Exception as e:
            logger.error(f"Error in enhanced MCP agent decision: {e}", exc_info=True)
            # Return fallback decision
            return EnhancementDecision(
                displayEnhancement=False,
                displayEnhancedText=assistant_response,
                voiceOverText=assistant_response
            )

# Example usage function
async def example_usage():
    """Example of how to use the Enhanced MCP Client."""
    client = EnhancedMCPClient("mcp_servers.json")
    
    try:
        await client.initialize()
        
        print(f"Available tools: {client.get_available_tools()}")
        
        # Chat with tools
        response = await client.chat_with_tools("What is 2 + 3?")
        print(f"Assistant response: {response}")
        
        # Test enhancement decision
        decision = await client.make_enhancement_decision("The result is 42")
        print(f"Enhancement decision: {decision}")
        
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(example_usage())
