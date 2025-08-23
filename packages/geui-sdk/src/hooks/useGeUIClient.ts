import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionService, ConnectionEvent, ConnectionServiceOptions } from '../core/ConnectionService';
import { 
  Message, 
  ConnectionState, 
  VoiceConnectionState,
  GeUIClient,
  InteractionType,
  InteractionProcessingState,
  Thread,
  ThreadBackendConfig
} from '../types';
import { ThreadBackendService } from '../services/ThreadBackendService';

/**
 * Thread management options
 */
export interface ThreadOptions {
  enablePersistence?: boolean;
  storageKey?: string;
  maxThreads?: number;
  autoGenerateTitles?: boolean;
  generateTitle?: (firstMessage: string) => string;
}

/**
 * Options for the useGeUIClient hook
 */
export interface UseGeUIClientOptions extends ConnectionServiceOptions {
  /**
   * Initial thread ID to use
   */
  initialThreadId?: string;
  
  /**
   * Whether to automatically connect on mount
   */
  autoConnect?: boolean;
  
  /**
   * Initial messages to load (useful for restoring thread messages)
   */
  initialMessages?: Message[];
  
  /**
   * Callback when a new thread is created
   */
  onThreadCreated?: (threadId: string) => void;
  
  /**
   * Enable thread management features
   */
  enableThreads?: boolean;
  
  /**
   * Thread management options (only used when enableThreads=true)
   */
  threadOptions?: ThreadOptions;
  
  /**
   * Backend configuration for thread persistence
   * When provided, thread operations will use the backend API instead of localStorage
   */
  threadBackendConfig?: ThreadBackendConfig;
}

/**
 * Base client interface returned by useGeUIClient
 */
export interface BaseGeUIClient extends GeUIClient {
  // Additional properties beyond the GeUIClient interface
  threadId: string | undefined;
  setThreadId: (threadId: string) => void;
  isEnhancing: boolean;
  isLoading: boolean;
  isVoiceLoading: boolean;
  streamingContent: string;
  streamingContentType: 'c1' | 'html';
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  audioStream: MediaStream | null;
  sendC1Action: (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  getBackendConnectionId: () => string | null;
  isReadyForVoice: () => boolean;
}

/**
 * Client with thread management
 */
export interface ThreadedGeUIClient extends BaseGeUIClient {
  // Thread management
  threads: Thread[];
  activeThreadId: string | null;
  activeThread: Thread | null;
  isSwitchingThread: boolean;
  createThread: (title?: string) => Promise<Thread>;
  switchThread: (threadId: string) => Promise<void>;
  selectThread: (threadId: string) => Promise<void>; // Alias for switchThread
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  clearAllThreads: () => Promise<void>;
}

/**
 * Hook that provides a headless interface to the GeUI SDK
 */
export function useGeUIClient<T extends UseGeUIClientOptions>(
  options: T
): T['enableThreads'] extends true ? ThreadedGeUIClient : BaseGeUIClient {
  // Connection service instance stored in a ref to persist across renders
  const connectionServiceRef = useRef<ConnectionService | null>(null);
  
  // Track if we're currently initializing to prevent double initialization in StrictMode
  const initializingRef = useRef(false);
  
  // Thread ID
  const [threadId, setThreadIdInternal] = useState<string | undefined>(options.initialThreadId);
  
  // Custom setThreadId that also updates the connection service
  const setThreadId = useCallback((newThreadId: string) => {
    setThreadIdInternal(newThreadId);
    
    // Switch thread in connection service if it exists
    if (connectionServiceRef.current) {
      connectionServiceRef.current.switchToThread(newThreadId).catch(error => {
        console.error('Error switching thread:', error);
      });
    }
  }, []);
  
  // Message history
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  
  // Connection states
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>('disconnected');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Streaming state
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [streamingContentType, setStreamingContentType] = useState<'c1' | 'html'>('c1');
  
  // Audio stream
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Debounce clear for isVoiceLoading so banner stays visible long enough
  const voiceLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destructure only the properties from options that should trigger a re-connection
  const { webrtcURL, websocketURL, autoConnect = true } = options;

  // Effect to manage the connection lifecycle
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initializingRef.current) {
      return;
    }
    
