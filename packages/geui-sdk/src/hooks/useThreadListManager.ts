import { useState, useEffect, useCallback, useRef } from 'react';
import { Thread, ThreadSummary } from '../types';

/**
 * Options for the useThreadListManager hook
 */
export interface UseThreadListManagerOptions {
  /**
   * Optional backend API base URL for thread operations
   * When provided, uses RESTful endpoints:
   * - GET {apiUrl} - List all threads
   * - POST {apiUrl} - Create new thread
   * - PUT {apiUrl}/{id} - Update thread
   * - DELETE {apiUrl}/{id} - Delete thread
   */
  apiUrl?: string;
  
  /** HTTP headers for API requests */
  headers?: Record<string, string>;
  
  /** Whether to enable localStorage persistence (default: true) */
  enableLocalStorage?: boolean;
  
  /** Storage key prefix for localStorage (default: 'geui-threads') */
  storageKey?: string;
  
  /** Maximum number of threads to keep (default: 50) */
  maxThreads?: number;
  
  /** Whether to auto-generate thread titles from first message (default: true) */
  autoGenerateTitles?: boolean;
  
  /** Function to generate thread title from first message */
  generateTitle?: (firstMessage: string) => string;
}

/**
 * Thread list manager state and actions
 */
export interface UseThreadListManagerResult {
  /** List of thread summaries */
  threads: ThreadSummary[];
  
  /** Currently active thread ID */
  activeThreadId: string | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Create a new thread */
  createThread: (title?: string) => Promise<Thread>;
  
  /** Delete a thread */
  deleteThread: (threadId: string) => Promise<void>;
  
  /** Rename a thread */
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  
  /** Set the active thread */
  setActiveThread: (threadId: string) => void;
  
  /** Refresh thread list from storage/API */
  refreshThreadList: () => Promise<void>;
  
  /** Get a specific thread by ID */
  getThread: (threadId: string) => Thread | null;
  
  /** Clear all threads */
  clearAllThreads: () => Promise<void>;
}

/**
 * Default title generator
 */
const defaultGenerateTitle = (firstMessage: string): string => {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 30) return trimmed;
  return trimmed.substring(0, 30).trim() + '...';
};

/**
 * Hook for managing thread list with localStorage and optional API support
 */
