import React, { useState, useEffect } from 'react';
import { ConfigurableGeUIClient } from './ConfigurableGeUIClient';
import type { MCPServerConfig } from './ConfigurableGeUIClient';
import './App.css';

const DEFAULT_CONFIGS = {
  c1: {
    client_id: 'demo-c1',
    visualization_library: 'c1' as const,
    llm_config: {
      provider: 'thesys' as const,
      model: 'c1/anthropic/claude-sonnet-4/v-20250709',
      api_key_env: 'THESYS_API_KEY'
    },
    mcp_config: {
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY',
      servers: []
    }
  },
  tailwind: {
    client_id: 'demo-tailwind',
    visualization_library: 'tailwind' as const,
    llm_config: {
      provider: 'openai' as const,
      model: 'gpt-5.1-mini',
      api_key_env: 'OPENAI_API_KEY'
    },
    mcp_config: {
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY',
      servers: []
    }
  },
  shadcn: {
    client_id: 'demo-shadcn',
    visualization_library: 'shadcn' as const,
    llm_config: {
      provider: 'openai' as const,
      model: 'gpt-5.1-mini',
      api_key_env: 'OPENAI_API_KEY'
    },
    mcp_config: {
      model: 'gpt-4o-mini',
      api_key_env: 'OPENAI_API_KEY',
      servers: []
    }
  }
};