    // Prevent creating a new service if one already exists for the same URLs
    if (connectionServiceRef.current && 
        connectionServiceRef.current.webrtcURL === webrtcURL &&
        connectionServiceRef.current.websocketURL === websocketURL) {
      return;
    }

    // If a service exists but URLs have changed, disconnect the old one first
    if (connectionServiceRef.current) {
      console.log('Cleaning up existing ConnectionService before creating new one...');
      connectionServiceRef.current.disconnect();
      connectionServiceRef.current.removeAllListeners();
      connectionServiceRef.current = null;
    }

    initializingRef.current = true;
    console.log('Initializing new ConnectionService...');
    const newService = new ConnectionService({ 
      webrtcURL, 
      websocketURL,
      mcpEndpoints: options.mcpEndpoints,
      autoReconnect: options.autoReconnect,
      reconnectInterval: options.reconnectInterval,
      maxReconnectAttempts: options.maxReconnectAttempts,
      uiFramework: options.uiFramework,
      visualizationProvider: options.visualizationProvider,
      onFormSubmit: options.onFormSubmit,
      onButtonClick: options.onButtonClick,
      onInputChange: options.onInputChange,
      onLinkClick: options.onLinkClick,
      onWebSocketConnect: options.onWebSocketConnect,
    });
    connectionServiceRef.current = newService;
    
    // Set up event listeners for the new service
    const handleStateChange = (state: ConnectionState) => setConnectionState(state);
    const handleVoiceStateChange = (state: VoiceConnectionState | string) => {
      if (state === 'user-stopped') {
        // User finished speaking – show "preparing" banner
        if (voiceLoadingTimeoutRef.current) {
          clearTimeout(voiceLoadingTimeoutRef.current);
        }
        setIsVoiceLoading(true);
      } else if (state === 'bot-started') {
        // Bot starts almost immediately – keep banner for a short time so it is visible
        if (voiceLoadingTimeoutRef.current) {
          clearTimeout(voiceLoadingTimeoutRef.current);
        }
        voiceLoadingTimeoutRef.current = setTimeout(() => {
          setIsVoiceLoading(false);
          voiceLoadingTimeoutRef.current = null;
        }, 400); // 400 ms gives React a frame to render
      } else if (typeof state === 'string' && ['connected', 'connecting', 'disconnected'].includes(state)) {
        setVoiceState(state as VoiceConnectionState);
      }
    };
    const handleMessageReceived = (message: Message) => {
      console.log('🔥 MESSAGE_RECEIVED handler called:', message);
      
      // Check if message contains a threadId and update if needed
      if ('threadId' in message && message.threadId && typeof message.threadId === 'string') {
        const currentThreadId = threadId;
        if (!currentThreadId || currentThreadId !== message.threadId) {
          console.log('📝 Updating thread ID from message:', message.threadId);
          setThreadIdInternal(message.threadId);
        }
      }
      
      setMessages(prev => {
        console.log('🔥 Previous messages:', prev);
        const newMessages = [...prev, message];
        console.log('🔥 New messages:', newMessages);
        return newMessages;
      });
      
      // Only clear loading state for assistant messages, not user messages
      // This allows "thinking" message to persist during interactions
      if (message.role === 'assistant') {
        console.log('🔄 Assistant message received, clearing loading state');
        setIsLoading(false);
        setIsEnhancing(false);
      } else {
        console.log('👤 User message received, preserving loading state');
      }
    };
    const handleTranscription = (_transcript: { text: string, final?: boolean, id?: string }) => {
      // MESSAGE_RECEIVED is already emitted by ConnectionService for the
      // final user transcription, so we no longer need to duplicate the
      // message here.  Keep this handler only for potential side-effects
      // (e.g. live transcript display in the future).
    };
    const handleStreamingStarted = (data: { id: string, content: string, contentType?: string }) => {
      setStreamingMessageId(data.id);
      setStreamingContent(data.content);
      setIsStreamingActive(true);
      // Store content type for proper rendering
      setStreamingContentType(data.contentType === 'html' ? 'html' : 'c1');
      // Enhancement (slow-path) has now produced its first token,
      // so we can hide the "Generating enhanced display…" indicator.
      setIsEnhancing(false);
    };
    const handleStreamingChunk = (data: { id: string, accumulatedContent: string, contentType?: string }) => {
      setStreamingContent(data.accumulatedContent);
      // Update content type if provided in chunk
      if (data.contentType) {
        setStreamingContentType(data.contentType === 'html' ? 'html' : 'c1');
      }
    };
    const handleStreamingDone = () => {
      // The final message is added via MESSAGE_RECEIVED, so just reset streaming state
      setStreamingMessageId(null);
      setStreamingContent('');
      setIsStreamingActive(false);
      setStreamingContentType('c1'); // Reset to default
    };
    const handleEnhancementStarted = () => setIsEnhancing(true);
    const handleInteractionLoading = () => {
      console.log('🎯 useGeUIClient: Received INTERACTION_LOADING event, setting isLoading=true');
      setIsLoading(true);
    };
    const handleAudioStream = (stream: MediaStream) => setAudioStream(stream);
    const handleError = (error: Error) => {
      console.error('Connection service error:', error);
      setIsLoading(false);
      setIsVoiceLoading(false);
      setIsEnhancing(false);
    };