export function useThreadListManager(options: UseThreadListManagerOptions = {}): UseThreadListManagerResult {
  const {
    apiUrl,
    headers,
    enableLocalStorage = true,
    storageKey = 'geui-threads',
    maxThreads = 50,
    autoGenerateTitles = true,
    generateTitle = defaultGenerateTitle,
  } = options;

  // State
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for thread data
  const threadsDataRef = useRef<Map<string, Thread>>(new Map());
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
  const saveToLocalStorage = useCallback(() => {
    if (!enableLocalStorage) return;

    try {
      const data = {
        threads: Array.from(threadsDataRef.current.entries()).map(([id, thread]) => [id, {
          ...thread,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
        }]),
        activeThreadId,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save threads to localStorage:', err);
    }
  }, [enableLocalStorage, storageKey, activeThreadId]);

  const loadFromLocalStorage = useCallback((): { threads: Thread[]; activeId: string | null } => {
    if (!enableLocalStorage) return { threads: [], activeId: null };

    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return { threads: [], activeId: null };

      const parsed = JSON.parse(data);
      const threads = (parsed.threads as [string, any][]).map(([id, thread]) => ({
        ...thread,
        id,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
      })) as Thread[];

      return { threads, activeId: parsed.activeThreadId };
    } catch (err) {
      console.warn('Failed to load threads from localStorage:', err);
      return { threads: [], activeId: null };
    }
  }, [enableLocalStorage, storageKey]);

  // Load threads on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadThreads = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (apiUrl) {
          // Load from API
          const data = await fetchFromAPI('');
          const threads = data.threads || data;
          
          // Convert to Thread objects
          const threadObjects = threads.map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt || t.created_at),
            updatedAt: new Date(t.updatedAt || t.updated_at),
          })) as Thread[];

          // Update internal storage
          threadsDataRef.current.clear();
          threadObjects.forEach(thread => {
            threadsDataRef.current.set(thread.id, thread);
          });

          // Convert to summaries
          const summaries = threadObjects.map(t => ({
            id: t.id,
            title: t.title,
            lastMessage: t.lastMessage || '',
            updatedAt: t.updatedAt,
            messageCount: t.messageCount || 0,
            isActive: t.isActive || false,
          }));

          setThreads(summaries);
          
          // Set active thread if provided by API
          if (data.activeThreadId) {
            setActiveThreadId(data.activeThreadId);
          }
        } else {
          // Load from localStorage
          const { threads: localThreads, activeId } = loadFromLocalStorage();
          
          threadsDataRef.current.clear();
          localThreads.forEach(thread => {
            threadsDataRef.current.set(thread.id, thread);
          });

          const summaries = localThreads.map(t => ({
            id: t.id,
            title: t.title,
            lastMessage: t.lastMessage || '',
            updatedAt: t.updatedAt,
            messageCount: t.messageCount || 0,
            isActive: t.isActive || false,
          }));

          setThreads(summaries);
          setActiveThreadId(activeId);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load threads'));
      } finally {
        setIsLoading(false);
      }
    };

    loadThreads();
  }, [apiUrl, fetchFromAPI, loadFromLocalStorage]);

  // Create thread
  const createThread = useCallback(async (title?: string): Promise<Thread> => {
    setError(null);

    try {
      let newThread: Thread;

      if (apiUrl) {
        // Create via API
        const response = await fetchFromAPI('', {
          method: 'POST',
          body: JSON.stringify({ title: title || 'New Conversation' }),
        });

        newThread = {
          ...response,
          createdAt: new Date(response.createdAt || response.created_at),
          updatedAt: new Date(response.updatedAt || response.updated_at),
        };
      } else {
        // Create locally
        const threadId = crypto.randomUUID();
        const now = new Date();

        newThread = {
          id: threadId,
          title: title || 'New Conversation',
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
          lastMessage: '',
          isActive: true,
        };
      }

      // Update internal storage
      threadsDataRef.current.set(newThread.id, newThread);

      // Create summary
      const newSummary: ThreadSummary = {
        id: newThread.id,
        title: newThread.title,
        lastMessage: '',
        updatedAt: newThread.updatedAt,
        messageCount: 0,
        isActive: true,
      };

      // Update state
      const updatedThreads = threads.map(t => ({ ...t, isActive: false }));
      updatedThreads.unshift(newSummary);

      // Limit threads
      if (updatedThreads.length > maxThreads) {
        const removed = updatedThreads.splice(maxThreads);
        removed.forEach(t => threadsDataRef.current.delete(t.id));
      }

      setThreads(updatedThreads);
      setActiveThreadId(newThread.id);

      // Save to localStorage
      if (enableLocalStorage && !apiUrl) {
        saveToLocalStorage();
      }

      return newThread;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create thread');
      setError(error);
      throw error;
    }
  }, [apiUrl, fetchFromAPI, threads, maxThreads, enableLocalStorage, saveToLocalStorage]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    setError(null);

    try {
      if (apiUrl) {
        // Delete via API
        await fetchFromAPI(`/${threadId}`, { method: 'DELETE' });
      }

      // Update internal storage
      threadsDataRef.current.delete(threadId);

      // Update state
      const updatedThreads = threads.filter(t => t.id !== threadId);
      
      // If deleted thread was active, select first available
      let newActiveId = activeThreadId;
      if (activeThreadId === threadId) {
        newActiveId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
        if (newActiveId) {
          updatedThreads[0].isActive = true;
        }
      }

      setThreads(updatedThreads);
      setActiveThreadId(newActiveId);

      // Save to localStorage
      if (enableLocalStorage && !apiUrl) {
        saveToLocalStorage();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete thread');
      setError(error);
      throw error;
    }
  }, [apiUrl, fetchFromAPI, threads, activeThreadId, enableLocalStorage, saveToLocalStorage]);

  // Rename thread
  const renameThread = useCallback(async (threadId: string, newTitle: string): Promise<void> => {
    setError(null);

    try {
      if (apiUrl) {
        // Update via API
        await fetchFromAPI(`/${threadId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: newTitle }),
        });
      }

      // Update internal storage
      const thread = threadsDataRef.current.get(threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }

      const updatedThread = {
        ...thread,
        title: newTitle,
        updatedAt: new Date(),
      };
      threadsDataRef.current.set(threadId, updatedThread);

      // Update state
      const updatedThreads = threads.map(t =>
        t.id === threadId
          ? { ...t, title: newTitle, updatedAt: updatedThread.updatedAt }
          : t
      );

      setThreads(updatedThreads);

      // Save to localStorage
      if (enableLocalStorage && !apiUrl) {
        saveToLocalStorage();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to rename thread');
      setError(error);
      throw error;
    }
  }, [apiUrl, fetchFromAPI, threads, enableLocalStorage, saveToLocalStorage]);

  // Set active thread
  const setActiveThread = useCallback((threadId: string) => {
    if (threadId === activeThreadId) return;

    const updatedThreads = threads.map(t => ({
      ...t,
      isActive: t.id === threadId,
    }));

    setThreads(updatedThreads);
    setActiveThreadId(threadId);

    // Update internal storage
    threadsDataRef.current.forEach((thread, id) => {
      thread.isActive = id === threadId;
    });

    // Save to localStorage
    if (enableLocalStorage && !apiUrl) {
      saveToLocalStorage();
    }
  }, [threads, activeThreadId, enableLocalStorage, apiUrl, saveToLocalStorage]);

  // Refresh thread list
  const refreshThreadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (apiUrl) {
        // Refresh from API
        const data = await fetchFromAPI('');
        const threads = data.threads || data;

        // Update internal storage
        threadsDataRef.current.clear();
        threads.forEach((t: any) => {
          const thread = {
            ...t,
            createdAt: new Date(t.createdAt || t.created_at),
            updatedAt: new Date(t.updatedAt || t.updated_at),
          };
          threadsDataRef.current.set(thread.id, thread);
        });

        // Convert to summaries
        const summaries = threads.map((t: any) => ({
          id: t.id,
          title: t.title,
          lastMessage: t.lastMessage || '',
          updatedAt: new Date(t.updatedAt || t.updated_at),
          messageCount: t.messageCount || 0,
          isActive: t.id === activeThreadId,
        }));

        setThreads(summaries);
      } else {
        // Refresh from localStorage
        const { threads: localThreads } = loadFromLocalStorage();
        
        threadsDataRef.current.clear();
        localThreads.forEach(thread => {
          threadsDataRef.current.set(thread.id, thread);
        });

        const summaries = localThreads.map(t => ({
          id: t.id,
          title: t.title,
          lastMessage: t.lastMessage || '',
          updatedAt: t.updatedAt,
          messageCount: t.messageCount || 0,
          isActive: t.id === activeThreadId,
        }));

        setThreads(summaries);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh threads'));
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, fetchFromAPI, activeThreadId, loadFromLocalStorage]);

  // Get thread by ID
  const getThread = useCallback((threadId: string): Thread | null => {
    return threadsDataRef.current.get(threadId) || null;
  }, []);

  // Clear all threads
  const clearAllThreads = useCallback(async () => {
    setError(null);

    try {
      if (apiUrl) {
        // Clear via API (if supported)
        await fetchFromAPI('/clear', { method: 'POST' });
      }

      // Clear internal storage
      threadsDataRef.current.clear();
      setThreads([]);
      setActiveThreadId(null);

      // Clear localStorage
      if (enableLocalStorage) {
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear threads');
      setError(error);
      throw error;
    }
  }, [apiUrl, fetchFromAPI, enableLocalStorage, storageKey]);

  return {
    threads,
    activeThreadId,
    isLoading,
    error,
    createThread,
    deleteThread,
    renameThread,
    setActiveThread,
    refreshThreadList,
    getThread,
    clearAllThreads,
  };
}