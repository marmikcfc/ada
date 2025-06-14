#!/usr/bin/env python3
"""
Simple HTTP MCP Server Example
This is a basic example of an HTTP-based MCP server that provides calculator tools.
"""

import asyncio
import json
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Simple Calculator MCP Server")

class MCPRequest(BaseModel):
    method: str
    params: Dict[str, Any] = {}

class MCPResponse(BaseModel):
    result: Any = None
    error: str = None

# Available tools
TOOLS = [
    {
        "name": "add",
        "description": "Add two numbers",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number", "description": "First number"},
                "b": {"type": "number", "description": "Second number"}
            },
            "required": ["a", "b"]
        }
    },
    {
        "name": "multiply",
        "description": "Multiply two numbers",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number", "description": "First number"},
                "b": {"type": "number", "description": "Second number"}
            },
            "required": ["a", "b"]
        }
    },
    {
        "name": "divide",
        "description": "Divide two numbers",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number", "description": "Dividend"},
                "b": {"type": "number", "description": "Divisor"}
            },
            "required": ["a", "b"]
        }
    }
]

@app.post("/mcp")
async def mcp_endpoint(request: MCPRequest):
    """Main MCP endpoint that handles all MCP protocol messages."""
    
    try:
        if request.method == "initialize":
            return MCPResponse(result={
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "simple-calculator",
                    "version": "1.0.0"
                }
            })
        
        elif request.method == "tools/list":
            return MCPResponse(result={"tools": TOOLS})
        
        elif request.method == "tools/call":
            tool_name = request.params.get("name")
            arguments = request.params.get("arguments", {})
            
            if tool_name == "add":
                a = arguments.get("a")
                b = arguments.get("b")
                if a is None or b is None:
                    raise ValueError("Both 'a' and 'b' parameters are required")
                result = a + b
                return MCPResponse(result={
                    "content": [{"type": "text", "text": f"The sum of {a} and {b} is {result}"}],
                    "isError": False
                })
            
            elif tool_name == "multiply":
                a = arguments.get("a")
                b = arguments.get("b")
                if a is None or b is None:
                    raise ValueError("Both 'a' and 'b' parameters are required")
                result = a * b
                return MCPResponse(result={
                    "content": [{"type": "text", "text": f"The product of {a} and {b} is {result}"}],
                    "isError": False
                })
            
            elif tool_name == "divide":
                a = arguments.get("a")
                b = arguments.get("b")
                if a is None or b is None:
                    raise ValueError("Both 'a' and 'b' parameters are required")
                if b == 0:
                    return MCPResponse(result={
                        "content": [{"type": "text", "text": "Error: Division by zero is not allowed"}],
                        "isError": True
                    })
                result = a / b
                return MCPResponse(result={
                    "content": [{"type": "text", "text": f"The quotient of {a} divided by {b} is {result}"}],
                    "isError": False
                })
            
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
        
        else:
            raise ValueError(f"Unknown method: {request.method}")
    
    except Exception as e:
        return MCPResponse(error=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "server": "simple-calculator-mcp"}

if __name__ == "__main__":
    print("Starting Simple Calculator MCP Server on http://localhost:3001")
    uvicorn.run(app, host="0.0.0.0", port=3001) 