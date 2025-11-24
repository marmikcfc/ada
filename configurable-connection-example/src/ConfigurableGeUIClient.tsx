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
  visualization_library: 'c1' | 'tailwind' | 'shadcn';
  llm_config: {
    provider: 'thesys' | 'openai';
    model: string;
    api_key?: string;  // Optional user-provided API key
    api_key_env: string;  // Fallback environment variable name
  };
  mcp_config: {
    model: string;
    api_key_env: string;
    servers: MCPServerConfig[];
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

  useEffect(() => {
    console.log('🚀 ConfigurableGeUIClient: Component effect triggered');
    console.log('🚀 ConfigurableGeUIClient: Config:', connectionConfig);
    setIsReady(true);
  }, [connectionConfig]);

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

          // Transform new config format to backend-expected format
          const backendConfig = {
            client_id: connectionConfig.client_id,
            auth_token: connectionConfig.auth_token,
            mcp_config: connectionConfig.mcp_config,
            visualization_provider: {
              provider_type: connectionConfig.llm_config.provider === 'thesys' ? 'thesys' : 'openai',
              model: connectionConfig.llm_config.model,
              ...(connectionConfig.llm_config.api_key && { api_key: connectionConfig.llm_config.api_key }),
              api_key_env: connectionConfig.llm_config.api_key_env
            },
            preferences: {
              ui_framework: connectionConfig.visualization_library === 'c1' ? 'c1' : connectionConfig.visualization_library,
              theme: 'default'
            }
          };

          const configMessage = {
            type: 'connection_config',
            config: backendConfig
          };

          console.log('[ConfigurableGeUIClient] Sending configuration:', configMessage);
          ws.send(JSON.stringify(configMessage));
          configHandled = true;

          // Update state based on server response
          if (data.state) {
            onConnectionStateChange?.(data.state);
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
  }, [connectionConfig]);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Initializing connection for {clientId}...
      </div>
    );
  }

  // Use the per-connection WebSocket endpoint
  const websocketURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws/per-connection-messages`;
  const webrtcURL = `${window.location.protocol}//${window.location.hostname}:8000/api/offer`;

  return (
    <GeUI
      {...geuiProps}
      websocketURL={websocketURL}
      webrtcURL={webrtcURL}
      options={{
        ...geuiProps.options,
        // Pass our WebSocket connection handler
        onWebSocketConnect: handleWebSocketConnect,
        // Map visualization library to appropriate SDK options
        ...(connectionConfig.visualization_library === 'tailwind' && { uiFramework: 'tailwind' as const }),
        ...(connectionConfig.visualization_library === 'shadcn' && { designSystem: 'shadcn' as const })
        // C1 doesn't need uiFramework or designSystem - it uses C1Components
      }}
    />
  );
};

export type { MCPServerConfig, ConnectionConfig };
