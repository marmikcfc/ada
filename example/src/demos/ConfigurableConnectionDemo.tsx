import React, { useState } from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';

/**
 * Configurable Connection Demo
 *
 * This demo showcases how to configure WebSocket and WebRTC connections
 * with different URLs, authentication options, and connection settings.
 *
 * Use Cases:
 * - Development vs Production environments
 * - Custom backend endpoints
 * - Different authentication methods
 * - Connection state monitoring
 */

interface ConnectionPreset {
  id: string;
  name: string;
  description: string;
  websocketURL: string;
  webrtcURL: string;
  icon: string;
}

const CONNECTION_PRESETS: ConnectionPreset[] = [
  {
    id: 'local',
    name: 'Local Development',
    description: 'Connect to local backend (localhost:8000)',
    websocketURL: 'ws://localhost:8000/ws/per-connection-messages',
    webrtcURL: 'http://localhost:8000/api/offer',
    icon: '🖥️'
  },
  {
    id: 'staging',
    name: 'Staging Environment',
    description: 'Connect to staging server for testing',
    websocketURL: 'wss://staging-api.example.com/ws/per-connection-messages',
    webrtcURL: 'https://staging-api.example.com/api/offer',
    icon: '🧪'
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Connect to production backend',
    websocketURL: 'wss://api.example.com/ws/per-connection-messages',
    webrtcURL: 'https://api.example.com/api/offer',
    icon: '🚀'
  },
  {
    id: 'custom',
    name: 'Custom Configuration',
    description: 'Configure your own endpoints',
    websocketURL: '',
    webrtcURL: '',
    icon: '⚙️'
  }
];

