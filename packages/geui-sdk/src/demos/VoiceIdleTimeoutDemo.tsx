import React, { useState } from 'react';
import { useGeUIClient } from '../hooks/useGeUIClient';

/**
 * Demo showcasing frontend-controlled voice idle timeout configuration
 */
export const VoiceIdleTimeoutDemo: React.FC = () => {
  const [idleWarnings, setIdleWarnings] = useState<string[]>([]);
  const [disconnectCount, setDisconnectCount] = useState(0);
  const [timeoutEnabled, setTimeoutEnabled] = useState(true);
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [warningSeconds, setWarningSeconds] = useState(50);

  const client = useGeUIClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/per-connection-messages', // Per-connection endpoint
    voiceIdleTimeout: {
      enabled: timeoutEnabled,
      disconnectThreshold: timeoutSeconds,
      warningThreshold: warningSeconds,
      onIdleWarning: (secondsRemaining) => {
        const warning = `Voice will disconnect in ${secondsRemaining} seconds due to inactivity`;
        setIdleWarnings(prev => [...prev, `${new Date().toLocaleTimeString()}: ${warning}`]);
      },
      onIdleDisconnect: () => {
        setDisconnectCount(prev => prev + 1);
        setIdleWarnings(prev => [...prev, `${new Date().toLocaleTimeString()}: Voice disconnected due to idle timeout`]);
      }
    }
  });

  const { 
    sendText, 
    startVoice, 
    stopVoice, 
    messages, 
    voiceState,
    connectionState 
  } = client;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Voice Idle Timeout Demo</h2>
      <p>This demo shows how to configure voice idle timeout from the frontend.</p>

      {/* Configuration Section */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Timeout Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={timeoutEnabled}
              onChange={(e) => setTimeoutEnabled(e.target.checked)}
            />
            Enable idle timeout
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            Disconnect after: 
            <input
              type="number"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 60)}
              min="10"
              max="300"
              style={{ width: '60px', marginLeft: '10px', marginRight: '5px' }}
            />
            seconds
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            Show warning at: 
            <input
              type="number"
              value={warningSeconds}
              onChange={(e) => setWarningSeconds(parseInt(e.target.value) || 50)}
              min="5"
              max={timeoutSeconds - 5}
              style={{ width: '60px', marginLeft: '10px', marginRight: '5px' }}
            />
            seconds
          </label>
        </div>
        
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Note: Changes will apply to new connections. Reconnect voice to apply new settings.
        </p>
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '20px' }}>
        <p>WebSocket: <strong>{connectionState}</strong></p>
        <p>Voice: <strong>{voiceState}</strong></p>
        <p>Disconnect count: <strong>{disconnectCount}</strong></p>
      </div>

      {/* Voice Controls */}
      <div style={{ marginBottom: '20px' }}>
        {voiceState === 'connected' ? (
          <button onClick={stopVoice} style={{ padding: '10px 20px' }}>
            Stop Voice
          </button>
        ) : (
          <button 
            onClick={startVoice} 
            disabled={connectionState !== 'connected'}
            style={{ padding: '10px 20px' }}
          >
            Start Voice
          </button>
        )}
      </div>

      {/* Warning Log */}
      {idleWarnings.length > 0 && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7',
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h3>Idle Timeout Events</h3>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {idleWarnings.map((warning, i) => (
              <div key={i} style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                {warning}
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIdleWarnings([])}
            style={{ marginTop: '10px', fontSize: '0.9em' }}
          >
            Clear Log
          </button>
        </div>
      )}

      {/* Text Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              sendText(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          style={{ 
            width: '100%', 
            padding: '10px', 
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      {/* Messages */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px',
        minHeight: '200px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center' }}>No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{ 
                marginBottom: '10px',
                padding: '8px',
                background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px'
              }}
            >
              <strong>{msg.role}:</strong> {msg.content}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <h4>How to test:</h4>
        <ol>
          <li>Configure your desired timeout settings above</li>
          <li>Click "Start Voice" to connect</li>
          <li>Speak to the assistant and get a response</li>
          <li>Stay silent for the configured time</li>
          <li>Watch for the warning message</li>
          <li>Continue silent to see automatic disconnect</li>
        </ol>
        <p>
          <strong>Tip:</strong> Try different timeout values like 30 seconds for quick testing,
          or disable the timeout completely for long conversations.
        </p>
      </div>
    </div>
  );
};