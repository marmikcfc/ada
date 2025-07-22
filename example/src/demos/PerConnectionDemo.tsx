import React, { useState, useEffect } from 'react';
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
    },
    preferences: {
      ui_framework: 'c1' as const, // TheSys uses C1 components, not HTML frameworks
      theme: 'default'
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
    },
    preferences: {
      ui_framework: 'tailwind' as const,
      theme: 'default'
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
  const [showVizConfig, setShowVizConfig] = useState(false);
  const [customVizProvider, setCustomVizProvider] = useState({
    provider_type: 'thesys' as const,
    model: 'c1-nightly',
    api_key_env: 'THESYS_API_KEY'
  });
  const [uiFramework, setUiFramework] = useState<'tailwind' | 'shadcn'>('tailwind');
  const [showFrameworkConfig, setShowFrameworkConfig] = useState(false);

  // Update framework when config changes
  useEffect(() => {
    const newProvider = DEFAULT_CONFIGS[selectedConfig].visualization_provider;
    setCustomVizProvider(newProvider);
    
    // For TheSys provider, framework selection is disabled (uses C1 components)
    // For other providers, default to tailwind
    if (newProvider.provider_type !== 'thesys') {
      setUiFramework(DEFAULT_CONFIGS[selectedConfig].preferences.ui_framework as 'tailwind' | 'shadcn');
    }
  }, [selectedConfig]);

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
    },
    visualization_provider: customVizProvider,
    preferences: {
      ...DEFAULT_CONFIGS[selectedConfig].preferences,
      ui_framework: uiFramework
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

              {/* Visualization Provider Configuration */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontWeight: '500' }}>
                    Visualization Provider ({customVizProvider.provider_type})
                  </label>
                  <button
                    onClick={() => setShowVizConfig(!showVizConfig)}
                    style={{
                      ...secondaryButtonStyle,
                      fontSize: '12px',
                      padding: '6px 12px'
                    }}
                  >
                    {showVizConfig ? 'Hide Config' : 'Configure Provider'}
                  </button>
                </div>

                {showVizConfig && (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Provider Type:
                      </label>
                      <select
                        value={customVizProvider.provider_type}
                        onChange={(e) => {
                          const providerType = e.target.value as any;
                          let apiKeyEnv = 'THESYS_API_KEY';
                          let model = 'c1-nightly';
                          
                          // Set appropriate defaults based on provider type
                          if (providerType === 'openai') {
                            apiKeyEnv = 'OPENAI_API_KEY';
                            model = 'gpt-4o-mini';
                          } else if (providerType === 'anthropic') {
                            apiKeyEnv = 'ANTHROPIC_API_KEY';
                            model = 'claude-3-haiku-20240307';
                          } else if (providerType === 'google') {
                            apiKeyEnv = 'GOOGLE_API_KEY';
                            model = 'gemini-pro';
                          } else if (providerType === 'tomorrow') {
                            apiKeyEnv = 'TOMORROW_API_KEY';
                            model = 'tomorrow-v1';
                          }
                          
                          setCustomVizProvider({
                            ...customVizProvider,
                            provider_type: providerType,
                            api_key_env: apiKeyEnv,
                            model: model
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="thesys">TheSys (C1 Components)</option>
                        <option value="openai">OpenAI (Text)</option>
                        <option value="anthropic">Anthropic (Text)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Model:
                      </label>
                      <input
                        type="text"
                        value={customVizProvider.model}
                        onChange={(e) => setCustomVizProvider({
                          ...customVizProvider,
                          model: e.target.value
                        })}
                        placeholder="e.g., c1-nightly, gpt-4o-mini"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        API Key Environment Variable:
                      </label>
                      <input
                        type="text"
                        value={customVizProvider.api_key_env}
                        onChange={(e) => setCustomVizProvider({
                          ...customVizProvider,
                          api_key_env: e.target.value
                        })}
                        placeholder="e.g., THESYS_API_KEY, OPENAI_API_KEY"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setCustomVizProvider({
                          provider_type: 'thesys',
                          model: 'c1-nightly',
                          api_key_env: 'THESYS_API_KEY'
                        })}
                        style={{
                          ...secondaryButtonStyle,
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        TheSys Preset
                      </button>
                      <button
                        onClick={() => setCustomVizProvider({
                          provider_type: 'openai',
                          model: 'gpt-4o-mini',
                          api_key_env: 'OPENAI_API_KEY'
                        })}
                        style={{
                          ...secondaryButtonStyle,
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        OpenAI Preset
                      </button>
                      <button
                        onClick={() => setCustomVizProvider({
                          provider_type: 'anthropic',
                          model: 'claude-3-5-sonnet-20241022',
                          api_key_env: 'ANTHROPIC_API_KEY'
                        })}
                        style={{
                          ...secondaryButtonStyle,
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        Anthropic Preset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* UI Framework Configuration - Only for non-TheSys providers */}
              {customVizProvider.provider_type !== 'thesys' && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ fontWeight: '500' }}>
                      UI Framework ({uiFramework})
                    </label>
                    <button
                      onClick={() => setShowFrameworkConfig(!showFrameworkConfig)}
                      style={{
                        ...secondaryButtonStyle,
                        fontSize: '12px',
                        padding: '6px 12px'
                      }}
                    >
                      {showFrameworkConfig ? 'Hide Framework' : 'Configure Framework'}
                    </button>
                  </div>

                {showFrameworkConfig && (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Framework Type:
                      </label>
                      <select
                        value={uiFramework}
                        onChange={(e) => {
                          const framework = e.target.value as 'tailwind' | 'shadcn';
                          setUiFramework(framework);
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="tailwind">Tailwind CSS (Utility Classes)</option>
                        <option value="shadcn">ShadCN (Component Library)</option>
                      </select>
                    </div>

                    <div style={{
                      backgroundColor: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '4px',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                        Framework Info:
                      </h5>
                      <p style={{ fontSize: '11px', margin: 0, color: '#6b7280', lineHeight: '1.4' }}>
                        {uiFramework === 'tailwind' && 'Modern utility-first CSS framework. Generates responsive, maintainable components.'}
                        {uiFramework === 'shadcn' && 'Tailwind-based component system with beautiful defaults. Professional UI patterns.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setUiFramework('tailwind')}
                        style={{
                          ...secondaryButtonStyle,
                          fontSize: '12px',
                          padding: '6px 10px',
                          backgroundColor: uiFramework === 'tailwind' ? '#dbeafe' : '#f9fafb',
                          color: uiFramework === 'tailwind' ? '#1e40af' : '#374151'
                        }}
                      >
                        Tailwind
                      </button>
                      <button
                        onClick={() => setUiFramework('shadcn')}
                        style={{
                          ...secondaryButtonStyle,
                          fontSize: '12px',
                          padding: '6px 10px',
                          backgroundColor: uiFramework === 'shadcn' ? '#ecfdf5' : '#f9fafb',
                          color: uiFramework === 'shadcn' ? '#065f46' : '#374151'
                        }}
                      >
                        ShadCN
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* TheSys Provider Notice */}
              {customVizProvider.provider_type === 'thesys' && (
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>🎨 TheSys Provider</span>
                  </div>
                  <p style={{ fontSize: '12px', margin: 0, color: '#0369a1' }}>
                    TheSys uses C1 Components for rich interactive content. UI framework selection is not available.
                  </p>
                </div>
              )}

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
                    welcomeMessage: `Connected with ${activeConfig.visualization_provider.provider_type} provider and ${activeConfig.mcp_config.servers.length} MCP server(s).${activeConfig.visualization_provider.provider_type !== 'thesys' ? ` UI Framework: ${uiFramework}` : ' Using C1 Components.'}`,
                    uiFramework: activeConfig.visualization_provider.provider_type !== 'thesys' ? uiFramework : undefined
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

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Use Cases:
            </h4>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Multi-tenant SaaS applications</li>
              <li>Different AI tools per customer</li>
              <li>A/B testing different models</li>
              <li>Enterprise isolation requirements</li>
              <li>Framework-specific UI generation</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              {customVizProvider.provider_type === 'thesys' ? 'Try These C1 Component Prompts:' : `Try These ${uiFramework} Prompts:`}
            </h4>
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              padding: '12px'
            }}>
              {customVizProvider.provider_type === 'thesys' && (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                    🎨 Try these C1 Component prompts:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>"Create an interactive data visualization with charts and filters"</li>
                    <li>"Build a dynamic form with conditional fields and validation"</li>
                    <li>"Design a rich content editor with formatting tools"</li>
                    <li>"Make an interactive dashboard with real-time data updates"</li>
                  </ul>
                </div>
              )}
              {customVizProvider.provider_type !== 'thesys' && uiFramework === 'tailwind' && (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                    📱 Try these Tailwind prompts:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>"Create a dashboard card with user stats and progress bars"</li>
                    <li>"Build a responsive pricing table with feature comparisons"</li>
                    <li>"Design a contact form with validation styling"</li>
                    <li>"Make a notification panel with different alert types"</li>
                  </ul>
                </div>
              )}
              {customVizProvider.provider_type !== 'thesys' && uiFramework === 'shadcn' && (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                    🎨 Try these ShadCN prompts:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>"Create a modern data table with sorting and filtering"</li>
                    <li>"Build a user profile card with avatar and action buttons"</li>
                    <li>"Design a settings panel with form controls"</li>
                    <li>"Make a command palette search interface"</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}