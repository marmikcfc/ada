import React, { useState, useEffect, useCallback } from 'react';
import Genux from '../../packages/genux-sdk/src/components/Genux';
import type { GenuxProps } from '../../packages/genux-sdk/src/types';

interface MCPServerConfig {
  name: string;
  url: string;
  transport: 'http';
  headers?: Record<string, string>;
}

interface ConnectionConfig {
  client_id: string;
  auth_token?: string;
  mcp_config: {
    model: string;
    api_key_env: string;
    servers: MCPServerConfig[];
  };
  visualization_provider: {
    provider_type: 'thesys' | 'google' | 'tomorrow_ai' | 'openai' | 'anthropic';
    model: string;
    api_key_env: string;
  };
}

interface ConfigurableGenuxClientProps extends Omit<GenuxProps, 'websocketURL' | 'webrtcURL'> {
  clientId: string;
  connectionConfig: ConnectionConfig;
  onConnectionStateChange?: (state: string) => void;
  onError?: (error: any) => void;
}

export const ConfigurableGenuxClient: React.FC<ConfigurableGenuxClientProps> = ({
  clientId,
  connectionConfig,
  onConnectionStateChange,
  onError,
  ...genuxProps
}) => {
  const [isReady, setIsReady] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('initializing');
  const [configSent, setConfigSent] = useState(false);

  useEffect(() => {
    console.log('[ConfigurableGenuxClient] Initializing with config:', connectionConfig);
    setIsReady(true);
  }, [connectionConfig]);

  const handleStateChange = (state: string) => {
    setConnectionState(state);
    onConnectionStateChange?.(state);
  };

  // Handler for WebSocket connection that sends configuration
  const handleWebSocketConnect = useCallback((ws: WebSocket) => {
    console.log('[ConfigurableGenuxClient] WebSocket connected, setting up config handler');
    
    let configHandled = false;
    
    const messageHandler = (event: MessageEvent) => {
      if (!configHandled) {
        try {
          const data = JSON.parse(event.data);
          console.log('[ConfigurableGenuxClient] Received message:', data.type);
          
          if (data.type === 'connection_established') {
            console.log('[ConfigurableGenuxClient] Received connection_established, sending config');
            
            const configMessage = {
              type: 'connection_config',
              config: connectionConfig
            };
            
            console.log('[ConfigurableGenuxClient] Sending configuration:', configMessage);
            ws.send(JSON.stringify(configMessage));
            configHandled = true;
            setConfigSent(true);
            
            // Update state based on server response
            if (data.state) {
              handleStateChange(data.state);
            }
          } else if (data.type === 'state_update') {
            // Handle state updates from server
            handleStateChange(data.state);
          } else if (data.type === 'error') {
            // Handle errors
            console.error('[ConfigurableGenuxClient] Server error:', data.message);
            onError?.(new Error(data.message || 'Server error'));
          }
        } catch (e) {
          console.error('[ConfigurableGenuxClient] Error parsing message:', e);
        }
      }
    };
    
    ws.addEventListener('message', messageHandler);
    
    // Return cleanup function
    return () => {
      console.log('[ConfigurableGenuxClient] Cleaning up message handler');
      ws.removeEventListener('message', messageHandler);
    };
  }, [connectionConfig, onError, handleStateChange]);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Initializing connection for {clientId}...
      </div>
    );
  }

  // Use the per-connection WebSocket endpoint
  const websocketURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws/per-connection-messages`;
  const webrtcURL = '/api/offer';

  return (
    <Genux
      {...genuxProps}
      websocketURL={websocketURL}
      webrtcURL={webrtcURL}
      options={{
        ...genuxProps.options,
        // Pass our WebSocket connection handler
        onWebSocketConnect: handleWebSocketConnect,
        onStateChange: handleStateChange,
        onError: onError
      }}
    />
  );
};