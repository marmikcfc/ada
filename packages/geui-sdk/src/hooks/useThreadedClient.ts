import { useCallback, useEffect, useRef } from 'react';
import { useThreadListManager, UseThreadListManagerOptions } from './useThreadListManager';
import { useThreadManager as useThreadManagerNew, UseThreadManagerOptions as UseThreadManagerNewOptions } from './useThreadManager';

/**
 * Options for the useThreadedClient hook
 */
export interface UseThreadedClientOptions {
  /** Options for thread list management */
  threadListOptions?: UseThreadListManagerOptions;
  
  /** Options for thread content management */
  threadOptions?: Omit<UseThreadManagerNewOptions, 'threadId'>;
}

/**
 * Combined hook that integrates thread list and thread content management
 * with the GeUI client for a complete threaded chat experience
 */
export function useThreadedClient(options: UseThreadedClientOptions = {}) {
  const {
    threadListOptions = {},
    threadOptions = {}
  } = options;

  // Initialize thread list manager
  const threadList = useThreadListManager(threadListOptions);
  
  // Initialize thread manager for active thread
  const thread = useThreadManagerNew({
    ...threadOptions,
    threadId: threadList.activeThreadId || '',
    // Don't auto-connect if no active thread
    autoConnect: threadList.activeThreadId ? threadOptions.autoConnect ?? true : false
  });

  // Track if we're switching threads to avoid duplicate saves
  const isSwitchingRef = useRef(false);

  // Enhanced thread creation
  const createThread = useCallback(async (title?: string) => {
    try {
      const newThread = await threadList.createThread(title);
      
      // Clear messages in thread manager
      thread.clearMessages();
      
      return newThread;
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  }, [threadList, thread]);

  // Enhanced thread switching
  const switchThread = useCallback(async (threadId: string) => {
    if (threadId === threadList.activeThreadId) return;

    try {
      isSwitchingRef.current = true;

      // Save current thread's messages before switching
      if (threadList.activeThreadId) {
        await thread.saveMessages();
      }

      // Switch thread in list manager
      threadList.setActiveThread(threadId);

      // Thread manager will automatically switch due to threadId change
      // and load messages for the new thread
    } catch (error) {
      console.error('Failed to switch thread:', error);
      throw error;
    } finally {
      // Reset switching flag after a delay
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 300);
    }
  }, [threadList, thread]);

  // Enhanced thread deletion
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await threadList.deleteThread(threadId);
      
      // If we deleted the active thread, clear messages
      if (threadId === threadList.activeThreadId) {
        thread.clearMessages();
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
      throw error;
    }
  }, [threadList, thread]);

  // Update thread info when messages change
  useEffect(() => {
    if (!threadList.activeThreadId || isSwitchingRef.current) return;
    if (thread.messages.length === 0) return;

    // Get the last message
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (lastMessage && lastMessage.content) {
      // Update thread summary in the list
      const activeThread = threadList.getThread(threadList.activeThreadId);
      if (activeThread && activeThread.lastMessage !== lastMessage.content) {
        threadList.renameThread(
          threadList.activeThreadId,
          activeThread.title // Keep the same title, just update metadata
        ).catch(console.error);
      }
    }
  }, [thread.messages, threadList]);

  // Combine thread and client functionality
  return {
    // Thread list state
    threads: threadList.threads,
    activeThreadId: threadList.activeThreadId,
    isLoadingThreads: threadList.isLoading,
    threadListError: threadList.error,

    // Thread content state
    messages: thread.messages,
    connectionState: thread.connectionState,
    isLoadingMessages: thread.isLoading,
    threadError: thread.error,

    // Thread list actions
    createThread,
    deleteThread,
    renameThread: threadList.renameThread,
    switchThread,
    refreshThreadList: threadList.refreshThreadList,
    clearAllThreads: threadList.clearAllThreads,

    // Thread content actions
    sendMessage: thread.sendMessage,
    sendText: thread.sendMessage, // Alias for compatibility with GeUI
    loadMessages: thread.loadMessages,
    clearMessages: thread.clearMessages,
    connect: thread.connect,
    disconnect: thread.disconnect,

    // Utility methods
    getThread: threadList.getThread,
    getConnectionService: thread.getConnectionService,

    // Direct access to underlying hooks if needed
    threadList,
    thread
  };
}