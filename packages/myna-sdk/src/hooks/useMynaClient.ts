import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionService, ConnectionEvent, ConnectionServiceOptions } from '../core/ConnectionService';
import { 
  Message, 
  ConnectionState, 
  VoiceConnectionState,
  MynaClient
} from '../types';

/**
 * Options for the useMynaClient hook
 */
export interface UseMynaClientOptions extends ConnectionServiceOptions {
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
 * Hook that provides a headless interface to the Myna SDK
 */
export function useMynaClient(options: UseMynaClientOptions): MynaClient & {
  // Additional properties beyond the MynaClient interface
  threadId: string | undefined;
  setThreadId: (threadId: string) => void;
  isEnhancing: boolean;
  isLoading: boolean;
  isVoiceLoading: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  audioStream: MediaStream | null;
} {
  // Connection service instance
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

  // Initialize connection service
  useEffect(() => {
    const connectionService = new ConnectionService(options);
    connectionServiceRef.current = connectionService;
    
    // Set up event listeners
    connectionService.on(ConnectionEvent.STATE_CHANGED, (state: ConnectionState) => {
      setConnectionState(state);
    });
    
    connectionService.on(ConnectionEvent.VOICE_STATE_CHANGED, (state: VoiceConnectionState | string) => {
      if (state === 'user-stopped') {
        setIsVoiceLoading(true);
      } else if (state === 'bot-started') {
        setIsVoiceLoading(false);
      } else if (typeof state === 'string' && ['connected', 'connecting', 'disconnected'].includes(state)) {
        setVoiceState(state as VoiceConnectionState);
      }
    });
    
    connectionService.on(ConnectionEvent.MESSAGE_RECEIVED, (message: Message) => {
      setMessages(prev => [...prev, message]);
      // Reset loading state when message is received
      setIsLoading(false);
    });
    
    connectionService.on(ConnectionEvent.TRANSCRIPTION, (transcript: { text: string, final?: boolean, id?: string }) => {
      if (transcript.final && transcript.text) {
        // Add user message to history when final transcript is received
        setMessages(prev => [...prev, {
          id: transcript.id || crypto.randomUUID(),
          role: 'user',
          content: transcript.text,
          timestamp: new Date()
        }]);
      }
    });
    
    connectionService.on(ConnectionEvent.STREAMING_STARTED, (data: { id: string, content: string }) => {
      setStreamingMessageId(data.id);
      setStreamingContent(data.content);
      setIsStreamingActive(true);
    });
    
    connectionService.on(ConnectionEvent.STREAMING_CHUNK, (data: { id: string, accumulatedContent: string }) => {
      setStreamingContent(data.accumulatedContent);
    });
    
    connectionService.on(ConnectionEvent.STREAMING_DONE, () => {
      setStreamingMessageId(null);
      setStreamingContent('');
      setIsStreamingActive(false);
    });
    
    connectionService.on(ConnectionEvent.ENHANCEMENT_STARTED, () => {
      setIsEnhancing(true);
    });
    
    connectionService.on(ConnectionEvent.AUDIO_STREAM, (stream: MediaStream) => {
      setAudioStream(stream);
    });
    
    connectionService.on(ConnectionEvent.ERROR, (error: Error) => {
      console.error('Connection error:', error);
      // Reset loading states on error
      setIsLoading(false);
      setIsVoiceLoading(false);
      setIsEnhancing(false);
    });
    
    // Auto-connect if enabled
    if (options.autoConnect) {
      connectionService.connectWebSocket().catch(error => {
        console.error('Error auto-connecting WebSocket:', error);
      });
    }
    
    // Cleanup on unmount
    return () => {
      connectionService.disconnect();
      connectionService.removeAllListeners();
    };
  }, [options]);

  // Send a text message
  const sendText = useCallback((message: string) => {
    if (!connectionServiceRef.current) {
      throw new Error('Connection service not initialized');
    }
    
    if (!message.trim()) {
      return;
    }
    
    try {
      // Set loading state
      setIsLoading(true);
      
      // Add user message to history
      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Send message via connection service
      connectionServiceRef.current.sendChatMessage(message, threadId);
    } catch (error) {
      console.error('Error sending text message:', error);
      setIsLoading(false);
    }
  }, [threadId]);

  // Send a C1Component action
  const sendC1Action = useCallback((action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => {
    if (!connectionServiceRef.current) {
      throw new Error('Connection service not initialized');
    }
    
    try {
      // Set loading state
      setIsLoading(true);
      
      // Add user action to history with human-friendly message
      if (action.humanFriendlyMessage) {
        const userAction = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: action.humanFriendlyMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userAction]);
      }
      
      // Send action via connection service
      connectionServiceRef.current.sendC1Action(action, threadId);
    } catch (error) {
      console.error('Error sending C1 action:', error);
      setIsLoading(false);
    }
  }, [threadId]);

  // Start voice connection
  const startVoice = useCallback(async () => {
    if (!connectionServiceRef.current) {
      throw new Error('Connection service not initialized');
    }
    
    try {
      await connectionServiceRef.current.connectVoice();
    } catch (error) {
      console.error('Error starting voice:', error);
    }
  }, []);

  // Stop voice connection
  const stopVoice = useCallback(() => {
    if (!connectionServiceRef.current) {
      connectionServiceRef.current?.disconnectVoice();
    }
  }, []);

  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // MynaClient interface
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
