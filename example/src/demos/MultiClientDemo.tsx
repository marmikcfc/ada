/**
 * Multi-Client Demo
 * 
 * Demonstrates multiple simultaneous WebSocket connections with different
 * MCP configurations and visualization providers.
 */

import React, { useState, useRef } from 'react';
import { ConfigurableGenuxClient, useConfigurableGenux, ConnectionStatus } from '../ConfigurableGenuxClient.js';

// Sample configurations for different clients
const CLIENT_CONFIGS = {
  clientA: {
    clientId: 'client-a-corp',
    authToken: 'demo-token-a',
    mcpConfig: {
      model: 'gpt-4o-mini',
      apiKeyEnv: 'OPENAI_API_KEY',
      servers: [
        {
          name: 'perplexity_search',
          url: 'https://server.smithery.ai/@arjunkmrm/perplexity-search/mcp?api_key=54b8c43d-cdda-4503-bda0-29be49a2b664&profile=tense-raven-Zw05Xc',
          transport: 'http',
          description: 'Real-time search and information retrieval'
        }
      ]
    },
    visualizationProvider: {
      type: 'thesys',
      apiKeyEnv: 'THESYS_API_KEY',
      model: 'c1-nightly'
    },
    preferences: {
      theme: 'corporate',
      language: 'en'
    }
  },
  
  clientB: {
    clientId: 'client-b-startup',
    authToken: 'demo-token-b',
    mcpConfig: {
      model: 'gpt-4o-mini',
      apiKeyEnv: 'OPENAI_API_KEY',
      servers: [] // No MCP servers for this client
    },
    visualizationProvider: {
      type: 'google',
      apiKeyEnv: 'GOOGLE_API_KEY',
      model: 'gemini-pro'
    },
    preferences: {
      theme: 'modern',
      language: 'en'
    }
  },
  
  clientC: {
    clientId: 'client-c-enterprise',
    authToken: 'demo-token-c',
    mcpConfig: {
      model: 'gpt-4',
      apiKeyEnv: 'OPENAI_API_KEY',
      servers: [
        {
          name: 'crm_integration',
          url: 'https://demo-crm-mcp.example.com/api',
          transport: 'http',
          description: 'Customer relationship management integration',
          headers: {
            'X-API-Key': 'demo-crm-key'
          }
        },
        {
          name: 'analytics_engine',
          url: 'https://demo-analytics-mcp.example.com/api',
          transport: 'http',
          description: 'Business analytics and reporting'
        }
      ]
    },
    visualizationProvider: {
      type: 'tomorrow',
      apiKeyEnv: 'TOMORROW_API_KEY',
      baseUrl: 'https://api.tomorrow-ai.example.com',
      model: 'tomorrow-viz-v1'
    },
    preferences: {
      theme: 'enterprise',
      language: 'en',
      advanced_features: true
    }
  }
};

function ClientDemo({ clientKey, config, title, description }) {
  const {
    client,
    connectionState,
    stateData,
    messages,
    error,
    sendMessage,
    isActive,
    isConnecting
  } = useConfigurableGenux(config);
  
  const [inputMessage, setInputMessage] = useState('');
  const [threadId] = useState(() => `thread-${clientKey}-${Date.now()}`);
  const messagesEndRef = useRef(null);
  
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (inputMessage.trim() && isActive) {
      sendMessage(inputMessage.trim(), threadId);
      setInputMessage('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      backgroundColor: '#ffffff',
      height: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          color: '#1f2937',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
        <p style={{ 
          margin: '0 0 8px 0', 
          color: '#6b7280',
          fontSize: '14px'
        }}>
          {description}
        </p>
        
        {/* Configuration Summary */}
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          padding: '8px 12px',
          borderRadius: '6px',
          fontFamily: 'monospace'
        }}>
          <div>Model: {config.mcpConfig.model}</div>
          <div>MCP Servers: {config.mcpConfig.servers.length}</div>
          <div>Viz Provider: {config.visualizationProvider.type}</div>
        </div>
      </div>
      
      {/* Connection Status */}
      <ConnectionStatus state={connectionState} stateData={stateData} />
      
      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          ❌ {error}
        </div>
      )}
      
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        backgroundColor: '#fafafa',
        marginBottom: '16px'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280',
            fontStyle: 'italic',
            padding: '20px'
          }}>
            {isActive ? 'Start a conversation...' : 'Waiting for connection...'}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || index}
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: message.role === 'user' ? '#e0f2fe' : '#f0f9ff',
                borderRadius: '8px',
                border: `1px solid ${message.role === 'user' ? '#0891b2' : '#0284c7'}`
              }}
            >
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                marginBottom: '4px',
                fontWeight: '500'
              }}>
                {message.role === 'user' ? '👤 User' : '🤖 Assistant'}
                {message.streaming && ' (streaming...)'}
              </div>
              <div 
                style={{ color: '#374151' }}
                dangerouslySetInnerHTML={{ 
                  __html: message.content || 'No content' 
                }}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isActive ? "Type your message..." : "Waiting for connection..."}
          disabled={!isActive}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '100px'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isActive || !inputMessage.trim()}
          style={{
            padding: '12px 20px',
            backgroundColor: isActive && inputMessage.trim() ? '#3b82f6' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isActive && inputMessage.trim() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function MultiClientDemo() {
  const [selectedClients, setSelectedClients] = useState(['clientA']);
  
  const handleClientToggle = (clientKey) => {
    setSelectedClients(prev => 
      prev.includes(clientKey) 
        ? prev.filter(k => k !== clientKey)
        : [...prev, clientKey]
    );
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '28px', 
          fontWeight: '700',
          color: '#1f2937'
        }}>
          Multi-Client Demo
        </h1>
        <p style={{ 
          margin: '0 0 16px 0', 
          fontSize: '16px',
          color: '#6b7280'
        }}>
          Demonstrate multiple simultaneous WebSocket connections with different MCP configurations and visualization providers.
        </p>
        
        {/* Client Selection */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {Object.entries(CLIENT_CONFIGS).map(([key, config]) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: selectedClients.includes(key) ? '#e0f2fe' : '#f9fafb',
                border: `1px solid ${selectedClients.includes(key) ? '#0891b2' : '#d1d5db'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <input
                type="checkbox"
                checked={selectedClients.includes(key)}
                onChange={() => handleClientToggle(key)}
                style={{ margin: 0 }}
              />
              {config.clientId}
            </label>
          ))}
        </div>
        
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fefce8',
          border: '1px solid #facc15',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#a16207'
        }}>
          ⚠️ <strong>Note:</strong> Each client will create an independent WebSocket connection with its own MCP configuration and visualization provider. Monitor the backend logs to see the per-connection resource initialization.
        </div>
      </div>
      
      {/* Client Demos Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedClients.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {selectedClients.map(clientKey => {
          const config = CLIENT_CONFIGS[clientKey];
          const titles = {
            clientA: '🏢 Corporate Client',
            clientB: '🚀 Startup Client', 
            clientC: '🏛️ Enterprise Client'
          };
          const descriptions = {
            clientA: 'Uses Perplexity search MCP with Thesys visualization',
            clientB: 'No MCP servers, Google visualization provider',
            clientC: 'Multiple MCP servers with Tomorrow AI visualization'
          };
          
          return (
            <ClientDemo
              key={clientKey}
              clientKey={clientKey}
              config={config}
              title={titles[clientKey]}
              description={descriptions[clientKey]}
            />
          );
        })}
      </div>
      
      {selectedClients.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Select at least one client to start the demo.
        </div>
      )}
    </div>
  );
}