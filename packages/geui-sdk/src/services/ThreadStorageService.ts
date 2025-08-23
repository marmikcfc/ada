/**
 * ThreadStorageService - Abstraction layer for thread storage
 * 
 * Provides a unified interface for thread storage that can be backed by
 * localStorage, backend API, or both (hybrid mode).
 */

import { v4 as uuidv4 } from 'uuid';
import type { Thread, Message, ThreadExportData } from '../types';
import { ThreadBackendService } from './ThreadBackendService';

/**
 * Common interface for all storage adapters
 */
export interface ThreadStorageAdapter {
  /** Load all threads */
  loadThreads(): Promise<Thread[]>;
  
  /** Load a specific thread */
  loadThread(threadId: string): Promise<Thread | null>;
  
  /** Save/update a thread */
  saveThread(thread: Thread): Promise<Thread>;
  
  /** Create a new thread */
  createThread(title?: string): Promise<Thread>;
  
  /** Delete a thread */
  deleteThread(threadId: string): Promise<void>;
  
  /** Rename a thread */
  renameThread(threadId: string, newTitle: string): Promise<Thread>;
  
  /** Load messages for a thread */
  loadMessages(threadId: string): Promise<Message[]>;
  
  /** Save messages for a thread */
  saveMessages(threadId: string, messages: Message[]): Promise<void>;
  
  /** Clear all threads and messages */
  clearAll(): Promise<void>;
  
  /** Check if adapter is available/connected */
  isAvailable(): Promise<boolean>;
  
  /** Cleanup resources */
  destroy(): void;
}

/**
 * LocalStorage adapter - stores threads in browser localStorage
 */
export class LocalStorageAdapter implements ThreadStorageAdapter {
  private storageKey: string;
  
  constructor(storageKey = 'geui-threads') {
    this.storageKey = storageKey;
  }
  