    newService.on(ConnectionEvent.STATE_CHANGED, handleStateChange);
    newService.on(ConnectionEvent.VOICE_STATE_CHANGED, handleVoiceStateChange);
    newService.on(ConnectionEvent.MESSAGE_RECEIVED, handleMessageReceived);
    newService.on(ConnectionEvent.TRANSCRIPTION, handleTranscription);
    newService.on(ConnectionEvent.STREAMING_STARTED, handleStreamingStarted);
    newService.on(ConnectionEvent.STREAMING_CHUNK, handleStreamingChunk);
    newService.on(ConnectionEvent.STREAMING_DONE, handleStreamingDone);
    newService.on(ConnectionEvent.ENHANCEMENT_STARTED, handleEnhancementStarted);
    newService.on(ConnectionEvent.INTERACTION_LOADING, handleInteractionLoading);
    newService.on(ConnectionEvent.AUDIO_STREAM, handleAudioStream);
    newService.on(ConnectionEvent.ERROR, handleError);
    
    // Handle thread creation events
    const handleThreadCreated = (data: { threadId: string }) => {
      console.log('Thread created:', data.threadId);
      setThreadIdInternal(data.threadId);
      // Optionally emit event for parent components to handle
      if (options.onThreadCreated) {
        options.onThreadCreated(data.threadId);
      }
    };
    newService.on('thread:created' as ConnectionEvent, handleThreadCreated);
    
    // Auto-connect if enabled (WebSocket-first pattern)
    if (autoConnect) {
      newService.connectWebSocket(options.initialThreadId).catch(error => {
        console.error('Error auto-connecting WebSocket:', error);
        // Don't throw - let user retry manually
      }).finally(() => {
        initializingRef.current = false;
      });
    } else {
      initializingRef.current = false;
    }
    
