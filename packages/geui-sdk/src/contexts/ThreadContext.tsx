import React, { createContext, useContext, ReactNode } from 'react';
import type { Thread, Message } from '../types';

/**
 * Thread context value interface
 */
interface ThreadContextValue {
  // Thread state
  threads: Thread[];
  activeThreadId: string | null;
  currentThread: Thread | null;
  isCreatingThread: boolean;
  isLoadingThreads: boolean;
  isSwitchingThread: boolean;
  threadError: Error | null;
  
  // Client state (when using threaded client)
  messages: Message[];
  connectionState: string;
  voiceState: string;
  isLoading: boolean;
  isEnhancing: boolean;
  streamingContent: string | null;
  streamingContentType: 'text' | 'c1' | 'html' | null;
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  
  // Thread actions
  createThread: (initialMessage?: string) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, newTitle: string) => void;
  clearAllThreads: () => void;
  refreshThreads: () => void;
  
  // Client actions
  sendText: (text: string) => void;
  sendC1Action: (action: any) => void;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  clearMessages: () => void;
  
  // Utility methods
  getThread: (threadId: string) => Thread | undefined;
  isReadyForVoice: () => boolean;
}

// Create the context
const ThreadContext = createContext<ThreadContextValue | null>(null);

/**
 * Thread context provider props
 */
interface ThreadProviderProps {
  value: ThreadContextValue;
  children: ReactNode;
}

/**
 * Thread context provider component
 */
export const ThreadProvider: React.FC<ThreadProviderProps> = ({ value, children }) => {
  return (
    <ThreadContext.Provider value={value}>
      {children}
    </ThreadContext.Provider>
  );
};

/**
 * Hook to use the thread context
 */
export const useThreadContext = () => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error('useThreadContext must be used within a ThreadProvider');
  }
  return context;
};

/**
 * Optional hook that returns null if not in a ThreadProvider
 */
export const useOptionalThreadContext = () => {
  return useContext(ThreadContext);
};