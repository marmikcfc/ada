import { useState, useEffect, useCallback, useRef } from 'react';
import { useGeUIClient, UseGeUIClientOptions } from './useGeUIClient';
import { Message, Thread, ConnectionState, VoiceConnectionState } from '../types';

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
 * Options for thread management
 */
export interface ThreadManagerOptions {
  enablePersistence?: boolean;
  storageKey?: string;
  maxThreads?: number;
  autoGenerateTitles?: boolean;
  generateTitle?: (firstMessage: string) => string;
}

/**
 * Combined options for ThreadInterface wrapper
 */
export interface UseThreadInterfaceWrapperOptions extends UseGeUIClientOptions {
  threadOptions?: ThreadManagerOptions;
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
 * ThreadInterface that wraps useGeUIClient to add thread management
 * while reusing the existing WebSocket connection
 */
export function useThreadInterfaceWrapper(options: UseThreadInterfaceWrapperOptions) {
  const {
    threadOptions = {},
    ...clientOptions
  } = options;

  const {
    enablePersistence = true,
    storageKey = 'geui-thread-interface',
    maxThreads = 50,
    autoGenerateTitles = true,
    generateTitle = (msg: string) => msg.substring(0, 30).trim() + '...'
  } = threadOptions;

  // Thread state - Define these first before using them in callbacks
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({});
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true); // Separate loading state for threads

  // Refs for managing state during switches
  const switchingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const initializedRef = useRef(false);

  // Get active thread
  const activeThread = threads.find(t => t.id === activeThreadId) || null;

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

  // Handler for auto-generated threads from ConnectionService
  const handleAutoThreadCreation = useCallback((threadId: string) => {
    console.log('[ThreadInterfaceWrapper] Auto-thread created:', threadId);
    
    // Check if this thread already exists
    const existingThread = threads.find(t => t.id === threadId);
    if (existingThread) {
      console.log('[ThreadInterfaceWrapper] Thread already exists, setting as active');
      setActiveThreadId(threadId);
      return;
    }
    
    // Create a new thread with the auto-generated ID
    const now = new Date();
    const newThread: Thread = {
      id: threadId,
      title: `Thread ${threads.length + 1}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    
    console.log('[ThreadInterfaceWrapper] Adding auto-generated thread to list:', newThread);
    
    // Update state
    setThreads(prev => [...prev, newThread]);
    setThreadMessages(prev => ({ ...prev, [threadId]: [] }));
    setActiveThreadId(threadId);
    
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
      
      storage.activeThreadId = threadId;
      saveToStorage(storage);
      console.log('[ThreadInterfaceWrapper] Saved auto-generated thread to localStorage');
    }
  }, [threads, enablePersistence, loadFromStorage, saveToStorage]);

  // Use the GeUI client for connection management with onThreadCreated handler
  const client = useGeUIClient({
    ...clientOptions,
    onThreadCreated: handleAutoThreadCreation
  });

  // Load initial data
  useEffect(() => {
    // Only load once
    if (initializedRef.current) {
      return;
    }
    
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
      
      // Load all thread messages into memory
      const allMessages: Record<string, Message[]> = {};
      Object.entries(storage.threads).forEach(([id, thread]) => {
        allMessages[id] = thread.messages || [];
      });
      setThreadMessages(allMessages);
      
      // If we have an active thread, set its messages in the client
      if (storage.activeThreadId && storage.threads[storage.activeThreadId]) {
        messagesRef.current = storage.threads[storage.activeThreadId].messages;
        if ((client as any).setMessages) {
          (client as any).setMessages(storage.threads[storage.activeThreadId].messages);
        }
      }
    }
    
    // Create a default thread if none exist
    if (threads.length === 0 && !storage) {
      console.log('[ThreadInterfaceWrapper] No threads found, creating default thread');
      const defaultThreadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const defaultThread: Thread = {
        id: defaultThreadId,
        title: 'Thread 1',
        createdAt: now,
        updatedAt: now,
        messageCount: 0
      };
      
      setThreads([defaultThread]);
      setThreadMessages({ [defaultThreadId]: [] });
      setActiveThreadId(defaultThreadId);
      
      // Save to storage
      if (enablePersistence) {
        const newStorage = {
          version: 1,
          threads: {
            [defaultThreadId]: {
              id: defaultThreadId,
              title: defaultThread.title,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              messageCount: 0,
              messages: []
            }
          },
          activeThreadId: defaultThreadId,
          lastUpdated: new Date().toISOString()
        };
        saveToStorage(newStorage);
        console.log('[ThreadInterfaceWrapper] Created and saved default thread');
      }
      
      // Set thread ID in client
      client.setThreadId(defaultThreadId);
    }
    
    // Mark as initialized and threads loaded
    initializedRef.current = true;
    setIsLoadingThreads(false);
  }, [enablePersistence, saveToStorage, client]);

  // Update thread ID in connection when it changes
  useEffect(() => {
    if (activeThreadId && client.threadId !== activeThreadId) {
      client.setThreadId(activeThreadId);
    }
  }, [activeThreadId, client]);

  // Save messages when they change
  useEffect(() => {
    if (!activeThreadId || switchingRef.current) return;
    
    // Don't update if we don't have threads loaded yet
    if (threads.length === 0 && !isLoadingThreads) {
      console.warn('No threads available, skipping message update');
      return;
    }
    
    // Update our local copy
    messagesRef.current = client.messages;
    
    // Save to thread messages
    setThreadMessages(prev => ({
      ...prev,
      [activeThreadId]: client.messages
    }));
    
    // Update storage with debounce to prevent rapid saves
    const timeoutId = setTimeout(() => {
      if (enablePersistence) {
        const storage = loadFromStorage();
        if (storage && storage.threads && storage.threads[activeThreadId]) {
          // Create a deep copy to avoid mutations
          const updatedStorage = {
            ...storage,
            threads: {
              ...storage.threads,
              [activeThreadId]: {
                ...storage.threads[activeThreadId],
                messages: client.messages,
                messageCount: client.messages.length,
                lastMessage: client.messages[client.messages.length - 1]?.content,
                updatedAt: new Date().toISOString()
              }
            },
            lastUpdated: new Date().toISOString()
          };
          
          saveToStorage(updatedStorage);
          
          // Update thread in state without resetting all threads
          setThreads(prev => {
            // Ensure we have threads before mapping
            if (!prev || prev.length === 0) return prev;
            
            return prev.map(t => 
              t.id === activeThreadId 
                ? {
                    ...t,
                    messageCount: client.messages.length,
                    lastMessage: client.messages[client.messages.length - 1]?.content,
                    updatedAt: new Date()
                  }
                : t
            );
          });
        }
      }
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [client.messages, activeThreadId, enablePersistence, threads.length, isLoadingThreads, loadFromStorage, saveToStorage]);

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
    setThreadMessages(prev => ({ ...prev, [threadId]: [] }));
    
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

  // Switch thread with message management
  const switchThread = useCallback(async (threadId: string) => {
    if (threadId === activeThreadId || switchingRef.current) return;
    
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
          storage.threads[activeThreadId].messages = messagesRef.current;
          saveToStorage(storage);
        }
      }
      
      // Clear messages in client
      client.clearMessages();
      
      // Update active thread
      setActiveThreadId(threadId);
      
      // Load new thread messages
      const newMessages = threadMessages[threadId] || [];
      messagesRef.current = newMessages;
      
      // Set messages in client
      if ((client as any).setMessages) {
        (client as any).setMessages(newMessages);
      }
      
      // Update thread ID in connection
      client.setThreadId(threadId);
      
      // Save active thread
      if (enablePersistence) {
        saveToStorage({ activeThreadId: threadId });
      }
      
    } catch (error) {
      console.error('Failed to switch thread:', error);
      throw error;
    } finally {
      switchingRef.current = false;
      setIsSwitching(false);
    }
  }, [activeThreadId, threadMessages, client, enablePersistence, loadFromStorage, saveToStorage]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    // Update state
    setThreads(prev => prev.filter(t => t.id !== threadId));
    setThreadMessages(prev => {
      const updated = { ...prev };
      delete updated[threadId];
      return updated;
    });
    
    // If deleting active thread, clear messages
    if (threadId === activeThreadId) {
      client.clearMessages();
      setActiveThreadId(null);
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
  }, [activeThreadId, client, enablePersistence, loadFromStorage, saveToStorage]);

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
    // Clear state
    setThreads([]);
    setActiveThreadId(null);
    setThreadMessages({});
    client.clearMessages();
    
    // Clear storage
    if (enablePersistence) {
      localStorage.removeItem(storageKey);
    }
  }, [client, enablePersistence, storageKey]);

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

  // Return the combined interface
  return {
    // Thread data
    threads,
    activeThreadId,
    activeThread,
    
    // Connection state (from client)
    connectionState: client.connectionState,
    voiceState: client.voiceState,
    
    // Messages (from client)
    messages: client.messages,
    
    // Loading states
    isLoading: client.isLoading,
    isSwitching,
    isConnecting: client.connectionState === 'connecting',
    isLoadingThreads, // Separate loading state for thread list
    
    // Streaming state (from client)
    streamingContent: client.streamingContent,
    streamingContentType: client.streamingContentType,
    streamingMessageId: client.streamingMessageId,
    isStreamingActive: client.isStreamingActive,
    
    // Voice state (from client)
    audioStream: client.audioStream,
    isVoiceLoading: client.isVoiceLoading,
    
    // Thread operations
    createThread,
    switchThread,
    deleteThread,
    renameThread,
    clearAllThreads,
    
    // Message operations (from client)
    sendText: client.sendText,
    sendC1Action: client.sendC1Action,
    clearMessages: client.clearMessages,
    
    // Connection operations (from client)
    startVoice: client.startVoice,
    stopVoice: client.stopVoice,
    isReadyForVoice: client.isReadyForVoice,
    
    // Utility
    getStorageInfo,
    getBackendConnectionId: client.getBackendConnectionId,
    
    // Additional client methods
    setThreadId: client.setThreadId,
    threadId: client.threadId,
    isEnhancing: client.isEnhancing
  };
}