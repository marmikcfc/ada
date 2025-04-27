import mcp
from mcp.client.websocket import websocket_client
from mcp.client.sse import sse_client
from mcp import ClientSession

import json
import base64

config = {}
# Encode config in base64
config_b64 = base64.b64encode(json.dumps(config).encode())
smithery_api_key = "d3af2042-0946-4a17-b485-2a902e8aa8cf"

# Create server URL
url = f"https://server.smithery.ai/@turkyden/weather/mcp?config={config_b64}&api_key={smithery_api_key}"

async def main():
    # Connect to the server using websocket client
    conn = sse_client(url=url)
    streams = await conn.__aenter__()
    session_context = ClientSession(*streams)
    session = await session_context.__aenter__()
    await session.initialize()
    tools_result = await session.list_tools()
    print(f"Available tools: {', '.join([t.name for t in tools_result.tools])}")



    # async with websocket_client(url) as streams:
    #     async with mcp.ClientSession(*streams) as session:
    #         # Initialize the connection
    #         await session.initialize()
    #         # List available tools
    #         tools_result = await session.list_tools()
    #         print(f"Available tools: {', '.join([t.name for t in tools_result.tools])}")

    #         # Example of calling a tool:
    #         # result = await session.call_tool("tool-name", arguments={"arg1": "value"})

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())