  async loadThreads(): Promise<Thread[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      if (!parsed.threads) return [];
      
      return Object.values(parsed.threads).map((threadData: any) => ({
        id: threadData.id,
        title: threadData.title,
        createdAt: new Date(threadData.createdAt),
        updatedAt: new Date(threadData.updatedAt),
        messageCount: threadData.messageCount || 0,
        lastMessage: threadData.lastMessage,
        isActive: threadData.id === parsed.activeThreadId
      }));
    } catch (error) {
      console.error('Failed to load threads from localStorage:', error);
      return [];
    }
  }
  
  async loadThread(threadId: string): Promise<Thread | null> {
    const threads = await this.loadThreads();
    return threads.find(t => t.id === threadId) || null;
  }
  
  async saveThread(thread: Thread): Promise<Thread> {
    try {
      const data = this.getStorageData();
      
      data.threads[thread.id] = {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messageCount: thread.messageCount,
        lastMessage: thread.lastMessage,
        messages: data.threads[thread.id]?.messages || []
      };
      
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      
      return thread;
    } catch (error) {
      console.error('Failed to save thread to localStorage:', error);
      throw error;
    }
  }
  
  async createThread(title = 'New Conversation'): Promise<Thread> {
    const threadId = uuidv4();
    const now = new Date();
    
    const thread: Thread = {
      id: threadId,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    
    return this.saveThread(thread);
  }
  
  async deleteThread(threadId: string): Promise<void> {
    try {
      const data = this.getStorageData();
      delete data.threads[threadId];
      
      // Update active thread if needed
      if (data.activeThreadId === threadId) {
        const remainingThreads = Object.keys(data.threads);
        data.activeThreadId = remainingThreads.length > 0 ? remainingThreads[0] : null;
      }
      
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to delete thread from localStorage:', error);
      throw error;
    }
  }
  
  async renameThread(threadId: string, newTitle: string): Promise<Thread> {
    const thread = await this.loadThread(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }
    
    thread.title = newTitle;
    thread.updatedAt = new Date();
    
    return this.saveThread(thread);
  }
  
  async loadMessages(threadId: string): Promise<Message[]> {
    try {
      const data = this.getStorageData();
      const threadData = data.threads[threadId];
      
      if (!threadData || !threadData.messages) {
        return [];
      }
      
      return threadData.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load messages from localStorage:', error);
      return [];
    }
  }
  
  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    try {
      const data = this.getStorageData();
      
      if (!data.threads[threadId]) {
        throw new Error(`Thread ${threadId} not found`);
      }
      
      data.threads[threadId].messages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      
      data.threads[threadId].messageCount = messages.length;
      data.threads[threadId].updatedAt = new Date().toISOString();
      
      // Update last message
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        data.threads[threadId].lastMessage = lastMsg.content?.substring(0, 100);
      }
      
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
      throw error;
    }
  }
  
  async clearAll(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = `${this.storageKey}-test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  destroy(): void {
    // No cleanup needed for localStorage
  }
  
  /**
   * Export all threads for migration
   */
  async exportThreads(): Promise<ThreadExportData[]> {
    const threads = await this.loadThreads();
    const exports: ThreadExportData[] = [];
    
    for (const thread of threads) {
      const messages = await this.loadMessages(thread.id);
      exports.push({
        id: thread.id,
        title: thread.title,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          c1Content: m.c1Content,
          timestamp: m.timestamp.toISOString()
        })),
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString()
      });
    }
    
    return exports;
  }
  
  private getStorageData(): any {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return {
          version: 1,
          threads: {},
          activeThreadId: null,
          lastUpdated: new Date().toISOString()
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        version: 1,
        threads: {},
        activeThreadId: null,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

/**
 * Backend API adapter - stores threads on the server
 */
export class BackendStorageAdapter implements ThreadStorageAdapter {
  constructor(private backendService: ThreadBackendService) {}
  
  async loadThreads(): Promise<Thread[]> {
    return this.backendService.getThreads();
  }
  
  async loadThread(threadId: string): Promise<Thread | null> {
    try {
      return await this.backendService.getThread(threadId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  async saveThread(thread: Thread): Promise<Thread> {
    return this.backendService.updateThread(thread.id, thread);
  }
  
  async createThread(title?: string): Promise<Thread> {
    return this.backendService.createThread(title);
  }
  
  async deleteThread(threadId: string): Promise<void> {
    return this.backendService.deleteThread(threadId);
  }
  
  async renameThread(threadId: string, newTitle: string): Promise<Thread> {
    return this.backendService.updateThread(threadId, { title: newTitle });
  }
  
  async loadMessages(threadId: string): Promise<Message[]> {
    return this.backendService.getMessages(threadId);
  }
  
  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    // Backend handles message saving through WebSocket
    // This is a no-op for backend adapter as messages are saved in real-time
    console.log(`Messages for thread ${threadId} are managed by backend`);
  }
  
  async clearAll(): Promise<void> {
    // Delete all threads
    const threads = await this.loadThreads();
    await Promise.all(threads.map(t => this.deleteThread(t.id)));
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Try to fetch threads to check if backend is available
      await this.backendService.getThreads(1, 1);
      return true;
    } catch {
      return false;
    }
  }
  
  destroy(): void {
    this.backendService.destroy();
  }
}

/**
 * Hybrid adapter - uses both local and backend storage
 * Writes to both, reads from backend with local fallback
 */
export class HybridStorageAdapter implements ThreadStorageAdapter {
  private syncPromise: Promise<void> | null = null;
  
  constructor(
    private localAdapter: LocalStorageAdapter,
    private backendAdapter: BackendStorageAdapter,
    private preferBackend = true
  ) {}
  
  async loadThreads(): Promise<Thread[]> {
    if (this.preferBackend) {
      try {
        const threads = await this.backendAdapter.loadThreads();
        // Sync to local in background
        this.syncToLocal(threads);
        return threads;
      } catch (error) {
        console.warn('Failed to load from backend, falling back to local:', error);
        return this.localAdapter.loadThreads();
      }
    } else {
      const localThreads = await this.localAdapter.loadThreads();
      // Try to sync with backend in background
      this.syncToBackend(localThreads);
      return localThreads;
    }
  }
  
  async loadThread(threadId: string): Promise<Thread | null> {
    if (this.preferBackend) {
      try {
        return await this.backendAdapter.loadThread(threadId);
      } catch {
        return this.localAdapter.loadThread(threadId);
      }
    } else {
      const local = await this.localAdapter.loadThread(threadId);
      if (local) return local;
      return this.backendAdapter.loadThread(threadId);
    }
  }
  
  async saveThread(thread: Thread): Promise<Thread> {
    // Save to both storages
    const [localResult, backendResult] = await Promise.allSettled([
      this.localAdapter.saveThread(thread),
      this.backendAdapter.saveThread(thread)
    ]);
    
    if (backendResult.status === 'fulfilled') {
      return backendResult.value;
    } else if (localResult.status === 'fulfilled') {
      return localResult.value;
    } else {
      throw new Error('Failed to save thread to both local and backend storage');
    }
  }
  
  async createThread(title?: string): Promise<Thread> {
    try {
      // Try backend first
      const thread = await this.backendAdapter.createThread(title);
      // Save to local as well
      await this.localAdapter.saveThread(thread);
      return thread;
    } catch (error) {
      console.warn('Failed to create thread on backend, using local:', error);
      return this.localAdapter.createThread(title);
    }
  }
  
  async deleteThread(threadId: string): Promise<void> {
    // Delete from both
    await Promise.allSettled([
      this.localAdapter.deleteThread(threadId),
      this.backendAdapter.deleteThread(threadId)
    ]);
  }
  
  async renameThread(threadId: string, newTitle: string): Promise<Thread> {
    const [localResult, backendResult] = await Promise.allSettled([
      this.localAdapter.renameThread(threadId, newTitle),
      this.backendAdapter.renameThread(threadId, newTitle)
    ]);
    
    if (backendResult.status === 'fulfilled') {
      return backendResult.value;
    } else if (localResult.status === 'fulfilled') {
      return localResult.value;
    } else {
      throw new Error('Failed to rename thread');
    }
  }
  
  async loadMessages(threadId: string): Promise<Message[]> {
    if (this.preferBackend) {
      try {
        const messages = await this.backendAdapter.loadMessages(threadId);
        // Sync to local in background
        this.localAdapter.saveMessages(threadId, messages);
        return messages;
      } catch {
        return this.localAdapter.loadMessages(threadId);
      }
    } else {
      return this.localAdapter.loadMessages(threadId);
    }
  }
  
  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    // Save to both
    await Promise.allSettled([
      this.localAdapter.saveMessages(threadId, messages),
      this.backendAdapter.saveMessages(threadId, messages)
    ]);
  }
  
  async clearAll(): Promise<void> {
    await Promise.allSettled([
      this.localAdapter.clearAll(),
      this.backendAdapter.clearAll()
    ]);
  }
  
  async isAvailable(): Promise<boolean> {
    const [localAvailable, backendAvailable] = await Promise.all([
      this.localAdapter.isAvailable(),
      this.backendAdapter.isAvailable()
    ]);
    
    return localAvailable || backendAvailable;
  }
  
  destroy(): void {
    this.localAdapter.destroy();
    this.backendAdapter.destroy();
  }
  
  /**
   * Sync local threads to backend
   */
  private async syncToBackend(threads: Thread[]): Promise<void> {
    if (this.syncPromise) return;
    
    this.syncPromise = (async () => {
      try {
        for (const thread of threads) {
          try {
            await this.backendAdapter.saveThread(thread);
          } catch (error) {
            console.warn(`Failed to sync thread ${thread.id} to backend:`, error);
          }
        }
      } finally {
        this.syncPromise = null;
      }
    })();
    
    await this.syncPromise;
  }
  
  /**
   * Sync backend threads to local
   */
  private async syncToLocal(threads: Thread[]): Promise<void> {
    // Run in background, don't await
    Promise.all(
      threads.map(thread => 
        this.localAdapter.saveThread(thread).catch(err => 
          console.warn(`Failed to sync thread ${thread.id} to local:`, err)
        )
      )
    );
  }
}