    // Cleanup function to run when component unmounts or dependencies change
    return () => {
      console.log("Cleaning up and disconnecting ConnectionService...");
      initializingRef.current = false;
      if (connectionServiceRef.current) {
        connectionServiceRef.current.disconnect();
        connectionServiceRef.current.removeAllListeners();
        connectionServiceRef.current = null;
      }
    };
  }, [webrtcURL, websocketURL, autoConnect]); // Only re-run if these fundamental props change

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (voiceLoadingTimeoutRef.current) {
        clearTimeout(voiceLoadingTimeoutRef.current);
      }
    };
  }, []);

  // Send a text message
  const sendText = useCallback(async (message: string) => {
    if (!connectionServiceRef.current) {
      console.error('Cannot send message: Connection service not initialized');
      return;
    }
    
    if (!message.trim()) {
      return;
    }
    
    try {
      setIsLoading(true);
      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      await connectionServiceRef.current.sendChatMessage(message, threadId);
    } catch (error) {
      console.error('Error sending text message:', error);
      setIsLoading(false);
    }
  }, [threadId]);

  // Send a C1Component action
  const sendC1Action = useCallback(async (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => {
    if (!connectionServiceRef.current) {
      console.error('Cannot send C1 action: Connection service not initialized');
      return;
    }
    
    try {
      setIsLoading(true);
      if (action.humanFriendlyMessage) {
        const userAction = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: action.humanFriendlyMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userAction]);
      }
      await connectionServiceRef.current.sendC1Action(action, threadId);
    } catch (error) {
      console.error('Error sending C1 action:', error);
      setIsLoading(false);
    }
  }, [threadId]);

  // Start voice connection
  const startVoice = useCallback(async () => {
    if (!connectionServiceRef.current) {
      console.error('Cannot start voice: Connection service not initialized');
      return;
    }
    try {
      await connectionServiceRef.current.connectVoice(threadId);
    } catch (error) {
      console.error('Error starting voice:', error);
    }
  }, [threadId]);

  // Stop voice connection
  const stopVoice = useCallback(() => {
    if (connectionServiceRef.current) {
      connectionServiceRef.current.disconnectVoice();
    }
  }, []);

  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  const setMessagesDirectly = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  // Get backend connection ID (useful for debugging)
  const getBackendConnectionId = useCallback(() => {
    return connectionServiceRef.current?.getBackendConnectionId() || null;
  }, []);

  // Check if connection is ready for voice
  const isReadyForVoice = useCallback(() => {
    return connectionServiceRef.current?.isReadyForVoice() || false;
  }, []);

  // Thread management state (only when enableThreads=true)
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({});
  const [isSwitchingThread, setIsSwitchingThread] = useState(false);
  const switchingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  
  // Thread backend service instance
  const threadBackendServiceRef = useRef<ThreadBackendService | null>(null);
  
  // Initialize thread backend service if config provided
  useEffect(() => {
    if (options.threadBackendConfig && !threadBackendServiceRef.current) {
      threadBackendServiceRef.current = new ThreadBackendService(options.threadBackendConfig);
      console.log('Thread backend service initialized');
    }
    
    return () => {
      if (threadBackendServiceRef.current) {
        threadBackendServiceRef.current.destroy();
        threadBackendServiceRef.current = null;
      }
    };
  }, [options.threadBackendConfig]);
  
  // Thread storage functions
  const loadThreadsFromStorage = useCallback(() => {
    if (!options.enableThreads || !options.threadOptions?.enablePersistence) return null;
    
    const storageKey = options.threadOptions?.storageKey || 'geui-threads';
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      // Convert timestamps
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
      console.error('Failed to load threads from storage:', error);
      return null;
    }
  }, [options.enableThreads, options.threadOptions]);
  
  const saveThreadsToStorage = useCallback((data: any) => {
    if (!options.enableThreads || !options.threadOptions?.enablePersistence) return;
    
    const storageKey = options.threadOptions?.storageKey || 'geui-threads';
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save threads to storage:', error);
    }
  }, [options.enableThreads, options.threadOptions]);
  

  // Thread management functions
  const createThread = useCallback(async (title?: string): Promise<Thread> => {
    if (!options.enableThreads) {
      throw new Error('Thread management is not enabled');
    }
    
    // Generate a consistent UUID for the thread
    const threadId = uuidv4();
    const now = new Date();
    
    // Use backend service if available
    if (threadBackendServiceRef.current) {
      try {
        console.log('Creating thread via backend with ID:', threadId);
        const newThread = await threadBackendServiceRef.current.createThread(
          title || `Thread ${threads.length + 1}`,
          { thread_id: threadId }, // Pass the pre-generated UUID
          connectionServiceRef.current?.getBackendConnectionId() || undefined
        );
        
        // Update state
        setThreads(prev => [...prev, newThread]);
        setThreadMessages(prev => ({ ...prev, [newThread.id]: [] }));
        setActiveThreadId(newThread.id);
        setThreadIdInternal(newThread.id);
        
        // Clear messages for new thread
        messagesRef.current = [];
        clearMessages();
        
        // Switch WebSocket connection to new thread
        if (connectionServiceRef.current) {
          try {
            await connectionServiceRef.current.switchToThread(newThread.id);
          } catch (error) {
            console.error('Error switching connection to new thread:', error);
          }
        }
        
        return newThread;
      } catch (error) {
        console.error('Failed to create thread via backend:', error);
        // Fall through to local creation with same UUID
      }
    }
    
    // Local thread creation (fallback or when no backend) - use same UUID
    const newThread: Thread = {
      id: threadId,
      title: title || `Thread ${threads.length + 1}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    
    // Save current thread messages before switching
    if (activeThreadId && options.threadOptions?.enablePersistence) {
      const storage = loadThreadsFromStorage() || {
        version: 1,
        threads: {},
        activeThreadId: null,
        lastUpdated: new Date().toISOString()
      };
      
      if (storage.threads[activeThreadId]) {
        storage.threads[activeThreadId].messages = messagesRef.current;
        saveThreadsToStorage(storage);
      }
    }
    
    // Update state
    setThreads(prev => [...prev, newThread]);
    setThreadMessages(prev => ({ ...prev, [threadId]: [] }));
    setActiveThreadId(threadId);
    setThreadIdInternal(threadId);
    
    // Clear messages for new thread
    messagesRef.current = [];
    clearMessages();
    
    // Save new thread to storage
    if (options.threadOptions?.enablePersistence) {
      const storage = loadThreadsFromStorage() || {
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
      saveThreadsToStorage(storage);
    }
    
    // Switch WebSocket connection to new thread
    if (connectionServiceRef.current) {
      try {
        // Switch to new thread - this will handle reconnection if needed
        await connectionServiceRef.current.switchToThread(threadId);
      } catch (error) {
        console.error('Error switching connection to new thread:', error);
        // Continue even if connection switch fails - thread is still created
      }
    }
    
    return newThread;
  }, [options.enableThreads, options.threadOptions, threads.length, activeThreadId, clearMessages, loadThreadsFromStorage, saveThreadsToStorage]);
  
  const switchThread = useCallback(async (newThreadId: string) => {
    if (!options.enableThreads || newThreadId === activeThreadId || switchingRef.current) return;
    
    // Validate thread ID to prevent loops
    if (!newThreadId || newThreadId === 'undefined' || newThreadId === 'null') {
      console.error('Invalid thread ID for switch:', newThreadId);
      return;
    }
    
    switchingRef.current = true;
    setIsSwitchingThread(true);
    
    try {
      // If using backend, save current thread messages to backend
      if (threadBackendServiceRef.current && activeThreadId && messagesRef.current.length > 0) {
        try {
          // Update thread with latest messages via backend
          await threadBackendServiceRef.current.updateThread(activeThreadId, {
            messageCount: messagesRef.current.length,
            lastMessage: messagesRef.current[messagesRef.current.length - 1]?.content
          });
        } catch (error) {
          console.error('Failed to save thread to backend:', error);
        }
      } else if (activeThreadId && options.threadOptions?.enablePersistence) {
        // Save to localStorage
        const storage = loadThreadsFromStorage() || {
          version: 1,
          threads: {},
          activeThreadId: null,
          lastUpdated: new Date().toISOString()
        };
        
        if (storage.threads[activeThreadId]) {
          storage.threads[activeThreadId].messages = messagesRef.current;
          saveThreadsToStorage(storage);
        }
      }
      
      // Clear messages
      clearMessages();
      
      // Update active thread
      setActiveThreadId(newThreadId);
      setThreadIdInternal(newThreadId);
      
      // Switch thread in connection service if it exists
      if (connectionServiceRef.current) {
        try {
          await connectionServiceRef.current.switchToThread(newThreadId);
        } catch (error) {
          console.error('Error switching connection to thread:', error);
          // Continue even if connection switch fails - we can retry later
        }
      }
      
      // Load new thread messages
      if (threadBackendServiceRef.current) {
        try {
          console.log('Loading thread messages from backend for:', newThreadId);
          const threadDetail = await threadBackendServiceRef.current.getThread(newThreadId);
          if (threadDetail && threadDetail.messages) {
            messagesRef.current = threadDetail.messages;
            setMessagesDirectly(threadDetail.messages);
            setThreadMessages(prev => ({ ...prev, [newThreadId]: threadDetail.messages }));
          } else {
            messagesRef.current = [];
            setMessagesDirectly([]);
          }
        } catch (error) {
          console.error('Failed to load thread from backend:', error);
          // Fall back to local messages
          const newMessages = threadMessages[newThreadId] || [];
          messagesRef.current = newMessages;
          setMessagesDirectly(newMessages);
        }
      } else {
        // Load from local storage
        const newMessages = threadMessages[newThreadId] || [];
        messagesRef.current = newMessages;
        setMessagesDirectly(newMessages);
      }
      
      // Save active thread
      if (options.threadOptions?.enablePersistence) {
        const storage = loadThreadsFromStorage();
        if (storage) {
          storage.activeThreadId = newThreadId;
          saveThreadsToStorage(storage);
        }
      }
    } finally {
      switchingRef.current = false;
      setIsSwitchingThread(false);
    }
  }, [options.enableThreads, options.threadOptions, activeThreadId, threadMessages, clearMessages, setMessagesDirectly, loadThreadsFromStorage, saveThreadsToStorage]);
  
  const deleteThread = useCallback(async (threadIdToDelete: string) => {
    if (!options.enableThreads) return;
    
    // Delete from backend if available
    if (threadBackendServiceRef.current) {
      try {
        console.log('Deleting thread from backend:', threadIdToDelete);
        await threadBackendServiceRef.current.deleteThread(threadIdToDelete);
      } catch (error) {
        console.error('Failed to delete thread from backend:', error);
        // Continue with local deletion even if backend fails
      }
    }
    
    setThreads(prev => prev.filter(t => t.id !== threadIdToDelete));
    setThreadMessages(prev => {
      const updated = { ...prev };
      delete updated[threadIdToDelete];
      return updated;
    });
    
    if (threadIdToDelete === activeThreadId) {
      clearMessages();
      setActiveThreadId(null);
    }
    
    // Update storage
    if (options.threadOptions?.enablePersistence) {
      const storage = loadThreadsFromStorage();
      if (storage) {
        delete storage.threads[threadIdToDelete];
        if (storage.activeThreadId === threadIdToDelete) {
          storage.activeThreadId = null;
        }
        saveThreadsToStorage(storage);
      }
    }
  }, [options.enableThreads, options.threadOptions, activeThreadId, clearMessages, loadThreadsFromStorage, saveThreadsToStorage]);
  
  const renameThread = useCallback(async (threadIdToRename: string, newTitle: string) => {
    if (!options.enableThreads) return;
    
    setThreads(prev => prev.map(t => 
      t.id === threadIdToRename ? { ...t, title: newTitle, updatedAt: new Date() } : t
    ));
    
    // Update storage
    if (options.threadOptions?.enablePersistence) {
      const storage = loadThreadsFromStorage();
      if (storage?.threads[threadIdToRename]) {
        storage.threads[threadIdToRename].title = newTitle;
        storage.threads[threadIdToRename].updatedAt = new Date().toISOString();
        saveThreadsToStorage(storage);
      }
    }
  }, [options.enableThreads, options.threadOptions, loadThreadsFromStorage, saveThreadsToStorage]);
  
  const clearAllThreads = useCallback(async () => {
    if (!options.enableThreads) return;
    
    setThreads([]);
    setActiveThreadId(null);
    setThreadMessages({});
    clearMessages();
    
    // Clear storage
    if (options.threadOptions?.enablePersistence) {
      const storageKey = options.threadOptions?.storageKey || 'geui-threads';
      localStorage.removeItem(storageKey);
    }
  }, [options.enableThreads, options.threadOptions, clearMessages]);
  
  // Load threads on mount if enabled
  useEffect(() => {
    if (!options.enableThreads) return;
    
    const loadThreads = async () => {
      // If backend service is available, use it
      if (threadBackendServiceRef.current) {
        try {
          console.log('Loading threads from backend...');
          const backendThreads = await threadBackendServiceRef.current.getThreads(1, 50);
          
          if (backendThreads && backendThreads.length > 0) {
            console.log(`Loaded ${backendThreads.length} threads from backend`);
            setThreads(backendThreads);
            
            // Set the first thread as active if no active thread
            if (!activeThreadId && backendThreads.length > 0) {
              const firstThread = backendThreads[0];
              setActiveThreadId(firstThread.id);
              setThreadIdInternal(firstThread.id);
              
              // Load messages for the active thread
              try {
                const threadDetail = await threadBackendServiceRef.current.getThread(firstThread.id);
                if (threadDetail && threadDetail.messages) {
                  messagesRef.current = threadDetail.messages;
                  setMessagesDirectly(threadDetail.messages);
                  setThreadMessages({ [firstThread.id]: threadDetail.messages });
                }
              } catch (error) {
                console.error('Failed to load thread messages:', error);
              }
            }
          } else {
            console.log('No threads found in backend, creating default thread');
            // Create default thread via backend
            // Check if we already have a thread ID from the connection
            const currentThreadId = connectionServiceRef.current?.getThreadId();
            if (currentThreadId && currentThreadId !== 'default-thread') {
              console.log('Using existing thread from connection:', currentThreadId);
              // Try to load this thread instead of creating a new one
              try {
                const existingThread = await threadBackendServiceRef.current.getThread(currentThreadId);
                if (existingThread && existingThread.id) {
                  setThreads([existingThread]);
                  setThreadMessages({ [existingThread.id]: existingThread.messages || [] });
                  setActiveThreadId(existingThread.id);
                  setThreadIdInternal(existingThread.id);
                  return; // Exit early, don't create a new thread
                }
              } catch (error) {
                console.log('Could not load existing thread, will create new one');
              }
            }
            
            try {
              const newThread = await threadBackendServiceRef.current.createThread(
                'New Conversation',
                undefined,
                connectionServiceRef.current?.getBackendConnectionId() || undefined
              );
              if (!newThread.id) {
                console.error('Created thread has no ID, skipping state update');
                return;
              }
              setThreads([newThread]);
              setThreadMessages({ [newThread.id]: [] });
              setActiveThreadId(newThread.id);
              setThreadIdInternal(newThread.id);
            } catch (error) {
              console.error('Failed to create default thread via backend:', error);
              // Fall back to local thread creation with UUID
              const threadId = uuidv4();
              const now = new Date();
              const newThread: Thread = {
                id: threadId,
                title: 'New Conversation',
                createdAt: now,
                updatedAt: now,
                messageCount: 0
              };
              setThreads([newThread]);
              setThreadMessages({ [threadId]: [] });
              setActiveThreadId(threadId);
              setThreadIdInternal(threadId);
            }
          }
        } catch (error) {
          console.error('Failed to load threads from backend, falling back to localStorage:', error);
          // Fall back to localStorage
          loadFromLocalStorage();
        }
      } else {
        // Use localStorage if no backend service
        loadFromLocalStorage();
      }
    };
    
    const loadFromLocalStorage = () => {
      const storage = loadThreadsFromStorage();
      if (storage && Object.keys(storage.threads).length > 0) {
        const threadList = Object.values(storage.threads).map((threadData: any) => ({
          id: threadData.id,
          title: threadData.title,
          createdAt: new Date(threadData.createdAt),
          updatedAt: new Date(threadData.updatedAt),
          lastMessage: threadData.lastMessage,
          messageCount: threadData.messageCount
        }));
        
        setThreads(threadList);
        setActiveThreadId(storage.activeThreadId);
        
        // Load all thread messages
        const allMessages: Record<string, Message[]> = {};
        Object.entries(storage.threads).forEach(([id, thread]: [string, any]) => {
          allMessages[id] = thread.messages || [];
        });
        setThreadMessages(allMessages);
        
        // Set active thread messages
        if (storage.activeThreadId && storage.threads[storage.activeThreadId]) {
          messagesRef.current = storage.threads[storage.activeThreadId].messages;
          setMessagesDirectly(storage.threads[storage.activeThreadId].messages);
          setThreadIdInternal(storage.activeThreadId);
        }
      } else {
        // Create default thread if none exist
        const threadId = uuidv4();
        const now = new Date();
        
        const newThread: Thread = {
          id: threadId,
          title: 'New Conversation',
          createdAt: now,
          updatedAt: now,
          messageCount: 0
        };
        
        setThreads([newThread]);
        setThreadMessages({ [threadId]: [] });
        setActiveThreadId(threadId);
        setThreadIdInternal(threadId);
        
        // Save to storage
        if (options.threadOptions?.enablePersistence) {
          const newStorage = {
            version: 1,
            threads: {
              [threadId]: {
                id: threadId,
                title: newThread.title,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                messageCount: 0,
                messages: []
              }
            },
            activeThreadId: threadId,
            lastUpdated: new Date().toISOString()
          };
          saveThreadsToStorage(newStorage);
        }
      }
    };
    
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - dependencies intentionally excluded
  
  // Save messages when they change (if threads enabled)
  useEffect(() => {
    if (!options.enableThreads || !activeThreadId || switchingRef.current) return;
    
    messagesRef.current = messages;
    setThreadMessages(prev => ({
      ...prev,
      [activeThreadId]: messages
    }));
    
    // Save to storage with debounce
    const timeoutId = setTimeout(() => {
      if (options.threadOptions?.enablePersistence) {
        const storage = loadThreadsFromStorage();
        if (storage && storage.threads && storage.threads[activeThreadId]) {
          storage.threads[activeThreadId].messages = messages;
          storage.threads[activeThreadId].messageCount = messages.length;
          storage.threads[activeThreadId].lastMessage = messages[messages.length - 1]?.content;
          storage.threads[activeThreadId].updatedAt = new Date().toISOString();
          saveThreadsToStorage(storage);
          
          // Update thread in state
          setThreads(prev => prev.map(t => 
            t.id === activeThreadId 
              ? {
                  ...t,
                  messageCount: messages.length,
                  lastMessage: messages[messages.length - 1]?.content,
                  updatedAt: new Date()
                }
              : t
          ));
        }
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, activeThreadId, options.enableThreads, options.threadOptions]);
  
  // Build the base client
  const baseClient = {
    // GenuxClient interface
    sendText,
    startVoice,
    stopVoice,
    messages,
    connectionState,
    voiceState,
    
    // Interaction processing methods
    isInteractionProcessing: useCallback((type: InteractionType, identifier: string) => {
      return connectionServiceRef.current?.checkInteractionProcessing?.(type, identifier) || false;
    }, []),
    
    getProcessingInteractions: useCallback((): InteractionProcessingState[] => {
      return connectionServiceRef.current?.getProcessingInteractions?.() || [];
    }, []),
    
    // Additional properties
    threadId,
    setThreadId,
    isEnhancing,
    isLoading,
    isVoiceLoading,
    streamingContent,
    streamingContentType,
    streamingMessageId,
    isStreamingActive,
    audioStream,
    
    // Additional methods
    sendC1Action,
    clearMessages,
    setMessages: setMessagesDirectly,
    getBackendConnectionId,
    isReadyForVoice,
  };
  
  // If threads are enabled, add thread management methods
  if (options.enableThreads) {
    return {
      ...baseClient,
      // Thread management
      threads,
      activeThreadId,
      activeThread: threads.find(t => t.id === activeThreadId) || null,
      isSwitchingThread,
      createThread,
      switchThread,
      deleteThread,
      renameThread,
      clearAllThreads,
      // For compatibility with existing code
      selectThread: switchThread,
    } as any; // Type assertion needed for conditional return type
  }
  
  return baseClient as any; // Type assertion needed for conditional return type
}