function App() {
  const [selectedLibrary, setSelectedLibrary] = useState<'c1' | 'tailwind' | 'shadcn'>('c1');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [enableVoice, setEnableVoice] = useState(true);

  // MCP Configuration
  const [customMcpServers, setCustomMcpServers] = useState<MCPServerConfig[]>([]);
  const [showMcpConfig, setShowMcpConfig] = useState(false);

  // LLM Configuration
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5.1-mini');
  const [apiKey, setApiKey] = useState('');

  // Update model when library changes
  useEffect(() => {
    const newConfig = DEFAULT_CONFIGS[selectedLibrary];
    setSelectedModel(newConfig.llm_config.model);
    setApiKey(''); // Clear API key when switching libraries
  }, [selectedLibrary]);

  const activeConfig = {
    client_id: `demo-${selectedLibrary}`,
    visualization_library: selectedLibrary,
    llm_config: {
      provider: selectedLibrary === 'c1' ? ('thesys' as const) : ('openai' as const),
      model: selectedLibrary === 'c1'
        ? 'c1/anthropic/claude-sonnet-4/v-20250709'
        : selectedModel,
      ...(apiKey && { api_key: apiKey }),  // Only include if provided
      api_key_env: selectedLibrary === 'c1' ? 'THESYS_API_KEY' : 'OPENAI_API_KEY'
    },
    mcp_config: {
      ...DEFAULT_CONFIGS[selectedLibrary].mcp_config,
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

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🔧 Configurable Connection Example</h1>
          <p>Configure visualization library, LLM, and MCP servers</p>
        </div>
      </header>

      <div className="main-content">
        {/* Configuration Panel */}
        <aside className="config-panel">
          <h2>Connection Settings</h2>

          {!isConnected && (
            <>
              {/* Visualization Library Selection */}
              <section className="config-section">
                <label className="section-label">Visualization Library</label>
                <div className="preset-grid preset-grid-3">
                  <button
                    onClick={() => setSelectedLibrary('c1')}
                    className={`preset-card ${selectedLibrary === 'c1' ? 'active' : ''}`}
                  >
                    <div className="preset-icon">🎨</div>
                    <div className="preset-name">TheSys C1</div>
                    <div className="preset-desc">C1 Components</div>
                  </button>
                  <button
                    onClick={() => setSelectedLibrary('tailwind')}
                    className={`preset-card ${selectedLibrary === 'tailwind' ? 'active' : ''}`}
                  >
                    <div className="preset-icon">🌊</div>
                    <div className="preset-name">Tailwind</div>
                    <div className="preset-desc">Utility CSS</div>
                  </button>
                  <button
                    onClick={() => setSelectedLibrary('shadcn')}
                    className={`preset-card ${selectedLibrary === 'shadcn' ? 'active' : ''}`}
                  >
                    <div className="preset-icon">🎭</div>
                    <div className="preset-name">ShadCN</div>
                    <div className="preset-desc">Components</div>
                  </button>
                </div>
              </section>

              {/* LLM Configuration */}
              <section className="config-section">
                <div className="section-header">
                  <label className="section-label">
                    LLM Configuration ({selectedLibrary === 'c1' ? 'TheSys' : 'OpenAI'})
                  </label>
                  <button
                    onClick={() => setShowLLMConfig(!showLLMConfig)}
                    className="toggle-button"
                  >
                    {showLLMConfig ? '▼ Hide' : '▶ Configure'}
                  </button>
                </div>

                {showLLMConfig && (
                  <div className="config-dropdown">
                    {/* Model Selection */}
                    <div className="field">
                      <label>Model:</label>
                      {selectedLibrary === 'c1' ? (
                        <input
                          type="text"
                          value="c1/anthropic/claude-sonnet-4/v-20250915"
                          disabled
                          className="fixed-input"
                        />
                      ) : (
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                        >
                          <option value="gpt-5.1-mini">gpt-5.1-mini</option>
                          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                        </select>
                      )}
                    </div>

                    {/* API Key Input */}
                    <div className="field">
                      <label>API Key (Optional):</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Leave blank to use environment variable"
                      />
                      <div className="field-help">
                        If not provided, will use {selectedLibrary === 'c1' ? 'THESYS_API_KEY' : 'OPENAI_API_KEY'} from environment
                      </div>
                    </div>

                    {/* Provider Info */}
                    <div className="info-box">
                      <h5>Provider Info:</h5>
                      <p>
                        {selectedLibrary === 'c1' && 'Using TheSys API for C1 Component generation'}
                        {(selectedLibrary === 'tailwind' || selectedLibrary === 'shadcn') &&
                          'Using OpenAI API for HTML generation with ' + selectedLibrary + ' styling'}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* MCP Server Configuration */}
              <section className="config-section">
                <div className="section-header">
                  <label className="section-label">
                    MCP Servers ({customMcpServers.length} configured)
                  </label>
                  <button
                    onClick={() => setShowMcpConfig(!showMcpConfig)}
                    className="toggle-button"
                  >
                    {showMcpConfig ? '▼ Hide' : '▶ Configure'}
                  </button>
                </div>

                {showMcpConfig && (
                  <div className="config-dropdown">
                    <div className="preset-buttons">
                      <div className="preset-label">Quick Add Presets:</div>
                      <div className="button-group">
                        <button onClick={() => addPresetServer('perplexity')} className="preset-btn">
                          + Perplexity
                        </button>
                        <button onClick={() => addPresetServer('weather')} className="preset-btn">
                          + Weather
                        </button>
                        <button onClick={() => addPresetServer('filesystem')} className="preset-btn">
                          + Filesystem
                        </button>
                        <button onClick={addMcpServer} className="preset-btn primary">
                          + Custom
                        </button>
                      </div>
                    </div>

                    {customMcpServers.map((server, index) => (
                      <div key={index} className="server-card">
                        <div className="server-header">
                          <span>Server {index + 1}</span>
                          <button onClick={() => removeMcpServer(index)} className="remove-btn">
                            Remove
                          </button>
                        </div>

                        <div className="server-fields">
                          <div className="field">
                            <label>Name:</label>
                            <input
                              type="text"
                              value={server.name}
                              onChange={(e) => updateMcpServer(index, 'name', e.target.value)}
                              placeholder="server-name"
                            />
                          </div>
                          <div className="field">
                            <label>URL:</label>
                            <input
                              type="text"
                              value={server.url}
                              onChange={(e) => updateMcpServer(index, 'url', e.target.value)}
                              placeholder="http://localhost:3001"
                            />
                          </div>
                        </div>

                        <div className="field">
                          <label>Headers (JSON):</label>
                          <textarea
                            value={JSON.stringify(server.headers || {}, null, 2)}
                            onChange={(e) => updateMcpServer(index, 'headers', e.target.value)}
                            placeholder='{"Authorization": "Bearer key"}'
                          />
                        </div>
                      </div>
                    ))}

                    {customMcpServers.length === 0 && (
                      <div className="empty-state">
                        No MCP servers configured. Use the buttons above to add some.
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Feature Toggles */}
              <section className="config-section">
                <label className="section-label">Features</label>
                <label className="toggle-item">
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => setEnableVoice(e.target.checked)}
                  />
                  <div className="toggle-content">
                    <div className="toggle-title">Enable Voice (WebRTC)</div>
                    <div className="toggle-desc">Allow voice input and audio responses</div>
                  </div>
                </label>
              </section>

              {/* Configuration Preview */}
              <section className="config-section">
                <div className="code-label">Configuration Preview:</div>
                <pre className="code-block">
                  {JSON.stringify(activeConfig, null, 2)}
                </pre>
              </section>

              {/* Connection State */}
              {connectionState && (
                <div className="info-banner">
                  Connection State: <strong>{connectionState}</strong>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="info-banner error">
                  {error}
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={() => {
                  setError('');
                  setIsConnected(true);
                }}
                className="connect-button enabled"
              >
                🔌 Connect with Configuration
              </button>
            </>
          )}

          {isConnected && (
            <div>
              <div className="connection-info">
                <h3>Connected: {activeConfig.client_id}</h3>
                <p>Library: {selectedLibrary}</p>
                <p>Provider: {activeConfig.llm_config.provider}</p>
                <p>Model: {activeConfig.llm_config.model}</p>
                <p>MCP Servers: {customMcpServers.length}</p>
              </div>
              <button
                onClick={() => {
                  setIsConnected(false);
                  setConnectionState('');
                }}
                className="disconnect-button"
              >
                🔌 Disconnect
              </button>
            </div>
          )}
        </aside>

        {/* Chat Interface */}
        <main className="chat-container">
          {!isConnected ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">🎯</div>
                <h2>Configure Your Connection</h2>
                <p>
                  Select a visualization library (C1, Tailwind, or ShadCN), configure the LLM and MCP servers,
                  then click Connect to start chatting.
                </p>
                <div className="feature-cards">
                  <div className="feature-card">
                    <div>🎨</div>
                    <div>
                      <strong>Visualization</strong>
                      <p>C1, Tailwind, ShadCN</p>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div>🤖</div>
                    <div>
                      <strong>LLM Models</strong>
                      <p>TheSys, OpenAI</p>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div>🔧</div>
                    <div>
                      <strong>MCP Servers</strong>
                      <p>Custom tools & APIs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="connected-view">
              <ConfigurableGeUIClient
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
                  agentName: `${selectedLibrary.toUpperCase()} Assistant`,
                  welcomeMessage: `Connected with ${selectedLibrary} library using ${activeConfig.llm_config.provider} (${activeConfig.llm_config.model}). You have ${activeConfig.mcp_config.servers.length} MCP server(s) configured.`,
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
