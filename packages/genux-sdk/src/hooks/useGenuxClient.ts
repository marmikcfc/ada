import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionService, ConnectionEvent, ConnectionServiceOptions } from '../core/ConnectionService';
import { 
  Message, 
  ConnectionState, 
  VoiceConnectionState,
  GenuxClient
} from '../types';

/**
 * Options for the useGenuxClient hook
 */
export interface UseGenuxClientOptions extends ConnectionServiceOptions {
  /**
   * Initial thread ID to use
   */
  initialThreadId?: string;
  
  /**
   * Whether to automatically connect on mount
   */
  autoConnect?: boolean;
}

/**
 * Hook that provides a headless interface to the Genux SDK
 */
export function useGenuxClient(options: UseGenuxClientOptions): GenuxClient & {
  // Additional properties beyond the GenuxClient interface
  threadId: string | undefined;
  setThreadId: (threadId: string) => void;
  isEnhancing: boolean;
  isLoading: boolean;
  isVoiceLoading: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  audioStream: MediaStream | null;
  sendC1Action: (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => void;
  clearMessages: () => void;
} {
  // Connection service instance stored in a ref to persist across renders
  const connectionServiceRef = useRef<ConnectionService | null>(null);
  
  // Thread ID
  const [threadId, setThreadId] = useState<string | undefined>(options.initialThreadId);
  
  // Message history
  const [messages, setMessages] = useState<Message[]>([]);
  
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
  
  // Audio stream
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Debounce clear for isVoiceLoading so banner stays visible long enough
  const voiceLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destructure only the properties from options that should trigger a re-connection
  const { webrtcURL, websocketURL, autoConnect = true } = options;

  // Effect to manage the connection lifecycle
  useEffect(() => {
    // Prevent creating a new service if one already exists for the same URLs
    if (connectionServiceRef.current && 
        connectionServiceRef.current.webrtcURL === webrtcURL &&
        connectionServiceRef.current.websocketURL === websocketURL) {
      return;
    }

    // If a service exists but URLs have changed, disconnect the old one first
    if (connectionServiceRef.current) {
      connectionServiceRef.current.disconnect();
      connectionServiceRef.current.removeAllListeners();
    }

    console.log('Initializing new ConnectionService...');
    const newService = new ConnectionService({ 
      webrtcURL, 
      websocketURL,
      mcpEndpoints: options.mcpEndpoints,
      autoReconnect: options.autoReconnect,
      reconnectInterval: options.reconnectInterval,
      maxReconnectAttempts: options.maxReconnectAttempts,
      uiFramework: options.uiFramework,
      onFormSubmit: options.onFormSubmit,
      onButtonClick: options.onButtonClick,
      onInputChange: options.onInputChange,
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
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
      setIsEnhancing(false);
    };
    const handleTranscription = (_transcript: { text: string, final?: boolean, id?: string }) => {
      // MESSAGE_RECEIVED is already emitted by ConnectionService for the
      // final user transcription, so we no longer need to duplicate the
      // message here.  Keep this handler only for potential side-effects
      // (e.g. live transcript display in the future).
    };
    const handleStreamingStarted = (data: { id: string, content: string }) => {
      setStreamingMessageId(data.id);
      setStreamingContent(data.content);
      setIsStreamingActive(true);
      // Enhancement (slow-path) has now produced its first token,
      // so we can hide the "Generating enhanced display…" indicator.
      setIsEnhancing(false);
    };
    const handleStreamingChunk = (data: { id: string, accumulatedContent: string }) => {
      setStreamingContent(data.accumulatedContent);
    };
    const handleStreamingDone = () => {
      // The final message is added via MESSAGE_RECEIVED, so just reset streaming state
      setStreamingMessageId(null);
      setStreamingContent('');
      setIsStreamingActive(false);
    };
    const handleEnhancementStarted = () => setIsEnhancing(true);
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
    newService.on(ConnectionEvent.AUDIO_STREAM, handleAudioStream);
    newService.on(ConnectionEvent.ERROR, handleError);
    
    // Auto-connect if enabled
    if (autoConnect) {
      newService.connectWebSocket().catch(error => {
        console.error('Error auto-connecting WebSocket:', error);
      });
    }
    
    // Cleanup function to run when component unmounts or dependencies change
    return () => {
      console.log("Cleaning up and disconnecting ConnectionService...");
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
  const sendText = useCallback((message: string) => {
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
      connectionServiceRef.current.sendChatMessage(message, threadId);
    } catch (error) {
      console.error('Error sending text message:', error);
      setIsLoading(false);
    }
  }, [threadId]);

  // Send a C1Component action
  const sendC1Action = useCallback((action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => {
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
      connectionServiceRef.current.sendC1Action(action, threadId);
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
      await connectionServiceRef.current.connectVoice();
    } catch (error) {
      console.error('Error starting voice:', error);
    }
  }, []);

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

  return {
    // GenuxClient interface
    sendText,
    startVoice,
    stopVoice,
    messages,
    connectionState,
    voiceState,
    
    // Additional properties
    threadId,
    setThreadId,
    isEnhancing,
    isLoading,
    isVoiceLoading,
    streamingContent,
    streamingMessageId,
    isStreamingActive,
    audioStream,
    
    // Additional methods
    sendC1Action,
    clearMessages,
  };
}
