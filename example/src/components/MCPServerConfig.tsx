import React, { useState, useEffect } from 'react';

export interface MCPServer {
  name: string;
  url: string;
  transport: 'http' | 'stdio' | 'websocket';
  description?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

export interface MCPConfig {
  config: {
    model: string;
    openai_api_key_env: string;
  };
  servers: Record<string, MCPServer>;
}

interface MCPServerConfigProps {
  onConfigChange: (config: MCPConfig) => void;
  initialConfig?: MCPConfig;
  disabled?: boolean;
}

const defaultConfig: MCPConfig = {
  config: {
    model: "gpt-4",
    openai_api_key_env: "OPENAI_API_KEY"
  },
  servers: {
    perplexity: {
      name: "perplexity",
      url: "https://server.smithery.ai/@arjunkmrm/perplexity-search/mcp",
      transport: "http",
      description: "Real-time web search powered by Perplexity AI",
      headers: {
        "Authorization": "Bearer YOUR_PERPLEXITY_API_KEY"
      }
    },
    filesystem: {
      name: "filesystem",
      url: "https://server.smithery.ai/@example/filesystem/mcp",
      transport: "http",
      description: "Local filesystem access for file operations",
      headers: {
        "Authorization": "Bearer YOUR_FILESYSTEM_API_KEY"
      }
    },
    database: {
      name: "database",
      url: "https://server.smithery.ai/@example/database/mcp",
      transport: "http",
      description: "Database queries and schema inspection",
      headers: {
        "Authorization": "Bearer YOUR_DATABASE_API_KEY"
      }
    }
  }
};

const MCPServerConfig: React.FC<MCPServerConfigProps> = ({
  onConfigChange,
  initialConfig,
  disabled = false
}) => {
  const [config, setConfig] = useState<MCPConfig>(initialConfig || defaultConfig);
  const [activeTab, setActiveTab] = useState<'servers' | 'config'>('servers');
  const [editingServer, setEditingServer] = useState<string | null>(null);

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const addServer = () => {
    const serverName = `server_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      servers: {
        ...prev.servers,
        [serverName]: {
          name: serverName,
          url: "https://api.example.com/mcp",
          transport: "http",
          description: "New MCP server"
        }
      }
    }));
    setEditingServer(serverName);
  };

  const updateServer = (oldName: string, server: MCPServer) => {
    setConfig(prev => {
      const newServers = { ...prev.servers };
      if (oldName !== server.name) {
        delete newServers[oldName];
      }
      newServers[server.name] = server;
      return {
        ...prev,
        servers: newServers
      };
    });
  };

  const deleteServer = (serverName: string) => {
    setConfig(prev => {
      const newServers = { ...prev.servers };
      delete newServers[serverName];
      return {
        ...prev,
        servers: newServers
      };
    });
  };

  const updateGlobalConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: disabled ? '#f8fafc' : 'white',
    color: disabled ? '#94a3b8' : '#1e293b'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '18px' }}>
          🔧 MCP Server Configuration
        </h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Configure Model Context Protocol servers for enhanced AI capabilities
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={() => setActiveTab('servers')}
          disabled={disabled}
          style={{
            ...buttonStyle,
            backgroundColor: activeTab === 'servers' ? '#3b82f6' : 'transparent',
            color: activeTab === 'servers' ? 'white' : '#64748b',
            borderRadius: '0',
            flex: 1
          }}
        >
          MCP Servers ({Object.keys(config.servers).length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          disabled={disabled}
          style={{
            ...buttonStyle,
            backgroundColor: activeTab === 'config' ? '#3b82f6' : 'transparent',
            color: activeTab === 'config' ? 'white' : '#64748b',
            borderRadius: '0',
            flex: 1
          }}
        >
          Global Config
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'servers' ? (
          <div>
            {/* Add Server Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={addServer}
                disabled={disabled}
                style={{
                  ...buttonStyle,
                  backgroundColor: disabled ? '#e2e8f0' : '#10b981',
                  color: disabled ? '#94a3b8' : 'white'
                }}
              >
                + Add MCP Server
              </button>
            </div>

            {/* Server List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(config.servers).map(([serverName, server]) => (
                <div key={serverName} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: editingServer === serverName ? '#fefce8' : '#f8fafc'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>
                      {server.name}
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingServer(editingServer === serverName ? null : serverName)}
                        disabled={disabled}
                        style={{
                          ...buttonStyle,
                          backgroundColor: disabled ? '#e2e8f0' : '#3b82f6',
                          color: disabled ? '#94a3b8' : 'white',
                          padding: '6px 12px'
                        }}
                      >
                        {editingServer === serverName ? 'Done' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteServer(serverName)}
                        disabled={disabled}
                        style={{
                          ...buttonStyle,
                          backgroundColor: disabled ? '#e2e8f0' : '#ef4444',
                          color: disabled ? '#94a3b8' : 'white',
                          padding: '6px 12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingServer === serverName ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          Server Name
                        </label>
                        <input
                          type="text"
                          value={server.name}
                          onChange={(e) => updateServer(serverName, { ...server, name: e.target.value })}
                          disabled={disabled}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          URL
                        </label>
                        <input
                          type="text"
                          value={server.url}
                          onChange={(e) => updateServer(serverName, { ...server, url: e.target.value })}
                          disabled={disabled}
                          style={inputStyle}
                          placeholder="https://api.example.com/mcp"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          Transport
                        </label>
                        <select
                          value={server.transport}
                          onChange={(e) => updateServer(serverName, { ...server, transport: e.target.value as any })}
                          disabled={disabled}
                          style={inputStyle}
                        >
                          <option value="http">HTTP</option>
                          <option value="stdio">STDIO</option>
                          <option value="websocket">WebSocket</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          Description
                        </label>
                        <input
                          type="text"
                          value={server.description || ''}
                          onChange={(e) => updateServer(serverName, { ...server, description: e.target.value })}
                          disabled={disabled}
                          style={inputStyle}
                          placeholder="Description of this MCP server"
                        />
                      </div>
                      {server.transport === 'http' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                            Headers (JSON)
                          </label>
                          <textarea
                            value={JSON.stringify(server.headers || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const headers = JSON.parse(e.target.value);
                                updateServer(serverName, { ...server, headers });
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            disabled={disabled}
                            style={{
                              ...inputStyle,
                              height: '80px',
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}
                            placeholder='{\n  "Authorization": "Bearer {API_KEY}"\n}'
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      <div><strong>URL:</strong> {server.url}</div>
                      <div><strong>Transport:</strong> {server.transport}</div>
                      {server.description && <div><strong>Description:</strong> {server.description}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                AI Model
              </label>
              <input
                type="text"
                value={config.config.model}
                onChange={(e) => updateGlobalConfig('model', e.target.value)}
                disabled={disabled}
                style={inputStyle}
                placeholder="gpt-4"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                OpenAI API Key Environment Variable
              </label>
              <input
                type="text"
                value={config.config.openai_api_key_env}
                onChange={(e) => updateGlobalConfig('openai_api_key_env', e.target.value)}
                disabled={disabled}
                style={inputStyle}
                placeholder="OPENAI_API_KEY"
              />
            </div>
          </div>
        )}
      </div>

      {/* JSON Preview */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '16px',
        borderTop: '1px solid #e2e8f0'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>
          Generated Configuration:
        </h4>
        <pre style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#374151',
          border: '1px solid #e2e8f0',
          overflow: 'auto',
          maxHeight: '200px',
          margin: 0
        }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default MCPServerConfig;