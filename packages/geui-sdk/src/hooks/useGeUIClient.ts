import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionService, ConnectionEvent, ConnectionServiceOptions } from '../core/ConnectionService';
import { 
  Message, 
  ConnectionState, 
  VoiceConnectionState,
  GeUIClient,
  InteractionType,
  InteractionProcessingState
} from '../types';

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
}

/**
 * Hook that provides a headless interface to the GeUI SDK
 */
export function useGeUIClient(options: UseGeUIClientOptions): GeUIClient & {
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
} {
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

  return {
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
}
