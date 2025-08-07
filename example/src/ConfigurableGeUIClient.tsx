import React, { useState, useEffect, useCallback } from 'react';
import GeUI from '../../packages/geui-sdk/src/components/GeUI';
import type { GeUIProps } from '../../packages/geui-sdk/src/types';

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

interface ConfigurableGeUIClientProps extends Omit<GeUIProps, 'websocketURL' | 'webrtcURL'> {
  clientId: string;
  connectionConfig: ConnectionConfig;
  onConnectionStateChange?: (state: string) => void;
  onError?: (error: any) => void;
}

export const ConfigurableGeUIClient: React.FC<ConfigurableGeUIClientProps> = ({
  clientId,
  connectionConfig,
  onConnectionStateChange,
  onError,
  ...geuiProps
}) => {
  const [isReady, setIsReady] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('initializing');
  const [configSent, setConfigSent] = useState(false);

  useEffect(() => {
    console.log('🚀 ConfigurableGeUIClient: Component effect triggered');
    console.log('🚀 ConfigurableGeUIClient: Config:', connectionConfig);
    console.log('🚀 ConfigurableGeUIClient: Config object reference:', connectionConfig === connectionConfig);
    setIsReady(true);
  }, [connectionConfig]);

  const handleStateChange = (state: string) => {
    setConnectionState(state);
    onConnectionStateChange?.(state);
  };

  // Handler for WebSocket connection that sends configuration
  const handleWebSocketConnect = useCallback((ws: WebSocket) => {
    console.log('[ConfigurableGeUIClient] WebSocket connected, setting up config handler');
    
    let configHandled = false;
    
    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[ConfigurableGeUIClient] Received message:', data.type);
        
        // Only handle connection_established message, then remove handler
        if (data.type === 'connection_established' && !configHandled) {
          console.log('[ConfigurableGeUIClient] Received connection_established, sending config');
          
          // Get session and thread IDs from ConnectionService
          const connectionService = (window as any).__currentConnectionService;
          const sessionId = connectionService?.getSessionId() || 
                          localStorage.getItem('geui_session_id') || 
                          `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          
          // Get current thread ID from the connection service or URL
          const threadId = connectionService?.getActiveThreadId() || 
                         window.location.hash.replace('#', '') || 
                         'default-thread';
          
          const configMessage = {
            type: 'connection_config',
            config: connectionConfig,
            session_id: sessionId,
            thread_id: threadId
          };
          
          console.log('[ConfigurableGeUIClient] Sending configuration:', configMessage);
          ws.send(JSON.stringify(configMessage));
          configHandled = true;
          setConfigSent(true);
          
          // Update state based on server response
          if (data.state) {
            handleStateChange(data.state);
          }
          
          // Remove this handler after config is sent to allow ConnectionService to handle all messages
          console.log('[ConfigurableGeUIClient] Config sent, removing custom message handler');
          ws.removeEventListener('message', messageHandler);
        }
        // Let all other messages be handled by ConnectionService's built-in handler
      } catch (e) {
        console.error('[ConfigurableGeUIClient] Error parsing message:', e);
      }
    };
    
    ws.addEventListener('message', messageHandler);
    
    // Return cleanup function
    return () => {
      console.log('[ConfigurableGeUIClient] Cleaning up message handler');
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
    <GeUI
      {...geuiProps}
      websocketURL={websocketURL}
      webrtcURL={webrtcURL}
      options={{
        ...geuiProps.options,
        // Pass our WebSocket connection handler
        onWebSocketConnect: handleWebSocketConnect,
        onStateChange: handleStateChange,
        onError: onError,
        // Pass visualization provider from connection config
        visualizationProvider: connectionConfig.visualization_provider
      }}
    />
  );
};