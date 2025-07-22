import React, { useState } from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';

/**
 * MCP Configuration Demo using standard Genux component
 * 
 * This demo shows how to configure MCP servers and use the standard
 * Genux component with per-connection WebSocket configuration.
 */

interface MCPServerConfig {
  name: string;
  url: string;
  transport: string;
  description?: string;
}


export default function MCPGenuxDemo() {
  const [currentConfig, setCurrentConfig] = useState({
    clientId: 'demo-client',
    mcpServers: [] as MCPServerConfig[],
    vizProvider: 'thesys',
    llmModel: 'gpt-4o-mini'
  });
  
  const [websocketUrl] = useState('ws://localhost:8000/ws/messages');
  const [connectionKey, setConnectionKey] = useState(0); // Force Genux remount
  const [isConnected, setIsConnected] = useState(false);
  
  // Example MCP servers
  const AVAILABLE_SERVERS = {
    perplexity: {
      name: 'perplexity_search',
      url: 'https://server.smithery.ai/@arjunkmrm/perplexity-search/mcp',
      transport: 'http',
      description: 'Real-time web search via Perplexity'
    },
    weather: {
      name: 'weather_api',
      url: 'https://server.smithery.ai/@example/weather/mcp',
      transport: 'http',
      description: 'Weather information service'
    },
    filesystem: {
      name: 'filesystem',
      url: 'stdio://filesystem',
      transport: 'stdio',
      description: 'Local file system access'
    }
  };

  const handleServerToggle = (serverKey: string) => {
    setCurrentConfig(prev => {
      const server = AVAILABLE_SERVERS[serverKey];
      const hasServer = prev.mcpServers.some(s => s.name === server.name);
      
      return {
        ...prev,
        mcpServers: hasServer
          ? prev.mcpServers.filter(s => s.name !== server.name)
          : [...prev.mcpServers, server]
      };
    });
  };


  const applyConfiguration = () => {
    // Force Genux to reconnect with new configuration
    setConnectionKey(prev => prev + 1);
    setIsConnected(false);
    
    // Simulate connection success for demo purposes
    setTimeout(() => {
      setIsConnected(true);
    }, 1000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', backgroundColor: '#f8fafc' }}>
      {/* Left Panel - Configuration */}
      <div style={{
        width: '350px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2 style={{ margin: '0 0 24px 0', color: '#1f2937' }}>
          🔧 MCP Configuration
        </h2>

        {/* Client Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Client Settings
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              Client ID
            </label>
            <input
              type="text"
              value={currentConfig.clientId}
              onChange={(e) => setCurrentConfig(prev => ({ ...prev, clientId: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* LLM Model Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            LLM Model
          </h3>
          <select
            value={currentConfig.llmModel}
            onChange={(e) => setCurrentConfig(prev => ({ ...prev, llmModel: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="gpt-4o-mini">GPT-4O Mini</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>
        </div>

        {/* Visualization Provider */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Visualization Provider
          </h3>
          <select
            value={currentConfig.vizProvider}
            onChange={(e) => setCurrentConfig(prev => ({ ...prev, vizProvider: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="thesys">Thesys (C1 Components)</option>
            <option value="google">Google (Gemini)</option>
            <option value="tomorrow">Tomorrow AI</option>
            <option value="openai">OpenAI (Fallback)</option>
          </select>
        </div>

        {/* MCP Servers */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            MCP Servers
          </h3>
          
          {Object.entries(AVAILABLE_SERVERS).map(([key, server]) => {
            const isSelected = currentConfig.mcpServers.some(s => s.name === server.name);
            return (
              <div
                key={key}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                  border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleServerToggle(key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {server.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {server.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply Button */}
        <button
          onClick={applyConfiguration}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Apply Configuration
        </button>

        {/* Current Config Display */}
        <div style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0891b2',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
            Active Configuration
          </h4>
          <div style={{ color: '#0c4a6e' }}>
            <div>Model: {currentConfig.llmModel}</div>
            <div>Viz Provider: {currentConfig.vizProvider}</div>
            <div>MCP Servers: {currentConfig.mcpServers.length}</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>
            💬 MCP Chat Interface
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Using standard Genux component with {currentConfig.mcpServers.length} MCP servers
          </p>
        </div>

        {/* Genux Chat */}
        <div style={{ flex: 1, position: 'relative' }}>
          <GeUI
            key={connectionKey} // Force remount on config change
            webrtcURL="/api/offer"
            websocketURL={websocketUrl}
            bubbleEnabled={false}
            disableVoice={true}
            options={{
              agentName: "MCP Assistant",
              agentSubtitle: `Enhanced with ${currentConfig.mcpServers.map(s => s.name).join(', ') || 'no MCP servers'}`,
              theme: {
                colors: {
                  primary: "#3b82f6",
                  secondary: "#1e40af",
                  background: "#ffffff",
                  surface: "#f9fafb",
                  text: "#1e293b",
                  textSecondary: "#64748b",
                  border: "#e5e7eb"
                }
              }
            }}
          />
          
          {/* Connection Status Overlay */}
          {!isConnected && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                textAlign: 'center',
                padding: '20px'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Configuring Connection...
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Setting up MCP servers and visualization provider
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}