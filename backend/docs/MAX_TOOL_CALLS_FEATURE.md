# Max Tool Calls Feature

## Overview
The Enhanced MCP Client now supports limiting the maximum number of tool calls that can be made during a single enhancement decision. This prevents runaway tool usage and ensures predictable behavior.

## Configuration

### Default Value
- Default: 10 tool calls per enhancement decision
- Can be configured via the `max_tool_calls` parameter in `MCPClientConfig`

### Setting the Limit

#### Via Configuration
```json
{
  "mcp_config": {
    "model": "gpt-4o-mini",
    "api_key_env": "OPENAI_API_KEY",
    "max_tool_calls": 10,  // Set your desired limit here
    "servers": [...]
  }
}
```

#### Programmatically
```python
client = EnhancedMCPClient(config_path, max_tool_calls=10)
```

## Behavior

### Normal Operation
- The LLM can make multiple sequential tool calls up to the limit
- Each tool call is counted and logged: "Tool call 1/10: tool_name"
- The enhancement decision continues normally until:
  - The `process_enhancement_decision` function is called (normal completion)
  - The max iterations limit is reached (5 iterations)
  - The tool call limit is reached

### When Limit is Reached
When the tool call limit is reached:
1. A warning is logged: "Reached maximum tool call limit (10). Forcing final decision."
2. The enhancement decision is forced with:
   - `displayEnhancement: true`
   - `displayEnhancedText: "[Tool call limit reached after 10 calls]"`
   - `voiceOverText: "I've gathered information using 10 tools."`

### Example Flow
```
User: "Create a comprehensive report with data from multiple sources"
1. Tool call 1/10: fetch_sales_data
2. Tool call 2/10: fetch_customer_data
3. Tool call 3/10: fetch_inventory_data
...
9. Tool call 9/10: generate_chart
10. Tool call 10/10: format_report
[Limit reached - final decision forced]
```

## Benefits

1. **Predictable Costs**: Limits API calls to external services
2. **Performance**: Prevents long-running enhancement decisions
3. **Safety**: Protects against infinite loops or excessive tool usage
4. **Debugging**: Clear logging shows tool usage patterns

## Monitoring

The system logs each tool call with its position in the sequence:
```
INFO: Tool call 1/10: calculator_multiply
INFO: Tool call 2/10: weather_getWeather
WARNING: Reached maximum tool call limit (10). Forcing final decision.
```

## Best Practices

1. **Set Appropriate Limits**: 
   - Simple queries: 5-10 tools
   - Complex workflows: 15-20 tools
   - Data aggregation: 20-30 tools

2. **Monitor Usage**: Review logs to understand typical tool usage patterns

3. **Adjust as Needed**: If legitimate use cases are hitting limits, increase the max_tool_calls value

4. **Consider Prompt Engineering**: Guide the LLM to be more efficient with tool usage through better prompts