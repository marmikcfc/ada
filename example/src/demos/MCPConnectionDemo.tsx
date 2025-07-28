import React, { useState, useCallback, useEffect } from 'react';
import { useGeUIClient, MCPConnectionStatus } from '../../../packages/geui-sdk/src';
import MCPServerConfig, { MCPConfig } from '../components/MCPServerConfig';

/**
 * Demo: MCP Connection Management
 * 
 * This demonstrates how to dynamically configure MCP servers from the frontend
 * and establish connection-scoped MCP clients. Users can:
 * 
 * 1. Configure MCP servers dynamically
 * 2. Send MCP configuration via WebSocket
 * 3. Monitor MCP connection status
 * 4. Test different MCP server configurations
 */

const MCPConnectionDemo: React.FC = () => {
  const [mcpConfig, setMcpConfig] = useState<MCPConfig | null>(null);
  const [isConfigMode, setIsConfigMode] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Use Genux SDK with MCP support
  const genuxClient = useGeUIClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/per-connection-messages',
    autoConnect: true // Auto-connect immediately
  });

  const { 
    isConnectionReady, 
    mcpConnectionStatus, 
    sendMCPConfig,
    connectionState,
    messages,
    sendText
  } = genuxClient;

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  }, []);

  const handleConfigChange = useCallback((config: MCPConfig) => {
    setMcpConfig(config);
    addLog(`MCP configuration updated: ${Object.keys(config.servers).length} servers`);
  }, [addLog]);

  const connectWithMCP = useCallback(async () => {
    if (!mcpConfig) return;
    
    addLog('Sending MCP configuration to backend...');
    setIsConfigMode(false);
    
    try {
      // Send MCP config via the SDK once WebSocket is connected
      sendMCPConfig(mcpConfig);
      addLog('MCP configuration sent successfully');
    } catch (error) {
      addLog(`Failed to send MCP configuration: ${error}`);
    }
  }, [mcpConfig, addLog, sendMCPConfig]);

  const resetConfiguration = useCallback(() => {
    setIsConfigMode(true);
    addLog('Resetting MCP configuration...');
  }, [addLog]);

  // Handle MCP connection status updates
  useEffect(() => {
    if (mcpConnectionStatus.connected) {
      addLog('MCP configuration successful');
      Object.entries(mcpConnectionStatus.servers).forEach(([name, server]) => {
        addLog(`${name}: ${server.tool_count} tools available (${server.status})`);
      });
    }
  }, [mcpConnectionStatus, addLog]);

  // Handle connection ready
  useEffect(() => {
    if (isConnectionReady) {
      addLog('Connection ready for chat');
    }
  }, [isConnectionReady, addLog]);

  // Log connection state changes
  useEffect(() => {
    addLog(`Connection state: ${connectionState}`);
  }, [connectionState, addLog]);

  useEffect(() => {
    addLog('MCP Connection Demo initialized (unified SDK)');
  }, [addLog]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '28px' }}>
                🔧 MCP Connection Management
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
                Configure and manage Model Context Protocol servers dynamically from the frontend
              </p>
            </div>
            <div style={{
              padding: '8px 16px',
              backgroundColor: mcpConnectionStatus.connected ? '#dcfce7' : isConnectionReady ? '#fef3c7' : '#fecaca',
              color: mcpConnectionStatus.connected ? '#166534' : isConnectionReady ? '#92400e' : '#dc2626',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {mcpConnectionStatus.connected ? '✓ MCP Connected' : 
               isConnectionReady ? '🔗 Connection Ready' : 
               connectionState === 'connected' ? '⏳ Connecting...' : '⚠ Disconnected'}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex',
          gap: '24px',
          height: 'calc(100vh - 200px)', // Responsive height based on viewport
          minHeight: '600px'
        }}>
          {/* Left Column - Configuration */}
          <div style={{ 
            width: '500px', 
            flexShrink: 0,
            overflow: 'auto', // Make scrollable if content overflows
            paddingRight: '8px' // Add padding for scrollbar
          }}>
            {/* MCP Configuration */}
            <div style={{ marginBottom: '24px' }}>
              <MCPServerConfig
                onConfigChange={handleConfigChange}
                disabled={!isConfigMode}
              />
              
              {/* Action Buttons */}
              <div style={{
                marginTop: '16px',
                display: 'flex',
                gap: '12px'
              }}>
                {isConfigMode ? (
                  <button
                    onClick={connectWithMCP}
                    disabled={!mcpConfig}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: mcpConfig ? '#10b981' : '#e2e8f0',
                      color: mcpConfig ? 'white' : '#94a3b8',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: mcpConfig ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🚀 Connect MCP Servers
                  </button>
                ) : (
                  <button
                    onClick={resetConfiguration}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🔄 Reconfigure MCP
                  </button>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                📊 Connection Status
              </h3>
              
              {mcpConnectionStatus.connection_id && (
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '600' }}>
                    Connection ID: {mcpConnectionStatus.connection_id}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(mcpConnectionStatus.servers).map(([serverName, status]) => (
                  <div key={serverName} style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{serverName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {status.tool_count} tools • {status.transport || 'http'} transport
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: status.status === 'connected' ? '#dcfce7' : 
                                        status.status === 'connecting' ? '#fef3c7' : '#fecaca',
                        color: status.status === 'connected' ? '#166534' : 
                               status.status === 'connecting' ? '#92400e' : '#dc2626'
                      }}>
                        {status.status === 'connected' ? '✓ Connected' : 
                         status.status === 'connecting' ? '⏳ Connecting' : '✗ Error'}
                      </div>
                    </div>
                    
                    {/* Show example tools when connected */}
                    {status.status === 'connected' && status.tool_count > 0 && (
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        backgroundColor: '#ffffff',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Example capabilities:</div>
                        {serverName === 'perplexity' && '🔍 Real-time web search, news lookup, current events'}
                        {serverName === 'filesystem' && '📁 File operations, directory listing, content reading'}
                        {serverName === 'database' && '🗄️ SQL queries, data retrieval, schema inspection'}
                        {!['perplexity', 'filesystem', 'database'].includes(serverName) && 
                         `🔧 ${status.tool_count} specialized tools for enhanced AI capabilities`}
                      </div>
                    )}
                    
                    {status.error && (
                      <div style={{
                        fontSize: '11px',
                        color: '#dc2626',
                        backgroundColor: '#fef2f2',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                        marginTop: '8px'
                      }}>
                        <strong>Error:</strong> {status.error}
                      </div>
                    )}
                  </div>
                ))}
                
                {Object.keys(mcpConnectionStatus.servers).length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#94a3b8',
                    fontSize: '14px'
                  }}>
                    No MCP servers configured
                  </div>
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                📝 Activity Log
              </h3>
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                padding: '16px',
                height: '200px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {logs.map((log, index) => (
                  <div key={index} style={{ color: '#e2e8f0', marginBottom: '4px' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          
          {/* Right Column - Chat Interface */}
          <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            height: '100%', // Fill the parent container
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
              {/* Chat Header - Compact */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                flexShrink: 0 // Don't shrink
              }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '16px' }}>
                  💬 Chat with MCP-Enhanced AI
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                  Enhanced by {Object.keys(mcpConnectionStatus.servers).length} MCP servers • {Object.entries(mcpConnectionStatus.servers).reduce((sum, [, server]) => sum + server.tool_count, 0)} tools available
                </p>
              </div>
              
              {/* Quick Actions - Compact */}
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                flexShrink: 0 // Don't shrink
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginRight: '6px', alignSelf: 'center' }}>
                  💡 Quick Tests:
                </div>
                {[
                  { label: "Search News", prompt: "Search for the latest news about artificial intelligence" },
                  { label: "File Ops", prompt: "List the files in the current directory" },
                  { label: "Database", prompt: "Show me the schema of the database" },
                  { label: "List Tools", prompt: "What MCP tools do you have access to?" }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      addLog(`Quick action: ${action.label}`);
                      // In a real implementation, this would send the prompt to the chat
                    }}
                    style={{
                      padding: '3px 6px',
                      fontSize: '10px',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              
              {/* Chat Component - Uses remaining space */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0, // Critical for flex child to shrink
                overflow: 'hidden' // Prevent content from overflowing
              }}>
                {isConnectionReady ? (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden'
                  }}>
                    {/* Messages */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '16px',
                      backgroundColor: '#ffffff'
                    }}>
                      {messages.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '14px',
                          padding: '40px'
                        }}>
                          💬 Ready to chat! Try saying "Hi" to test the connection.
                        </div>
                      ) : (
                        messages.map((message, index) => (
                          <div key={index} style={{
                            marginBottom: '16px',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: message.role === 'user' ? '#8b5cf6' : '#f8fafc',
                            color: message.role === 'user' ? 'white' : '#1e293b',
                            border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                          }}>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                              {message.role === 'user' ? '👤 You' : '🤖 MCP Assistant'}
                            </div>
                            <div>{message.content}</div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Input */}
                    <div style={{
                      padding: '16px',
                      borderTop: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc'
                    }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Type a message..."
                          style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '14px'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim()) {
                                sendText(input.value);
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              sendText(input.value);
                              input.value = '';
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    textAlign: 'center',
                    padding: '40px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Connect MCP Servers</h3>
                    <p style={{ margin: 0, maxWidth: '300px' }}>
                      Configure and connect to MCP servers to start chatting with an enhanced AI assistant.
                    </p>
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '10px 16px', 
                      backgroundColor: connectionState === 'connected' ? '#fef3c7' : '#fecaca',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: connectionState === 'connected' ? '#92400e' : '#dc2626',
                      fontWeight: '500'
                    }}>
                      Status: {connectionState} • {isConnectionReady ? 'Ready' : 'Waiting for connection'}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>

        {/* Implementation Example */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
            🚀 Implementation
          </h3>
          <pre style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#334155',
            border: '1px solid #e2e8f0',
            overflow: 'auto'
          }}>
{`// 1. Frontend MCP Configuration
const mcpConfig = {
  config: {
    model: "gpt-4",
    openai_api_key_env: "OPENAI_API_KEY"
  },
  servers: {
    perplexity: {
      name: "perplexity",
      url: "https://server.smithery.ai/@example/perplexity-search/mcp",
      transport: "http",
      description: "Real-time web search",
      headers: {
        "Authorization": "Bearer {PERPLEXITY_KEY}"
      }
    },
    filesystem: {
      name: "filesystem",
      command: "npx",
      args: ["@modelcontextprotocol/server-filesystem", "/allowed/path"],
      transport: "stdio",
      description: "Local file system access"
    }
  }
};

// 2. Send MCP Configuration via WebSocket
const sendMCPConfig = (websocket, config) => {
  websocket.send(JSON.stringify({
    type: "mcp_config",
    config: config
  }));
};

// 3. Handle MCP Status Responses
const handleWebSocketMessage = (message) => {
  const data = JSON.parse(message);
  
  switch (data.type) {
    case 'mcp_config_success':
      console.log('MCP servers connected:', data.status.servers);
      break;
    case 'mcp_config_error':
      console.error('MCP error:', data.error);
      break;
    case 'mcp_status_response':
      console.log('MCP status:', data.status);
      break;
  }
};

// 4. Integration with GenUX SDK
<GeUI
  websocketURL="/ws/per-connection-messages"
  bubbleEnabled={false}
  disableVoice={true}
  options={{
    agentName: "MCP-Enhanced Assistant",
    // Custom WebSocket message handling would go here
  }}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MCPConnectionDemo;