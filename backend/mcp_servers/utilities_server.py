from mcp.server.fastmcp import FastMCP
from datetime import datetime
import json

# Create MCP server for utilities
mcp = FastMCP("Utilities")

@mcp.tool()
def get_current_time() -> str:
    """Get the current date and time."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@mcp.tool()
def search_knowledge_base(query: str) -> str:
    """
    Search the knowledge base for information related to the query.
    
    Args:
        query: The search query string
        
    Returns:
        Information related to the query
    """
    # This is a mock implementation - in a real app, you'd query a vector DB
    knowledge_base = {
        "weather": "The weather system provides forecasts and current conditions.",
        "help": "You can ask me about the weather, time, or any general information.",
        "features": "I can provide the current time and search the knowledge base.",
    }
    
    # Simple keyword matching
    results = {}
    for key, value in knowledge_base.items():
        if query.lower() in key.lower() or query.lower() in value.lower():
            results[key] = value
    
    if results:
        return json.dumps(results, indent=2)
    else:
        return "No information found for your query."

@mcp.tool()
def calculate(expression: str) -> str:
    """
    Safely evaluate a mathematical expression.
    
    Args:
        expression: The mathematical expression as a string (e.g., "2 + 2")
        
    Returns:
        The result of the calculation
    """
    # This uses a safe evaluation approach for basic math
    try:
        # Create a safe dictionary of allowed operations
        allowed_names = {
            "abs": abs, "round": round,
            "max": max, "min": min,
        }
        
        # Add number conversion
        for name in ["int", "float"]:
            allowed_names[name] = eval(name)
        
        # Evaluate expression with limited namespace
        code = compile(expression, "<string>", "eval")
        for name in code.co_names:
            if name not in allowed_names:
                raise NameError(f"The use of '{name}' is not allowed")
                
        result = eval(code, {"__builtins__": {}}, allowed_names)
        return str(result)
    except Exception as e:
        return f"Error in calculation: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio") 