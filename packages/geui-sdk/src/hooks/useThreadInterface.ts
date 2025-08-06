import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ConnectionState, VoiceConnectionState, Thread } from '../types';
import { ConnectionService, ConnectionEvent, ConnectionServiceOptions } from '../core/ConnectionService';

/**
 * Thread data structure for storage
 */
interface ThreadData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount: number;
  messages: Message[];
}

/**
 * Storage structure for ThreadInterface
 */
interface ThreadInterfaceStorage {
  version: number;
  threads: Record<string, ThreadData>;
  activeThreadId: string | null;
  lastUpdated: string;
}

/**
 * Options for the useThreadInterface hook
 */
export interface ThreadInterfaceOptions {
  websocketURL: string;
  webrtcURL?: string;
  storageKey?: string;
  enablePersistence?: boolean;
  autoConnect?: boolean;
  connectionOptions?: Partial<ConnectionServiceOptions>;
}

/**
 * Storage info for debugging
 */
export interface StorageInfo {
  totalThreads: number;
  totalMessages: number;
  storageSize: number;
  oldestThread?: string;
  newestThread?: string;
}

/**
 * ThreadInterface hook result
 */
export interface ThreadInterface {
  // Thread data
  threads: Thread[];
  activeThreadId: string | null;
  activeThread: Thread | null;
  
  // Connection state
  connectionState: ConnectionState;
  voiceState: VoiceConnectionState;
  
  // Messages for active thread
  messages: Message[];
  
  // Loading states
  isLoading: boolean;
  isSwitching: boolean;
  isConnecting: boolean;
  
  // Streaming state
  streamingContent: string;
  streamingContentType: 'text' | 'c1' | null;
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  
  // Voice state
  audioStream: MediaStream | null;
  isVoiceLoading: boolean;
  
  // Thread operations
  createThread: (title?: string) => Promise<Thread>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  clearAllThreads: () => Promise<void>;
  
  // Message operations
  sendText: (content: string) => Promise<void>;
  sendC1Action: (action: any) => void;
  clearMessages: () => void;
  
  // Connection operations
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  isReadyForVoice: () => boolean;
  
  // Utility
  getStorageInfo: () => StorageInfo;
  getBackendConnectionId: () => string | undefined;
}

/**
 * Main ThreadInterface hook that manages threads with disconnect/reconnect architecture
 */
