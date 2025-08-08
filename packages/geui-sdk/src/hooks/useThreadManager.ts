import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ConnectionState } from '../types';
import { ConnectionService, ConnectionEvent } from '../core/ConnectionService';

/**
 * Options for the useThreadManager hook
 */
export interface UseThreadManagerOptions {
  /** Thread ID to manage */
  threadId: string;
  
  /**
   * Optional backend API base URL for thread operations
   * When provided, uses RESTful endpoints:
   * - GET {apiUrl}/{threadId}/messages - Get thread messages
   * - POST {apiUrl}/{threadId}/messages - Add message
   * - PUT {apiUrl}/{threadId} - Update thread metadata
   */
  apiUrl?: string;
  
  /** HTTP headers for API requests */
  headers?: Record<string, string>;
  
  /** Whether to enable localStorage persistence (default: true) */
  enableLocalStorage?: boolean;
  
  /** Storage key prefix for localStorage (default: 'geui-messages') */
  storageKey?: string;
  
  /** Connection configuration for WebSocket/WebRTC */
  connectionConfig?: {
    webrtcURL?: string;
    websocketURL?: string;
  };
  
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * Thread manager state and actions
 */
export interface UseThreadManagerResult {
  /** Thread messages */
  messages: Message[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Connection state */
  connectionState: ConnectionState;
  
  /** Load messages for the thread */
  loadMessages: () => Promise<void>;
  
  /** Add a message to the thread */
  addMessage: (message: Message) => Promise<void>;
  
  /** Clear all messages */
  clearMessages: () => void;
  
  /** Save messages to storage */
  saveMessages: () => Promise<void>;
  
  /** Connect to WebSocket/WebRTC with thread context */
  connect: () => Promise<void>;
  
  /** Disconnect from WebSocket/WebRTC */
  disconnect: () => Promise<void>;
  
  /** Send a text message */
  sendMessage: (content: string) => Promise<void>;
  
  /** Get connection service instance */
  getConnectionService: () => ConnectionService | null;
}

/**
 * Hook for managing individual thread content with localStorage and optional API support
 */
export function useThreadManager(options: UseThreadManagerOptions): UseThreadManagerResult {
  const {
    threadId,
    apiUrl,
    headers,
    enableLocalStorage = true,
    storageKey = 'geui-messages',
    connectionConfig,
    autoConnect = true,
  } = options;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Refs
  const connectionServiceRef = useRef<ConnectionService | null>(null);
  const initialized = useRef(false);

  // API helper functions
  const fetchFromAPI = useCallback(async (endpoint: string, options?: RequestInit) => {
    if (!apiUrl) throw new Error('API URL not configured');
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }, [apiUrl, headers]);

  // LocalStorage helpers
  const saveToLocalStorage = useCallback((messages: Message[]) => {
    if (!enableLocalStorage) return;

    try {
      const key = `${storageKey}-${threadId}`;
      const data = {
        threadId,
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        lastSyncedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save messages to localStorage:', err);
    }
  }, [enableLocalStorage, storageKey, threadId]);

  const loadFromLocalStorage = useCallback((): Message[] => {
    if (!enableLocalStorage) return [];

    try {
      const key = `${storageKey}-${threadId}`;
      const data = localStorage.getItem(key);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return parsed.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (err) {
      console.warn('Failed to load messages from localStorage:', err);
      return [];
    }
  }, [enableLocalStorage, storageKey, threadId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (apiUrl) {
        // Load from API
        const data = await fetchFromAPI(`/${threadId}/messages`);
        const messages = (data.messages || data).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messages);
        
        // Cache in localStorage if enabled
        if (enableLocalStorage) {
          saveToLocalStorage(messages);
        }
      } else {
        // Load from localStorage
        const localMessages = loadFromLocalStorage();
        setMessages(localMessages);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, threadId, fetchFromAPI, enableLocalStorage, saveToLocalStorage, loadFromLocalStorage]);

  // Add message
  const addMessage = useCallback(async (message: Message) => {
    setError(null);

    try {
      if (apiUrl) {
        // Add via API
        await fetchFromAPI(`/${threadId}/messages`, {
          method: 'POST',
          body: JSON.stringify(message),
        });
      }

      // Update state
      setMessages(prev => [...prev, message]);

      // Save to localStorage
      if (enableLocalStorage) {
        saveToLocalStorage([...messages, message]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add message');
      setError(error);
      throw error;
    }
  }, [apiUrl, threadId, fetchFromAPI, enableLocalStorage, saveToLocalStorage, messages]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    
    if (enableLocalStorage) {
      const key = `${storageKey}-${threadId}`;
      localStorage.removeItem(key);
    }
  }, [enableLocalStorage, storageKey, threadId]);

  // Save messages
  const saveMessages = useCallback(async () => {
    setError(null);

    try {
      if (apiUrl) {
        // Save via API
        await fetchFromAPI(`/${threadId}`, {
          method: 'PUT',
          body: JSON.stringify({ messages }),
        });
      }

      // Save to localStorage
      if (enableLocalStorage) {
        saveToLocalStorage(messages);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save messages');
      setError(error);
      throw error;
    }
  }, [apiUrl, threadId, fetchFromAPI, messages, enableLocalStorage, saveToLocalStorage]);

  // Initialize connection service
  useEffect(() => {
    if (!connectionConfig?.websocketURL || connectionServiceRef.current) return;

    const service = new ConnectionService({
      webrtcURL: connectionConfig.webrtcURL,
      websocketURL: connectionConfig.websocketURL,
      onWebSocketConnect: (ws) => {
        // Send thread context when connecting
        ws.send(JSON.stringify({
          type: 'connect',
          thread_id: threadId,
        }));
        
        return () => {
          // Cleanup function
        };
      },
    });

    // Set up event listeners
    service.on(ConnectionEvent.STATE_CHANGED, (state: ConnectionState) => {
      setConnectionState(state);
    });

    service.on(ConnectionEvent.MESSAGE_RECEIVED, (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Auto-save to localStorage
      if (enableLocalStorage) {
        saveToLocalStorage([...messages, message]);
      }
    });

    connectionServiceRef.current = service;

    // Auto-connect if enabled
    if (autoConnect) {
      service.setActiveThreadId(threadId);
      service.connectWebSocket(threadId).catch(err => {
        console.error('Failed to connect:', err);
        setError(err);
      });
    }

    return () => {
      service.disconnect();
      connectionServiceRef.current = null;
    };
  }, [connectionConfig, threadId, autoConnect, enableLocalStorage, saveToLocalStorage, messages]);

  // Update thread ID in connection service when it changes
  useEffect(() => {
    if (connectionServiceRef.current && connectionServiceRef.current.getActiveThreadId() !== threadId) {
      connectionServiceRef.current.switchToThread(threadId).catch(err => {
        console.error('Failed to switch thread:', err);
        setError(err);
      });
    }
  }, [threadId]);

  // Connect
  const connect = useCallback(async () => {
    if (!connectionServiceRef.current) {
      throw new Error('Connection service not initialized');
    }

    setError(null);
    
    try {
      connectionServiceRef.current.setActiveThreadId(threadId);
      await connectionServiceRef.current.connectWebSocket(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect');
      setError(error);
      throw error;
    }
  }, [threadId]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!connectionServiceRef.current) return;

    try {
      await connectionServiceRef.current.disconnectCurrentThread();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!connectionServiceRef.current) {
      throw new Error('Connection service not initialized');
    }

    setError(null);

    try {
      const message: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Add to local state immediately
      setMessages(prev => [...prev, message]);

      // Send via connection service (includes thread_id)
      connectionServiceRef.current.sendChatMessage(content, threadId);

      // Save to localStorage
      if (enableLocalStorage) {
        saveToLocalStorage([...messages, message]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      throw error;
    }
  }, [enableLocalStorage, saveToLocalStorage, messages]);

  // Get connection service
  const getConnectionService = useCallback(() => {
    return connectionServiceRef.current;
  }, []);

  // Load messages on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    isLoading,
    error,
    connectionState,
    loadMessages,
    addMessage,
    clearMessages,
    saveMessages,
    connect,
    disconnect,
    sendMessage,
    getConnectionService,
  };
}