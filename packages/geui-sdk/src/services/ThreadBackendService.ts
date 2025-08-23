/**
 * ThreadBackendService - Handles all backend API interactions for thread management
 * 
 * This service provides a clean interface for communicating with the backend
 * thread management API, including retry logic, caching, and error handling.
 */

import type {
  Thread,
  Message,
  AssistantMessage,
  UserMessage,
  SystemMessage,
  ThreadBackendConfig,
  ThreadApiResponse,
  MessageApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  ThreadExportData,
  MigrationResult
} from '../types';

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class ThreadBackendService {
  private baseUrl: string;
  private headers: Record<string, string>;
  private config: ThreadBackendConfig;
  private cache: Map<string, CachedData<any>>;
  private abortControllers: Map<string, AbortController>;

  constructor(config: ThreadBackendConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers
    };
    this.cache = new Map();
    this.abortControllers = new Map();

    // Start polling if enabled (deprecated - will be removed in v2.0)
    if (config.polling?.enabled) {
      console.warn(
        '[ThreadBackendService] Polling is enabled but deprecated. ' +
        'It will be removed in v2.0. Please migrate to WebSocket-based thread events.'
      );
      this.startPolling();
    }
  }

  /**
   * Get list of threads with pagination
   */
  async getThreads(page = 1, pageSize = 20, connectionId?: string): Promise<Thread[]> {
    const cacheKey = this.getCacheKey('threads', { page, pageSize, connectionId });
    const cached = this.getFromCache<PaginatedResponse<ThreadApiResponse>>(cacheKey);
    if (cached) {
      return cached.threads.map(this.transformApiThread);
    }

    const endpoint = this.config.endpoints?.threads || '/api/threads/list';
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((page - 1) * pageSize).toString()
    });
    if (connectionId) {
      params.append('connection_id', connectionId);
    }
    const url = `${this.baseUrl}${endpoint}?${params.toString()}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.headers
    });

    const data: any = await response.json();
    this.setCache(cacheKey, data);
    
    return data.threads.map(this.transformApiThread);
  }

  /**
   * Get a specific thread by ID
   */
  async getThread(threadId: string, includeMessages = false): Promise<Thread> {
    const cacheKey = this.getCacheKey('thread', { threadId, includeMessages });
    const cached = this.getFromCache<ThreadApiResponse>(cacheKey);
    if (cached) {
      return this.transformApiThread(cached);
    }

    // Use the thread ID as-is (it should already include the connection prefix from backend)
    const endpoint = this.config.endpoints?.threadDetail || `/api/threads/${encodeURIComponent(threadId)}`;
    // Always fetch all messages when loading a thread, not just 1
    const messageLimit = 50;
    const url = `${this.baseUrl}${endpoint.replace('{id}', encodeURIComponent(threadId))}?message_limit=${messageLimit}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.headers
    });

    const data: ThreadApiResponse = await response.json();
    this.setCache(cacheKey, data);
    
    return this.transformApiThread(data);
  }

  /**
   * Create a new thread
   */
  async createThread(title?: string, metadata?: Record<string, any>, connectionId?: string): Promise<Thread> {
    const endpoint = this.config.endpoints?.create || '/api/threads/create';
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ 
        title, 
        thread_id: metadata?.thread_id, // Pass the pre-generated thread ID
        connection_id: connectionId || metadata?.connection_id,
        session_id: metadata?.session_id,
        tags: metadata?.tags || [],
        initial_message: metadata?.initial_message
      })
    });

    const data: ThreadApiResponse = await response.json();
    this.invalidateCache('threads'); // Invalidate thread list cache
    
    return this.transformApiThread(data);
  }

  /**
   * Update thread (rename, archive, etc.)
   */
  async updateThread(threadId: string, updates: Partial<Thread>): Promise<Thread> {
    const endpoint = this.config.endpoints?.update || `/api/threads/${encodeURIComponent(threadId)}`;
    const url = `${this.baseUrl}${endpoint.replace('{id}', encodeURIComponent(threadId))}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        title: updates.title,
        archived: updates.isActive === false,
        tags: updates.messagesStorageKey ? [updates.messagesStorageKey] : undefined
      })
    });

    const data: ThreadApiResponse = await response.json();
    this.invalidateCache('threads');
    this.invalidateCache('thread', threadId);
    
    return this.transformApiThread(data);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    const endpoint = this.config.endpoints?.delete || `/api/threads/${encodeURIComponent(threadId)}`;
    const url = `${this.baseUrl}${endpoint.replace('{id}', encodeURIComponent(threadId))}`;
    
    await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: this.headers
    });

    this.invalidateCache('threads');
    this.invalidateCache('thread', threadId);
    this.invalidateCache('messages', threadId);
  }

  /**
   * Get messages for a thread
   */
  async getMessages(threadId: string, page = 1, pageSize = 50): Promise<Message[]> {
    const cacheKey = this.getCacheKey('messages', { threadId, page, pageSize });
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) {
      return cached.messages.map(this.transformApiMessage);
    }

    const endpoint = this.config.endpoints?.messages || `/api/threads/${encodeURIComponent(threadId)}/messages`;
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((page - 1) * pageSize).toString()
    });
    const url = `${this.baseUrl}${endpoint.replace('{id}', encodeURIComponent(threadId))}?${params.toString()}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.headers
    });

    const data: any = await response.json();
    this.setCache(cacheKey, data);
    
    return data.messages.map(this.transformApiMessage);
  }

  /**
   * Search threads
   */
  async searchThreads(query: string, connectionId?: string): Promise<Thread[]> {
    const endpoint = this.config.endpoints?.search || '/api/threads/search';
    const params = new URLSearchParams({ query });
    if (connectionId) {
      params.append('connection_id', connectionId);
    }
    const url = `${this.baseUrl}${endpoint}?${params.toString()}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.headers
    });

    const data: any = await response.json();
    return data.threads.map(this.transformApiThread);
  }

  /**
   * Import threads from localStorage (migration)
   */
  async importThreads(threads: ThreadExportData[]): Promise<MigrationResult> {
    const endpoint = this.config.endpoints?.import || '/api/threads/import';
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ threads })
    });

    const result: MigrationResult = await response.json();
    this.invalidateCache('threads');
    
    return result;
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    const maxAttempts = this.config.retry?.maxAttempts || 3;
    const backoffMs = this.config.retry?.backoffMs || 1000;
    const exponential = this.config.retry?.exponential !== false;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Create abort controller for this request
        const abortController = new AbortController();
        const requestId = `${url}-${Date.now()}`;
        this.abortControllers.set(requestId, abortController);
        
        const response = await fetch(url, {
          ...options,
          signal: abortController.signal
        });
        
        this.abortControllers.delete(requestId);
        
        if (!response.ok) {
          await this.handleApiError(response);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Calculate delay for next retry
        if (attempt < maxAttempts - 1) {
          const delay = exponential 
            ? backoffMs * Math.pow(2, attempt)
            : backoffMs;
          
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error('Failed after max retry attempts');
  }

  /**
   * Handle API error responses
   */
  private async handleApiError(response: Response): Promise<void> {
    let errorData: ApiErrorResponse | null = null;
    
    try {
      errorData = await response.json();
    } catch {
      // Response might not be JSON
    }
    
    const error = new ApiError(
      errorData?.error?.message || `API request failed with status ${response.status}`,
      response.status,
      errorData?.error?.code,
      errorData?.error?.details
    );
    
    throw error;
  }

  /**
   * Transform API thread to SDK thread
   */
  private transformApiThread = (apiThread: ThreadApiResponse): Thread => {
    // Ensure we have a valid thread_id
    const threadId = apiThread.thread_id || apiThread.id || '';
    if (!threadId) {
      console.error('Invalid thread response - missing thread_id:', apiThread);
    }
    
    const thread: Thread = {
      id: threadId,
      title: apiThread.title || 'Untitled Thread',
      createdAt: new Date(apiThread.created_at),
      updatedAt: new Date(apiThread.last_activity || apiThread.created_at),
      messageCount: apiThread.message_count || 0,
      lastMessage: apiThread.last_message,
      isActive: !apiThread.archived,
      messagesStorageKey: apiThread.tags?.join(','),
      websocketConnectionId: apiThread.connection_id,
      voiceEnabled: false
    };
    
    // Include messages if they're present in the API response
    if (apiThread.messages) {
      thread.messages = apiThread.messages.map(this.transformApiMessage);
    }
    
    return thread;
  };

  /**
   * Transform API message to SDK message
   */
  private transformApiMessage = (apiMessage: MessageApiResponse): Message => {
    // Parse enhanced content if present
    let content = apiMessage.content;
    let contentType: 'c1' | 'html' | 'text' = 'text';
    
    try {
      if (apiMessage.content_type === 'enhanced' && content.startsWith('{')) {
        const parsed = JSON.parse(content);
        if (parsed.type === 'enhanced_response') {
          content = parsed.content;
          if (parsed.content_type === 'c1') {
            contentType = 'c1';
          } else if (parsed.content_type === 'html') {
            contentType = 'html';
          }
        }
      } else if (apiMessage.content_type === 'c1') {
        contentType = 'c1';
        // Handle C1 content - remove wrapper tags if present
        if (content.startsWith('<content>') && content.endsWith('</content>')) {
          content = content.slice(9, -10); // Remove <content> wrapper
        }
        // Also decode HTML entities that might be in the content
        const textarea = document.createElement('textarea');
        textarea.innerHTML = content;
        content = textarea.value;
      } else if (apiMessage.content_type === 'html') {
        contentType = 'html';
      }
    } catch (e) {
      // Keep original content if parsing fails
    }
    
    // Return the appropriate message type based on role
    if (apiMessage.role === 'assistant') {
      return {
        id: apiMessage.message_id || Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: content,
        contentType: contentType,
        timestamp: apiMessage.timestamp ? new Date(apiMessage.timestamp * 1000) : new Date()
      } as AssistantMessage;
    } else {
      return {
        id: apiMessage.message_id || Math.random().toString(36).substr(2, 9),
        role: apiMessage.role as 'user' | 'system',
        content: content,
        timestamp: apiMessage.timestamp ? new Date(apiMessage.timestamp * 1000) : new Date()
      } as UserMessage | SystemMessage;
    }
  };

  /**
   * Cache management
   */
  private getCacheKey(operation: string, params?: any): string {
    return `${operation}-${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.cache?.enabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.cache?.enabled) return;
    
    const ttl = this.config.cache?.ttlMs || 30000;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(prefix: string, id?: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        if (!id || key.includes(id)) {
          keysToDelete.push(key);
        }
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * @deprecated Since v1.5.0. Will be removed in v2.0.
   * Polling for real-time updates - use WebSocket thread events instead
   */
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingCallbacks: Set<(threads: Thread[]) => void> = new Set();

  /**
   * @deprecated Since v1.5.0. Will be removed in v2.0.
   * Internal polling implementation
   */
  private startPolling(): void {
    console.warn(
      '[ThreadBackendService] Polling is deprecated and will be removed in v2.0. ' +
      'Please use WebSocket events for real-time updates. ' +
      'See: https://github.com/yourorg/geui-sdk/docs/migration/polling'
    );
    
    if (this.pollingInterval) return;
    
    const intervalMs = this.config.polling?.intervalMs || 30000;
    
    this.pollingInterval = setInterval(async () => {
      try {
        const threads = await this.getThreads();
        this.pollingCallbacks.forEach(callback => callback(threads));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  /**
   * @deprecated Since v1.5.0. Will be removed in v2.0.
   * Subscribe to polling updates - use WebSocket thread events instead
   */
  onThreadsUpdate(callback: (threads: Thread[]) => void): () => void {
    console.warn(
      '[ThreadBackendService] onThreadsUpdate is deprecated and will be removed in v2.0. ' +
      'Please migrate to WebSocket-based thread events.'
    );
    
    this.pollingCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.pollingCallbacks.delete(callback);
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Stop polling (deprecated - will be removed in v2.0)
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Abort all pending requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    // Clear cache
    this.cache.clear();
    
    // Clear callbacks (deprecated - will be removed in v2.0)
    this.pollingCallbacks.clear();
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}