export function useThreadInterface(options: ThreadInterfaceOptions): ThreadInterface {
  const {
    websocketURL,
    webrtcURL,
    storageKey = 'geui-thread-interface',
    enablePersistence = true,
    autoConnect = true,
    connectionOptions = {}
  } = options;

  // State
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>('disconnected');
  
  // Streaming state
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingContentType, setStreamingContentType] = useState<'text' | 'c1' | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  
  // Voice state
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  
  // Refs
  const connectionRef = useRef<ConnectionService | null>(null);
  const switchingRef = useRef(false);
  
  // Load from localStorage
  const loadFromStorage = useCallback((): ThreadInterfaceStorage | null => {
    if (!enablePersistence) return null;
    
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      // Convert message timestamps
      if (parsed.threads) {
        Object.values(parsed.threads).forEach((thread: any) => {
          if (thread.messages) {
            thread.messages = thread.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          }
        });
      }
      return parsed;
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return null;
    }
  }, [storageKey, enablePersistence]);
  
  // Save to localStorage
  const saveToStorage = useCallback((data: Partial<ThreadInterfaceStorage>) => {
    if (!enablePersistence) return;
    
    try {
      const existing = loadFromStorage() || {
        version: 1,
        threads: {},
        activeThreadId: null,
        lastUpdated: new Date().toISOString()
      };
      
      const updated = {
        ...existing,
        ...data,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }, [storageKey, enablePersistence, loadFromStorage]);
  
  // Get active thread
  const activeThread = threads.find(t => t.id === activeThreadId) || null;
  
  // Initialize connection
  useEffect(() => {
    const connection = new ConnectionService({
      websocketURL,
      webrtcURL,
      ...connectionOptions
    });
    
    // Set up event listeners
    connection.on(ConnectionEvent.STATE_CHANGED, (state: ConnectionState) => {
      setConnectionState(state);
    });
    
    connection.on(ConnectionEvent.VOICE_STATE_CHANGED, (state: VoiceConnectionState) => {
      setVoiceState(state);
      setIsVoiceLoading(state === 'connecting');
    });
    
    connection.on(ConnectionEvent.MESSAGE_RECEIVED, (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Update storage
      if (enablePersistence && activeThreadId) {
        const storage = loadFromStorage();
        if (storage && storage.threads[activeThreadId]) {
          storage.threads[activeThreadId].messages.push(message);
          storage.threads[activeThreadId].lastMessage = message.content;
          storage.threads[activeThreadId].updatedAt = new Date().toISOString();
          storage.threads[activeThreadId].messageCount++;
          saveToStorage(storage);
        }
      }
    });
    
    connection.on(ConnectionEvent.STREAMING_STARTED, ({ messageId, isEnhancement }: any) => {
      setStreamingMessageId(messageId);
      setIsStreamingActive(true);
      setStreamingContent('');
      setStreamingContentType(null);
    });
    
    connection.on(ConnectionEvent.STREAMING_CHUNK, ({ content, contentType }: any) => {
      setStreamingContent(prev => prev + content);
      if (contentType) {
        setStreamingContentType(contentType);
      }
    });
    
    connection.on(ConnectionEvent.STREAMING_DONE, () => {
      setStreamingMessageId(null);
      setIsStreamingActive(false);
      setStreamingContent('');
      setStreamingContentType(null);
    });
    
    connection.on(ConnectionEvent.AUDIO_STREAM, (stream: MediaStream) => {
      setAudioStream(stream);
    });
    
    connectionRef.current = connection;
    
    return () => {
      connection.disconnect();
    };
  }, [websocketURL, webrtcURL, connectionOptions, enablePersistence, activeThreadId, loadFromStorage, saveToStorage]);
  
  // Load initial data
  useEffect(() => {
    const storage = loadFromStorage();
    if (storage) {
      const threadList = Object.values(storage.threads).map(threadData => ({
        id: threadData.id,
        title: threadData.title,
        createdAt: new Date(threadData.createdAt),
        updatedAt: new Date(threadData.updatedAt),
        lastMessage: threadData.lastMessage,
        messageCount: threadData.messageCount
      }));
      
      setThreads(threadList);
      setActiveThreadId(storage.activeThreadId);
      
      if (storage.activeThreadId && storage.threads[storage.activeThreadId]) {
        setMessages(storage.threads[storage.activeThreadId].messages);
      }
      
      // Auto-connect if we have an active thread
      if (autoConnect && storage.activeThreadId && connectionRef.current) {
        setIsConnecting(true);
        connectionRef.current.connectWebSocket(storage.activeThreadId)
          .then(() => {
            connectionRef.current?.setActiveThreadId(storage.activeThreadId!);
          })
          .catch(console.error)
          .finally(() => setIsConnecting(false));
      }
    }
  }, []);
  
  // Create thread
  const createThread = useCallback(async (title?: string): Promise<Thread> => {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newThread: Thread = {
      id: threadId,
      title: title || `New Thread ${threads.length + 1}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    
    // Update state
    setThreads(prev => [...prev, newThread]);
    
    // Save to storage
    if (enablePersistence) {
      const storage = loadFromStorage() || {
        version: 1,
        threads: {},
        activeThreadId: null,
        lastUpdated: new Date().toISOString()
      };
      
      storage.threads[threadId] = {
        id: threadId,
        title: newThread.title,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        messageCount: 0,
        messages: []
      };
      
      saveToStorage(storage);
    }
    
    // Switch to new thread
    await switchThread(threadId);
    
    return newThread;
  }, [threads, enablePersistence, loadFromStorage, saveToStorage]);
  
  // Switch thread with disconnect/reconnect
  const switchThread = useCallback(async (threadId: string) => {
    if (threadId === activeThreadId || !connectionRef.current || switchingRef.current) return;
    
    switchingRef.current = true;
    setIsSwitching(true);
    
    try {
      // Save current thread messages
      if (activeThreadId && enablePersistence) {
        const storage = loadFromStorage() || {
          version: 1,
          threads: {},
          activeThreadId: null,
          lastUpdated: new Date().toISOString()
        };
        
        if (storage.threads[activeThreadId]) {
          storage.threads[activeThreadId].messages = messages;
          saveToStorage(storage);
        }
      }
      
      // Disconnect from current thread
      if (connectionState === 'connected') {
        await connectionRef.current.disconnect();
        // Wait for clean disconnect
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Update state
      setActiveThreadId(threadId);
      
      // Load new thread messages
      const storage = loadFromStorage();
      if (storage?.threads[threadId]) {
        setMessages(storage.threads[threadId].messages || []);
      } else {
        setMessages([]);
      }
      
      // Save active thread
      if (enablePersistence) {
        saveToStorage({ activeThreadId: threadId });
      }
      
      // Reconnect to new thread
      setIsConnecting(true);
      connectionRef.current.setActiveThreadId(threadId);
      await connectionRef.current.connectWebSocket(threadId);
      
    } catch (error) {
      console.error('Failed to switch thread:', error);
      throw error;
    } finally {
      switchingRef.current = false;
      setIsSwitching(false);
      setIsConnecting(false);
    }
  }, [activeThreadId, messages, connectionState, enablePersistence, loadFromStorage, saveToStorage]);
  
  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    // Update state
    setThreads(prev => prev.filter(t => t.id !== threadId));
    
    // If deleting active thread, clear messages and disconnect
    if (threadId === activeThreadId) {
      setMessages([]);
      setActiveThreadId(null);
      
      if (connectionRef.current && connectionState === 'connected') {
        await connectionRef.current.disconnect();
      }
    }
    
    // Update storage
    if (enablePersistence) {
      const storage = loadFromStorage();
      if (storage) {
        delete storage.threads[threadId];
        if (storage.activeThreadId === threadId) {
          storage.activeThreadId = null;
        }
        saveToStorage(storage);
      }
    }
  }, [activeThreadId, connectionState, enablePersistence, loadFromStorage, saveToStorage]);
  
  // Rename thread
  const renameThread = useCallback(async (threadId: string, title: string) => {
    // Update state
    setThreads(prev => prev.map(t => 
      t.id === threadId ? { ...t, title, updatedAt: new Date() } : t
    ));
    
    // Update storage
    if (enablePersistence) {
      const storage = loadFromStorage();
      if (storage?.threads[threadId]) {
        storage.threads[threadId].title = title;
        storage.threads[threadId].updatedAt = new Date().toISOString();
        saveToStorage(storage);
      }
    }
  }, [enablePersistence, loadFromStorage, saveToStorage]);
  
  // Clear all threads
  const clearAllThreads = useCallback(async () => {
    // Disconnect if connected
    if (connectionRef.current && connectionState === 'connected') {
      await connectionRef.current.disconnect();
    }
    
    // Clear state
    setThreads([]);
    setActiveThreadId(null);
    setMessages([]);
    
    // Clear storage
    if (enablePersistence) {
      localStorage.removeItem(storageKey);
    }
  }, [connectionState, enablePersistence, storageKey]);
  
  // Send text message
  const sendText = useCallback(async (content: string) => {
    if (!connectionRef.current || !activeThreadId) {
      throw new Error('No active thread or connection');
    }
    
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    // Add to messages immediately
    setMessages(prev => [...prev, message]);
    
    // Send via connection (includes thread_id)
    connectionRef.current.sendChatMessage({
      content,
      id: message.id
    });
    
    // Update storage
    if (enablePersistence) {
      const storage = loadFromStorage();
      if (storage?.threads[activeThreadId]) {
        storage.threads[activeThreadId].messages.push(message);
        storage.threads[activeThreadId].lastMessage = content;
        storage.threads[activeThreadId].updatedAt = new Date().toISOString();
        storage.threads[activeThreadId].messageCount++;
        saveToStorage(storage);
      }
    }
  }, [activeThreadId, enablePersistence, loadFromStorage, saveToStorage]);
  
  // Send C1 action
  const sendC1Action = useCallback((action: any) => {
    if (!connectionRef.current) return;
    connectionRef.current.sendC1Action(action);
  }, []);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    
    // Update storage
    if (enablePersistence && activeThreadId) {
      const storage = loadFromStorage();
      if (storage?.threads[activeThreadId]) {
        storage.threads[activeThreadId].messages = [];
        storage.threads[activeThreadId].messageCount = 0;
        storage.threads[activeThreadId].lastMessage = undefined;
        saveToStorage(storage);
      }
    }
  }, [activeThreadId, enablePersistence, loadFromStorage, saveToStorage]);
  
  // Voice operations
  const startVoice = useCallback(async () => {
    if (!connectionRef.current || !webrtcURL) {
      throw new Error('Voice not configured');
    }
    
    setIsVoiceLoading(true);
    try {
      await connectionRef.current.connectVoice();
    } finally {
      setIsVoiceLoading(false);
    }
  }, [webrtcURL]);
  
  const stopVoice = useCallback(() => {
    if (!connectionRef.current) return;
    connectionRef.current.stopVoice();
  }, []);
  
  const isReadyForVoice = useCallback(() => {
    return connectionState === 'connected' && voiceState === 'disconnected' && !isVoiceLoading;
  }, [connectionState, voiceState, isVoiceLoading]);
  
  // Get backend connection ID
  const getBackendConnectionId = useCallback(() => {
    return connectionRef.current?.getBackendConnectionId();
  }, []);
  
  // Get storage info
  const getStorageInfo = useCallback((): StorageInfo => {
    const storage = loadFromStorage();
    if (!storage) {
      return {
        totalThreads: 0,
        totalMessages: 0,
        storageSize: 0
      };
    }
    
    const threadIds = Object.keys(storage.threads);
    const totalMessages = threadIds.reduce((sum, id) => 
      sum + (storage.threads[id]?.messages?.length || 0), 0
    );
    
    const storageSize = new Blob([JSON.stringify(storage)]).size;
    
    const sortedThreads = threadIds
      .map(id => ({
        id,
        createdAt: storage.threads[id].createdAt
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    return {
      totalThreads: threadIds.length,
      totalMessages,
      storageSize,
      oldestThread: sortedThreads[0]?.createdAt,
      newestThread: sortedThreads[sortedThreads.length - 1]?.createdAt
    };
  }, [loadFromStorage]);
  
  return {
    // Thread data
    threads,
    activeThreadId,
    activeThread,
    
    // Connection state
    connectionState,
    voiceState,
    
    // Messages
    messages,
    
    // Loading states
    isLoading,
    isSwitching,
    isConnecting,
    
    // Streaming state
    streamingContent,
    streamingContentType,
    streamingMessageId,
    isStreamingActive,
    
    // Voice state
    audioStream,
    isVoiceLoading,
    
    // Thread operations
    createThread,
    switchThread,
    deleteThread,
    renameThread,
    clearAllThreads,
    
    // Message operations
    sendText,
    sendC1Action,
    clearMessages,
    
    // Connection operations
    startVoice,
    stopVoice,
    isReadyForVoice,
    
    // Utility
    getStorageInfo,
    getBackendConnectionId
  };
}