const ConfigurableConnectionDemo: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('local');
  const [customWebSocketURL, setCustomWebSocketURL] = useState('');
  const [customWebRTCURL, setCustomWebRTCURL] = useState('');
  const [enableVoice, setEnableVoice] = useState(true);
  const [bubbleMode, setBubbleMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Advanced options
  const [reconnectAttempts, setReconnectAttempts] = useState(3);
  const [reconnectDelay, setReconnectDelay] = useState(1000);
  const [connectionTimeout, setConnectionTimeout] = useState(30000);

  // Get active connection config
  const getActiveConfig = () => {
    if (selectedPreset === 'custom') {
      return {
        websocketURL: customWebSocketURL,
        webrtcURL: customWebRTCURL
      };
    }

    const preset = CONNECTION_PRESETS.find(p => p.id === selectedPreset);
    return {
      websocketURL: preset?.websocketURL || '',
      webrtcURL: preset?.webrtcURL || ''
    };
  };

  const activeConfig = getActiveConfig();
  const canConnect = activeConfig.websocketURL && activeConfig.webrtcURL;

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
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
    <div style={{
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={cardStyle}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
            Configurable Connection Demo
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '0' }}>
            Configure WebSocket and WebRTC endpoints for different environments and use cases
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isConnected ? '400px 1fr' : '1fr', gap: '20px' }}>
          {/* Configuration Panel */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Connection Settings
            </h3>

            {/* Preset Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Environment Preset
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {CONNECTION_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedPreset === preset.id ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPreset === preset.id ? '#f0f4ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{preset.icon}</div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {preset.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom URLs (shown when custom preset selected) */}
            {selectedPreset === 'custom' && (
              <div style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    WebSocket URL
                  </label>
                  <input
                    type="text"
                    value={customWebSocketURL}
                    onChange={(e) => setCustomWebSocketURL(e.target.value)}
                    placeholder="ws://localhost:8000/ws/per-connection-messages"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    WebRTC URL
                  </label>
                  <input
                    type="text"
                    value={customWebRTCURL}
                    onChange={(e) => setCustomWebRTCURL(e.target.value)}
                    placeholder="http://localhost:8000/api/offer"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Current Configuration Display */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#0369a1',
                marginBottom: '12px'
              }}>
                Active Configuration
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', marginBottom: '8px' }}>
                <strong>WebSocket:</strong>
                <div style={{
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                  color: activeConfig.websocketURL ? '#0369a1' : '#9ca3af'
                }}>
                  {activeConfig.websocketURL || 'Not configured'}
                </div>
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <strong>WebRTC:</strong>
                <div style={{
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                  color: activeConfig.webrtcURL ? '#0369a1' : '#9ca3af'
                }}>
                  {activeConfig.webrtcURL || 'Not configured'}
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Features
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => setEnableVoice(e.target.checked)}
                    style={{ marginRight: '12px', width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Enable Voice (WebRTC)</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Allow voice input and audio responses
                    </div>
                  </div>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <input
                    type="checkbox"
                    checked={bubbleMode}
                    onChange={(e) => setBubbleMode(e.target.checked)}
                    style={{ marginRight: '12px', width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Bubble Widget Mode</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Show floating bubble widget
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Advanced Options */}
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  ...secondaryButtonStyle,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Advanced Options</span>
                <span>{showAdvanced ? '▼' : '▶'}</span>
              </button>

              {showAdvanced && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      Reconnect Attempts: {reconnectAttempts}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={reconnectAttempts}
                      onChange={(e) => setReconnectAttempts(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      Reconnect Delay: {reconnectDelay}ms
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="500"
                      value={reconnectDelay}
                      onChange={(e) => setReconnectDelay(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      Connection Timeout: {connectionTimeout / 1000}s
                    </label>
                    <input
                      type="range"
                      min="5000"
                      max="60000"
                      step="5000"
                      value={connectionTimeout}
                      onChange={(e) => setConnectionTimeout(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Connect/Disconnect Button */}
            {!isConnected ? (
              <button
                onClick={() => canConnect && setIsConnected(true)}
                disabled={!canConnect}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  opacity: canConnect ? 1 : 0.5,
                  cursor: canConnect ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => canConnect && (e.currentTarget.style.backgroundColor = '#5a67d8')}
                onMouseLeave={(e) => canConnect && (e.currentTarget.style.backgroundColor = '#667eea')}
              >
                {canConnect ? '🔌 Connect' : '⚠️ Configure URLs First'}
              </button>
            ) : (
              <button
                onClick={() => setIsConnected(false)}
                style={{
                  ...secondaryButtonStyle,
                  width: '100%'
                }}
              >
                🔌 Disconnect
              </button>
            )}

            {/* Implementation Code */}
            <div style={{ marginTop: '24px' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Implementation Code
              </div>
              <pre style={{
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
{`import GeUI from '@your-org/geui-sdk';

<GeUI
  websocketURL="${activeConfig.websocketURL || 'YOUR_WEBSOCKET_URL'}"
  webrtcURL="${activeConfig.webrtcURL || 'YOUR_WEBRTC_URL'}"
  bubbleEnabled={${bubbleMode}}
  disableVoice={${!enableVoice}}
  options={{
    agentName: "AI Assistant",
    // Advanced connection options
    reconnectAttempts: ${reconnectAttempts},
    reconnectDelay: ${reconnectDelay},
    connectionTimeout: ${connectionTimeout}
  }}
/>`}
              </pre>
            </div>
          </div>

          {/* Chat Interface (when connected) */}
          {isConnected && (
            <div style={cardStyle}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>
                    Connected to {CONNECTION_PRESETS.find(p => p.id === selectedPreset)?.name || 'Custom'}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {enableVoice ? '🎙️ Voice enabled' : '💬 Text only'} • {bubbleMode ? 'Bubble mode' : 'Full screen'}
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  Connected
                </div>
              </div>

              <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <GeUI
                  websocketURL={activeConfig.websocketURL}
                  webrtcURL={activeConfig.webrtcURL}
                  bubbleEnabled={bubbleMode}
                  disableVoice={!enableVoice}
                  allowFullScreen={true}
                  options={{
                    agentName: "Connection Demo Assistant",
                    welcomeMessage: `Connected to ${CONNECTION_PRESETS.find(p => p.id === selectedPreset)?.name || 'Custom'} environment. Try asking me anything!`,
                    theme: {
                      colors: {
                        primary: '#667eea',
                        secondary: '#764ba2'
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {/* Use Cases */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              🎯 Use Cases
            </h3>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#374151' }}>
              <li><strong>Development:</strong> Test against local backend</li>
              <li><strong>Staging:</strong> Validate before production</li>
              <li><strong>Production:</strong> Deploy with production URLs</li>
              <li><strong>Multi-tenant:</strong> Different endpoints per customer</li>
              <li><strong>A/B Testing:</strong> Compare different backends</li>
            </ul>
          </div>

          {/* Connection Flow */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              🔄 Connection Flow
            </h3>
            <ol style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#374151' }}>
              <li>Configure WebSocket/WebRTC URLs</li>
              <li>Set connection options (retry, timeout)</li>
              <li>Enable/disable voice features</li>
              <li>Choose display mode (bubble/fullscreen)</li>
              <li>Connect and start chatting</li>
            </ol>
          </div>

          {/* Best Practices */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              ✅ Best Practices
            </h3>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#374151' }}>
              <li>Use <code>wss://</code> for secure WebSocket connections</li>
              <li>Use <code>https://</code> for WebRTC in production</li>
              <li>Set appropriate timeout values</li>
              <li>Enable reconnection for reliability</li>
              <li>Store connection URLs in environment variables</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ConfigurableConnectionDemo;
