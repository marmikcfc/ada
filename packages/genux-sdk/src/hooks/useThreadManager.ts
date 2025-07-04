import { useState, useEffect, useCallback, useRef } from 'react';
import { Thread, ThreadSummary, ThreadManagerOptions } from '../types';

/**
 * Configuration options for the useThreadManager hook
 */
export interface UseThreadManagerOptions extends ThreadManagerOptions {
  /** Storage key for persisting threads */
  storageKey?: string;
  /** Whether to persist threads to localStorage */
  enablePersistence?: boolean;
  /** Function to generate thread titles based on first message */
  generateTitle?: (firstMessage: string) => string;
  /** Maximum number of threads to keep in memory */
  maxThreadsInMemory?: number;
}

/**
 * Thread manager state and actions
 */
export interface ThreadManagerState {
  /** List of thread summaries */
  threads: ThreadSummary[];
  /** Currently active thread ID */
  activeThreadId: string | null;
  /** Whether a new thread is being created */
  isCreatingThread: boolean;
  /** Whether threads are being loaded */
  isLoading: boolean;
  /** Current thread data */
  currentThread: Thread | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Thread manager actions
 */
export interface ThreadManagerActions {
  /** Create a new thread */
  createThread: (initialMessage?: string) => Promise<string>;
  /** Switch to a different thread */
  switchThread: (threadId: string) => Promise<void>;
  /** Delete a thread */
  deleteThread: (threadId: string) => Promise<void>;
  /** Rename a thread */
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  /** Update thread with new message */
  updateThread: (threadId: string, message: string, messageId: string) => void;
  /** Get thread by ID */
  getThread: (threadId: string) => Thread | null;
  /** Clear all threads */
  clearAllThreads: () => void;
  /** Refresh threads from storage */
  refreshThreads: () => void;
}

/**
 * Return type for useThreadManager hook
 */
export interface UseThreadManagerResult extends ThreadManagerState, ThreadManagerActions {}

/**
 * Default thread title generator
 */
const defaultGenerateTitle = (firstMessage: string): string => {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 30) return trimmed;
  return trimmed.substring(0, 30).trim() + '...';
};

/**
 * Hook for managing conversation threads
 * 
 * Provides state management for multiple conversation threads with
 * automatic persistence to localStorage.
 */
export function useThreadManager(options: UseThreadManagerOptions = {}): UseThreadManagerResult {
  const {
    storageKey = 'genux-threads',
    enablePersistence = true,
    generateTitle = defaultGenerateTitle,
    maxThreadsInMemory = 100,
    maxThreads: _maxThreads = 50, // Prefix unused vars with underscore
    autoGenerateTitles = true,
    showCreateButton: _showCreateButton = true,
    allowThreadDeletion: _allowThreadDeletion = true,
  } = options;

  // State
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for thread data storage
  const threadsDataRef = useRef<Map<string, Thread>>(new Map());
  const initialized = useRef(false);

  // Get current thread
  const currentThread = activeThreadId ? threadsDataRef.current.get(activeThreadId) || null : null;

  // Storage helpers
  const saveToStorage = useCallback((threadsMap: Map<string, Thread>, summaries: ThreadSummary[]) => {
    if (!enablePersistence) return;
    
    try {
      const data = {
        threads: Array.from(threadsMap.entries()).map(([id, thread]) => [id, {
          ...thread,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
        }]),
        summaries: summaries.map(summary => ({
          ...summary,
          updatedAt: summary.updatedAt.toISOString(),
        })),
        activeThreadId,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save threads to localStorage:', err);
    }
  }, [enablePersistence, storageKey, activeThreadId]);

  const loadFromStorage = useCallback((): { threadsMap: Map<string, Thread>; summaries: ThreadSummary[]; activeId: string | null } => {
    if (!enablePersistence) return { threadsMap: new Map(), summaries: [], activeId: null };
    
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return { threadsMap: new Map(), summaries: [], activeId: null };
      
      const parsed = JSON.parse(data);
      const threadsMap = new Map<string, Thread>(
        (parsed.threads as [string, any][]).map(([id, thread]) => [
          id,
          {
            ...thread,
            createdAt: new Date(thread.createdAt),
            updatedAt: new Date(thread.updatedAt),
          } as Thread
        ])
      );
      
      const summaries = parsed.summaries.map((summary: any) => ({
        ...summary,
        updatedAt: new Date(summary.updatedAt),
      }));
      
      return { threadsMap, summaries, activeId: parsed.activeThreadId };
    } catch (err) {
      console.warn('Failed to load threads from localStorage:', err);
      return { threadsMap: new Map(), summaries: [], activeId: null };
    }
  }, [enablePersistence, storageKey]);

  // Initialize threads from storage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    setIsLoading(true);
    try {
      const { threadsMap, summaries, activeId } = loadFromStorage();
      threadsDataRef.current = threadsMap;
      setThreads(summaries);
      setActiveThreadId(activeId);
    } catch (err) {
      setError('Failed to load threads');
    } finally {
      setIsLoading(false);
    }
  }, [loadFromStorage]);

  // Create a new thread
  const createThread = useCallback(async (initialMessage?: string): Promise<string> => {
    setIsCreatingThread(true);
    setError(null);
    
    try {
      const threadId = crypto.randomUUID();
      const now = new Date();
      
      const newThread: Thread = {
        id: threadId,
        title: initialMessage && autoGenerateTitles 
          ? generateTitle(initialMessage)
          : `New Conversation`,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        lastMessage: initialMessage || '',
        isActive: true,
      };

      const newSummary: ThreadSummary = {
        id: threadId,
        title: newThread.title,
        lastMessage: newThread.lastMessage || '',
        updatedAt: now,
        messageCount: 0,
        isActive: true,
      };

      // Update state
      const updatedThreadsMap = new Map(threadsDataRef.current);
      updatedThreadsMap.set(threadId, newThread);
      
      // Deactivate other threads
      const updatedSummaries = threads.map(thread => ({ ...thread, isActive: false }));
      updatedSummaries.unshift(newSummary);
      
      // Limit threads in memory
      if (updatedSummaries.length > maxThreadsInMemory) {
        const removedThreads = updatedSummaries.splice(maxThreadsInMemory);
        removedThreads.forEach(thread => updatedThreadsMap.delete(thread.id));
      }
      
      threadsDataRef.current = updatedThreadsMap;
      setThreads(updatedSummaries);
      setActiveThreadId(threadId);
      
      // Save to storage
      saveToStorage(updatedThreadsMap, updatedSummaries);
      
      return threadId;
    } catch (err) {
      setError('Failed to create thread');
      throw err;
    } finally {
      setIsCreatingThread(false);
    }
  }, [threads, autoGenerateTitles, generateTitle, maxThreadsInMemory, saveToStorage]);

  // Switch to a different thread
  const switchThread = useCallback(async (threadId: string): Promise<void> => {
    if (threadId === activeThreadId) return;
    
    setError(null);
    
    try {
      // Check if thread exists
      const thread = threadsDataRef.current.get(threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }
      
      // Update active states
      const updatedSummaries = threads.map(t => ({
        ...t,
        isActive: t.id === threadId,
      }));
      
      setThreads(updatedSummaries);
      setActiveThreadId(threadId);
      
      // Save to storage
      saveToStorage(threadsDataRef.current, updatedSummaries);
    } catch (err) {
      setError('Failed to switch thread');
      throw err;
    }
  }, [activeThreadId, threads, saveToStorage]);

  // Delete a thread
  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    setError(null);
    
    try {
      // Remove from data
      const updatedThreadsMap = new Map(threadsDataRef.current);
      updatedThreadsMap.delete(threadId);
      
      // Remove from summaries
      const updatedSummaries = threads.filter(t => t.id !== threadId);
      
      // If deleted thread was active, switch to first available thread
      let newActiveId = activeThreadId;
      if (activeThreadId === threadId) {
        newActiveId = updatedSummaries.length > 0 ? updatedSummaries[0].id : null;
        if (newActiveId) {
          updatedSummaries[0].isActive = true;
        }
      }
      
      threadsDataRef.current = updatedThreadsMap;
      setThreads(updatedSummaries);
      setActiveThreadId(newActiveId);
      
      // Save to storage
      saveToStorage(updatedThreadsMap, updatedSummaries);
    } catch (err) {
      setError('Failed to delete thread');
      throw err;
    }
  }, [threads, activeThreadId, saveToStorage]);

  // Rename a thread
  const renameThread = useCallback(async (threadId: string, newTitle: string): Promise<void> => {
    setError(null);
    
    try {
      // Update thread data
      const updatedThreadsMap = new Map(threadsDataRef.current);
      const thread = updatedThreadsMap.get(threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }
      
      const updatedThread = {
        ...thread,
        title: newTitle,
        updatedAt: new Date(),
      };
      updatedThreadsMap.set(threadId, updatedThread);
      
      // Update summaries
      const updatedSummaries = threads.map(t => 
        t.id === threadId 
          ? { ...t, title: newTitle, updatedAt: new Date() }
          : t
      );
      
      threadsDataRef.current = updatedThreadsMap;
      setThreads(updatedSummaries);
      
      // Save to storage
      saveToStorage(updatedThreadsMap, updatedSummaries);
    } catch (err) {
      setError('Failed to rename thread');
      throw err;
    }
  }, [threads, saveToStorage]);

  // Update thread with new message
  const updateThread = useCallback((threadId: string, message: string, _messageId: string): void => {
    const updatedThreadsMap = new Map(threadsDataRef.current);
    const thread = updatedThreadsMap.get(threadId);
    if (!thread) return;
    
    const now = new Date();
    const updatedThread = {
      ...thread,
      messageCount: thread.messageCount + 1,
      lastMessage: message.substring(0, 100), // Truncate for display
      updatedAt: now,
    };
    updatedThreadsMap.set(threadId, updatedThread);
    
    // Update summaries
    const updatedSummaries = threads.map(t => 
      t.id === threadId 
        ? { 
            ...t, 
            messageCount: updatedThread.messageCount,
            lastMessage: updatedThread.lastMessage,
            updatedAt: now,
          }
        : t
    );
    
    threadsDataRef.current = updatedThreadsMap;
    setThreads(updatedSummaries);
    
    // Save to storage
    saveToStorage(updatedThreadsMap, updatedSummaries);
  }, [threads, saveToStorage]);

  // Get thread by ID
  const getThread = useCallback((threadId: string): Thread | null => {
    return threadsDataRef.current.get(threadId) || null;
  }, []);

  // Clear all threads
  const clearAllThreads = useCallback((): void => {
    threadsDataRef.current.clear();
    setThreads([]);
    setActiveThreadId(null);
    
    if (enablePersistence) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.warn('Failed to clear threads from localStorage:', err);
      }
    }
  }, [enablePersistence, storageKey]);

  // Refresh threads from storage
  const refreshThreads = useCallback((): void => {
    const { threadsMap, summaries, activeId } = loadFromStorage();
    threadsDataRef.current = threadsMap;
    setThreads(summaries);
    setActiveThreadId(activeId);
  }, [loadFromStorage]);

  return {
    // State
    threads,
    activeThreadId,
    isCreatingThread,
    isLoading,
    currentThread,
    error,
    
    // Actions
    createThread,
    switchThread,
    deleteThread,
    renameThread,
    updateThread,
    getThread,
    clearAllThreads,
    refreshThreads,
  };
} 