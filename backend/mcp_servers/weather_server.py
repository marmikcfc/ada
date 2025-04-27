from mcp.server.fastmcp import FastMCP
import random

# Create MCP server for weather utilities
mcp = FastMCP("Weather")

@mcp.tool()
def get_weather(location: str) -> str:
    """
    Get the current weather for a location.
    
    Args:
        location: The city or location to get weather for
        
    Returns:
        Current weather information for the location
    """
    # This is a mock implementation - in a real app, you'd query a weather API
    weather_conditions = ["sunny", "cloudy", "rainy", "snowy", "windy", "foggy", "partly cloudy"]
    temperatures = {
        "sunny": (65, 95),
        "cloudy": (50, 75),
        "rainy": (40, 70),
        "snowy": (20, 35),
        "windy": (45, 65),
        "foggy": (45, 60),
        "partly cloudy": (55, 85)
    }
    
    condition = random.choice(weather_conditions)
    temp_range = temperatures[condition]
    temperature = random.randint(temp_range[0], temp_range[1])
    
    return f"Current weather in {location}: {condition} with a temperature of {temperature}°F"

@mcp.tool()
def get_forecast(location: str, days: int = 3) -> str:
    """
    Get a weather forecast for a location for the specified number of days.
    
    Args:
        location: The city or location to get the forecast for
        days: Number of days for the forecast (1-7)
        
    Returns:
        Weather forecast for the specified location and days
    """
    # This is a mock implementation - in a real app, you'd query a weather API
    if days < 1 or days > 7:
        return "Forecast days must be between 1 and 7."
    
    weather_conditions = ["sunny", "cloudy", "rainy", "snowy", "windy", "foggy", "partly cloudy"]
    forecast = []
    
    for i in range(days):
        condition = random.choice(weather_conditions)
        temp_high = random.randint(50, 85)
        temp_low = random.randint(30, temp_high - 5)
        day_name = ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"][i]
        forecast.append(f"{day_name}: {condition}, High: {temp_high}°F, Low: {temp_low}°F")
    
    forecast_text = "\n".join(forecast)
    return f"Weather forecast for {location}:\n{forecast_text}"

if __name__ == "__main__":
    mcp.run(transport="stdio") 