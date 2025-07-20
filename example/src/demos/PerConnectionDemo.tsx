import React, { useState } from 'react';
import { ConfigurableGenuxClient } from '../ConfigurableGenuxClient';

interface MCPServerConfig {
  name: string;
  url: string;
  transport: 'http';
  headers?: Record<string, string>;
}

const DEFAULT_CONFIGS = {
  perplexity: {
    client_id: 'demo-perplexity',
    mcp_config: {
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY',
      servers: [] // Empty for now - user can configure real MCP servers
    },
    visualization_provider: {
      provider_type: 'thesys' as const,
      model: 'c1-nightly',
      api_key_env: 'THESYS_API_KEY'
    }
  },
  weather: {
    client_id: 'demo-weather',
    mcp_config: {
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY',
      servers: [] // Empty for now - user can configure real MCP servers
    },
    visualization_provider: {
      provider_type: 'openai' as const,
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY'
    }
  }
};

export default function PerConnectionDemo() {
  const [selectedConfig, setSelectedConfig] = useState<'perplexity' | 'weather'>('perplexity');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [enableVoice, setEnableVoice] = useState(true);
  const [customMcpServers, setCustomMcpServers] = useState<MCPServerConfig[]>([]);
  const [showMcpConfig, setShowMcpConfig] = useState(false);

  const handleConnect = () => {
    setError('');
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionState('');
  };

  const activeConfig = {
    ...DEFAULT_CONFIGS[selectedConfig],
    mcp_config: {
      ...DEFAULT_CONFIGS[selectedConfig].mcp_config,
      servers: customMcpServers
    }
  };

  const addMcpServer = () => {
    setCustomMcpServers([
      ...customMcpServers,
      { name: '', url: '', transport: 'http', headers: {} }
    ]);
  };

  const updateMcpServer = (index: number, field: keyof MCPServerConfig, value: string) => {
    const updated = [...customMcpServers];
    if (field === 'headers') {
      try {
        updated[index][field] = JSON.parse(value) || {};
      } catch {
        // Invalid JSON, keep existing headers
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setCustomMcpServers(updated);
  };

  const removeMcpServer = (index: number) => {
    setCustomMcpServers(customMcpServers.filter((_, i) => i !== index));
  };

  const addPresetServer = (type: 'perplexity' | 'weather' | 'filesystem') => {
    const presets = {
      perplexity: {
        name: 'perplexity-search',
        url: 'http://localhost:3001',
        transport: 'http' as const,
        headers: { 'Authorization': 'Bearer your-perplexity-api-key' }
      },
      weather: {
        name: 'weather-api',
        url: 'http://localhost:3002',
        transport: 'http' as const,
        headers: { 'X-API-Key': 'your-weather-api-key' }
      },
      filesystem: {
        name: 'filesystem-tools',
        url: 'http://localhost:3003',
        transport: 'http' as const,
        headers: {}
      }
    };
    setCustomMcpServers([...customMcpServers, presets[type]]);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#667eea',
    color: 'white'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151'
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Per-Connection Configuration Demo
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Demonstrates the per-connection WebSocket endpoint (/ws/per-connection-messages) with custom MCP configurations
          </p>

          {!isConnected ? (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Configuration Options
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Configuration Preset:
                </label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="perplexity"
                      checked={selectedConfig === 'perplexity'}
                      onChange={(e) => setSelectedConfig(e.target.value as 'perplexity')}
                      style={{ marginRight: '8px' }}
                    />
                    Perplexity Search (with Thesys visualization)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="weather"
                      checked={selectedConfig === 'weather'}
                      onChange={(e) => setSelectedConfig(e.target.value as 'weather')}
                      style={{ marginRight: '8px' }}
                    />
                    Weather Tools (with OpenAI text)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => setEnableVoice(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Enable Voice (WebRTC)
                </label>
              </div>

              {/* MCP Server Configuration */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontWeight: '500' }}>
                    MCP Servers ({customMcpServers.length} configured)
                  </label>
                  <button
                    onClick={() => setShowMcpConfig(!showMcpConfig)}
                    style={{
                      ...secondaryButtonStyle,
                      fontSize: '12px',
                      padding: '6px 12px'
                    }}
                  >
                    {showMcpConfig ? 'Hide Config' : 'Configure MCP'}
                  </button>
                </div>

                {showMcpConfig && (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Quick Add Presets:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => addPresetServer('perplexity')}
                          style={{
                            ...secondaryButtonStyle,
                            fontSize: '12px',
                            padding: '4px 8px'
                          }}
                        >
                          + Perplexity Search
                        </button>
                        <button
                          onClick={() => addPresetServer('weather')}
                          style={{
                            ...secondaryButtonStyle,
                            fontSize: '12px',
                            padding: '4px 8px'
                          }}
                        >
                          + Weather API
                        </button>
                        <button
                          onClick={() => addPresetServer('filesystem')}
                          style={{
                            ...secondaryButtonStyle,
                            fontSize: '12px',
                            padding: '4px 8px'
                          }}
                        >
                          + Filesystem Tools
                        </button>
                        <button
                          onClick={addMcpServer}
                          style={{
                            ...primaryButtonStyle,
                            fontSize: '12px',
                            padding: '4px 8px'
                          }}
                        >
                          + Custom Server
                        </button>
                      </div>
                    </div>

                    {customMcpServers.map((server, index) => (
                      <div key={index} style={{
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>Server {index + 1}</span>
                          <button
                            onClick={() => removeMcpServer(index)}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>Name:</label>
                            <input
                              type="text"
                              value={server.name}
                              onChange={(e) => updateMcpServer(index, 'name', e.target.value)}
                              placeholder="server-name"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>URL:</label>
                            <input
                              type="text"
                              value={server.url}
                              onChange={(e) => updateMcpServer(index, 'url', e.target.value)}
                              placeholder="http://localhost:3001"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280' }}>Headers (JSON):</label>
                          <textarea
                            value={JSON.stringify(server.headers || {}, null, 2)}
                            onChange={(e) => updateMcpServer(index, 'headers', e.target.value)}
                            placeholder='{"Authorization": "Bearer your-api-key"}'
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px',
                              minHeight: '60px',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {customMcpServers.length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '14px',
                        padding: '20px'
                      }}>
                        No MCP servers configured. Use the buttons above to add some.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ 
                backgroundColor: '#f9fafb', 
                padding: '16px', 
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Configuration Preview:
                </h4>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  backgroundColor: '#e5e7eb',
                  padding: '12px',
                  borderRadius: '4px'
                }}>
                  {JSON.stringify(activeConfig, null, 2)}
                </pre>
              </div>

              {connectionState && (
                <div style={{
                  backgroundColor: '#dbeafe',
                  border: '1px solid #60a5fa',
                  color: '#1e40af',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  Connection State: <strong>{connectionState}</strong>
                </div>
              )}

              {error && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #f87171',
                  color: '#991b1b',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button 
                onClick={handleConnect} 
                style={primaryButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a67d8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
              >
                Connect with Configuration
              </button>
            </div>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                  Chat Interface - {activeConfig.client_id}
                </h3>
                <button 
                  onClick={handleDisconnect} 
                  style={secondaryButtonStyle}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Disconnect
                </button>
              </div>

              <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <ConfigurableGenuxClient
                  clientId={activeConfig.client_id}
                  connectionConfig={activeConfig}
                  onConnectionStateChange={setConnectionState}
                  onError={(error) => {
                    console.error('Connection error:', error);
                    setError(error.message || 'Connection error occurred');
                  }}
                  bubbleEnabled={false}
                  disableVoice={!enableVoice}
                  allowFullScreen={true}
                  options={{
                    agentName: `${activeConfig.client_id} Assistant`,
                    welcomeMessage: `Connected with ${activeConfig.visualization_provider.provider_type} provider and ${activeConfig.mcp_config.servers.length} MCP server(s)`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            How it Works
          </h2>
          
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Connection Flow:
            </h4>
            <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Client connects to <code>/ws/per-connection-messages</code></li>
              <li>Server sends <code>connection_established</code> with connection_id</li>
              <li>Client sends <code>connection_config</code> message with MCP servers and visualization settings</li>
              <li>Server validates configuration and initializes dedicated resources</li>
              <li>Server sends state updates during initialization</li>
              <li>Connection is ready for chat/voice interaction</li>
            </ol>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Key Features:
            </h4>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Each connection gets its own MCP client and visualization provider</li>
              <li>Supports different tools and models per connection</li>
              <li>Complete resource isolation between connections</li>
              <li>SSRF protection for MCP server URLs</li>
              <li>Real-time state tracking and metrics</li>
              <li>Both text chat and voice (WebRTC) support</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Use Cases:
            </h4>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Multi-tenant SaaS applications</li>
              <li>Different AI tools per customer</li>
              <li>A/B testing different models</li>
              <li>Enterprise isolation requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}