/**
 * Message Storage Utility for GeUI SDK
 * 
 * Provides localStorage-based persistence for chat messages organized by thread.
 * Handles serialization/deserialization and manages storage lifecycle.
 */

import type { Message, ThreadMessageStorage } from '../types';

export class MessageStorage {
  private storageKeyPrefix: string;
  
  constructor(keyPrefix = 'geui-messages') {
    this.storageKeyPrefix = keyPrefix;
  }
  
  /**
   * Save messages for a specific thread
   */
  saveMessages(threadId: string, messages: Message[]): void {
    if (!threadId || !messages) {
      console.warn('MessageStorage: Invalid threadId or messages');
      return;
    }
    
    const key = `${this.storageKeyPrefix}-${threadId}`;
    const data: ThreadMessageStorage = {
      threadId,
      messages,
      lastSyncedAt: new Date(),
      version: 1
    };
    
    try {
      // Serialize dates properly
      const serialized = JSON.stringify(data, (_, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      
      localStorage.setItem(key, serialized);
      console.log(`MessageStorage: Saved ${messages.length} messages for thread ${threadId}`);
    } catch (error) {
      console.error('MessageStorage: Failed to save messages', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('MessageStorage: localStorage quota exceeded');
        // Could implement cleanup of old messages here
      }
    }
  }
  
  /**
   * Load messages for a specific thread
   */
  loadMessages(threadId: string): Message[] {
    if (!threadId) {
      return [];
    }
    
    const key = `${this.storageKeyPrefix}-${threadId}`;
    
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        return [];
      }
      
      const parsed: ThreadMessageStorage = JSON.parse(data);
      
      // Convert date strings back to Date objects
      const messages = parsed.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      // console.log(`MessageStorage: Loaded ${messages.length} messages for thread ${threadId}`);
      return messages;
    } catch (error) {
      console.error('MessageStorage: Failed to load messages', error);
      return [];
    }
  }
  
  /**
   * Delete messages for a specific thread
   */
  deleteMessages(threadId: string): void {
    if (!threadId) {
      return;
    }
    
    const key = `${this.storageKeyPrefix}-${threadId}`;
    
    try {
      localStorage.removeItem(key);
      console.log(`MessageStorage: Deleted messages for thread ${threadId}`);
    } catch (error) {
      console.error('MessageStorage: Failed to delete messages', error);
    }
  }
  
  /**
   * Get all thread messages (useful for debugging or export)
   */
  getAllThreadMessages(): Map<string, Message[]> {
    const allMessages = new Map<string, Message[]>();
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix)) {
          const threadId = key.replace(`${this.storageKeyPrefix}-`, '');
          const messages = this.loadMessages(threadId);
          if (messages.length > 0) {
            allMessages.set(threadId, messages);
          }
        }
      }
      
      console.log(`MessageStorage: Found messages for ${allMessages.size} threads`);
    } catch (error) {
      console.error('MessageStorage: Failed to get all messages', error);
    }
    
    return allMessages;
  }
  
  /**
   * Clear all message storage
   */
  clearAllMessages(): void {
    const keysToRemove: string[] = [];
    
    try {
      // Collect keys first to avoid modifying localStorage while iterating
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove collected keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`MessageStorage: Cleared messages for ${keysToRemove.length} threads`);
    } catch (error) {
      console.error('MessageStorage: Failed to clear all messages', error);
    }
  }
  
  /**
   * Get storage info (size, thread count)
   */
  getStorageInfo(): { threadCount: number; totalMessages: number; estimatedSize: number } {
    let threadCount = 0;
    let totalMessages = 0;
    let estimatedSize = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix)) {
          threadCount++;
          const data = localStorage.getItem(key);
          if (data) {
            estimatedSize += data.length * 2; // Rough estimate (2 bytes per character)
            try {
              const parsed: ThreadMessageStorage = JSON.parse(data);
              totalMessages += parsed.messages.length;
            } catch {
              // Ignore parse errors for size calculation
            }
          }
        }
      }
    } catch (error) {
      console.error('MessageStorage: Failed to get storage info', error);
    }
    
    return {
      threadCount,
      totalMessages,
      estimatedSize
    };
  }
  
  /**
   * Check if thread has messages
   */
  hasMessages(threadId: string): boolean {
    if (!threadId) {
      return false;
    }
    
    const key = `${this.storageKeyPrefix}-${threadId}`;
    return localStorage.getItem(key) !== null;
  }
}