import EventEmitter from 'eventemitter3';
import { 
  ConnectionState, 
  VoiceConnectionState, 
  MCPEndpoint,
  UserMessage,
  AssistantMessage
} from '../types';

/**
 * Events emitted by the ConnectionService
 */
export enum ConnectionEvent {
  STATE_CHANGED = 'state_changed',
  VOICE_STATE_CHANGED = 'voice_state_changed',
  MESSAGE_RECEIVED = 'message_received',
  STREAMING_STARTED = 'streaming_started',
  STREAMING_CHUNK = 'streaming_chunk',
  STREAMING_DONE = 'streaming_done',
  TRANSCRIPTION = 'transcription',
  ENHANCEMENT_STARTED = 'enhancement_started',
  AUDIO_STREAM = 'audio_stream',
  ERROR = 'error'
}

/**
 * Visualization provider configuration
 */
export interface VisualizationProvider {
  provider_type: 'thesys' | 'openai' | 'anthropic' | 'custom';
  model: string;
  api_key_env: string;
  custom_endpoint?: string;
}

/**
 * Options for the ConnectionService
 */
export interface ConnectionServiceOptions {
  webrtcURL?: string;
  websocketURL: string;
  mcpEndpoints?: MCPEndpoint[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  /** UI framework preference for backend-generated content */
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'antd' | 'bootstrap' | 'inline';
  /** Visualization provider configuration for per-connection setup */
  visualizationProvider?: VisualizationProvider;
  /** Custom interaction handlers for framework-generated content */
  onFormSubmit?: (formId: string, formData: FormData) => void;
  onButtonClick?: (actionType: string, context: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
  /** Custom WebSocket connection handler (for per-connection setup) */
  onWebSocketConnect?: (ws: WebSocket) => () => void;
}

/**
 * WebRTC connection options (currently unused but kept for future extension)
 */
// interface WebRTCOptions {
//   iceServers?: RTCIceServer[];
// }

/**
 * ConnectionService manages WebRTC and WebSocket connections for the geui SDK
 */
export class ConnectionService extends EventEmitter {
  /**
   * Underlying endpoints are useful for consumers (e.g. `usegeuiClient`)
   * to detect when the connection target has actually changed so they
   * can decide whether to reuse or recreate the service instance.
   *
   * Mark them as **public readonly** so they can be inspected but never
   * mutated from the outside.
   */
  public readonly webrtcURL?: string;
  public readonly websocketURL: string;
  private _mcpEndpoints?: MCPEndpoint[]; // Stored for future use
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  
  // UI Framework support
  private uiFramework: string = 'inline';
  private _visualizationProvider?: VisualizationProvider; // Reserved for future use
  private onFormSubmit?: (formId: string, formData: FormData) => void;
  private onButtonClick?: (actionType: string, context: any) => void;
  private onInputChange?: (fieldName: string, value: any) => void;
  private onWebSocketConnect?: (ws: WebSocket) => () => void;
  private wsCleanupCallback?: () => void;

  private webSocket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private connectionState: ConnectionState = 'disconnected';
  private voiceState: VoiceConnectionState = 'disconnected';
  
  // For streaming message handling
  private streamingMessageId: string | null = null;
  private streamingContent: string = '';
  private streamingContentType: 'c1' | 'html' = 'c1';
  
  // Backend connection ID received from WebSocket connection_established message
  private backendConnectionId: string | null = null;
  
  // Simple connection identifier for logging (generated locally)
  private connectionLogId: string;
  
  // Thread management for voice isolation
  private activeThreadId: string | null = null;
  private threadVoiceMapping: Map<string, boolean> = new Map(); // Track which threads have voice enabled

  /**
   * Create a new ConnectionService
   */
  constructor(options: ConnectionServiceOptions) {
    super();
    this.webrtcURL = options.webrtcURL;
    this.websocketURL = options.websocketURL;
    this._mcpEndpoints = options.mcpEndpoints; // Stored for future MCP integration
    console.log('MCP endpoints configured:', this._mcpEndpoints?.length || 0, 'endpoints'); // Use it to avoid TS error
    // Disable auto-reconnect by default - we'll connect on demand
    this.autoReconnect = options.autoReconnect ?? false;
    this.reconnectInterval = options.reconnectInterval ?? 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.connectionLogId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
    // UI Framework support
    this.uiFramework = options.uiFramework || 'inline';
    this._visualizationProvider = options.visualizationProvider;
    this.onFormSubmit = options.onFormSubmit;
    this.onButtonClick = options.onButtonClick;
    this.onInputChange = options.onInputChange;
    this.onWebSocketConnect = options.onWebSocketConnect;
    
    // Setup global interaction handlers
    this.setupGlobalHandlers();
  }

  /**
   * Initialize WebSocket connection
   */
  public async connectWebSocket(): Promise<void> {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] WebSocket already connected`);
      return;
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    this.setConnectionState('connecting');
    
    try {
      console.log(`[WS:${this.connectionLogId}] Connecting to WebSocket at: ${this.websocketURL}`);
      this.webSocket = new WebSocket(this.websocketURL);
      
      this.webSocket.onopen = this.handleWebSocketOpen.bind(this);
      this.webSocket.onmessage = this.handleWebSocketMessage.bind(this);
      this.webSocket.onerror = this.handleWebSocketError.bind(this);
      this.webSocket.onclose = this.handleWebSocketClose.bind(this);

      // Wait for WebSocket to open before resolving
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000); // 10 second timeout

        const handleOpen = () => {
          clearTimeout(timeout);
          if (this.webSocket) {
            this.webSocket.removeEventListener('open', handleOpen);
            this.webSocket.removeEventListener('error', handleError);
          }
          resolve();
        };

        const handleError = (error: Event) => {
          clearTimeout(timeout);
          if (this.webSocket) {
            this.webSocket.removeEventListener('open', handleOpen);
            this.webSocket.removeEventListener('error', handleError);
          }
          reject(error);
        };

        if (this.webSocket) {
          this.webSocket.addEventListener('open', handleOpen);
          this.webSocket.addEventListener('error', handleError);
        }
      });
    } catch (error) {
      console.error(`[WS:${this.connectionLogId}] Error connecting to WebSocket:`, error);
      this.setConnectionState('error');
      this.emit(ConnectionEvent.ERROR, error);
      this.handleReconnect();
      throw error;
    }
  }

  /**
   * Wait for backend connection ID from WebSocket connection_established message
   */
  private async waitForBackendConnectionId(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for backend connection ID'));
      }, 30000); // 30 second timeout
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_established' && data.connection_id) {
            this.backendConnectionId = data.connection_id;
            console.log(`[WS:${this.connectionLogId}] Received backend connection ID: ${data.connection_id}`);
            clearTimeout(timeout);
            if (this.webSocket) {
              this.webSocket.removeEventListener('message', handleMessage);
            }
            resolve(data.connection_id);
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      };
      
      if (this.webSocket) {
        this.webSocket.addEventListener('message', handleMessage);
      } else {
        clearTimeout(timeout);
        reject(new Error('WebSocket not connected'));
      }
    });
  }

  /**
   * Initialize WebRTC connection for voice (requires WebSocket to be connected first)
   */
  public async connectVoice(threadId?: string): Promise<void> {
    if (!this.webrtcURL) {
      console.log('Voice is disabled (no webrtcURL provided)');
      return;
    }

    if (this.voiceState === 'connected' || this.voiceState === 'connecting') {
      console.log('Voice already connected or connecting');
      return;
    }

    // Ensure WebSocket is connected first
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] WebSocket not connected, connecting first for voice...`);
      await this.connectWebSocket();
    }

    // Ensure we have backend connection ID
    if (!this.backendConnectionId) {
      console.log(`[WS:${this.connectionLogId}] Waiting for backend connection ID...`);
      await this.waitForBackendConnectionId();
    }

    if (!this.backendConnectionId) {
      throw new Error('Cannot connect voice: No backend connection ID available');
    }

    // Set thread context for voice connection
    if (threadId) {
      this.enableVoiceForThread(threadId);
    }

    console.log(`[WS:${this.connectionLogId}] Starting voice connection with backend ID: ${this.backendConnectionId}, thread: ${this.activeThreadId}`);
    this.setVoiceState('connecting');
    
    try {
      // Get user media for WebRTC
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      this.localStream = stream;
      
      // Create WebRTC connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      this.peerConnection = peerConnection;

      // Create data channel for interim transcripts
      const transcriptChannel = peerConnection.createDataChannel('transcript');
      this.dataChannel = transcriptChannel;
      
      transcriptChannel.onopen = () => {
        console.log('WebRTC transcript channel opened');
      };
      
      transcriptChannel.onmessage = this.handleDataChannelMessage.bind(this);

      // Add local stream
      stream.getTracks().forEach(track => {
        if (peerConnection) {
          peerConnection.addTrack(track, stream);
        }
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote audio stream');
        this.remoteStream = event.streams[0];
        this.emit(ConnectionEvent.AUDIO_STREAM, event.streams[0]);
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to backend with backend connection ID for proper routing
      const response = await fetch(this.webrtcURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          backend_connection_id: this.backendConnectionId, // Include backend connection ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const answer = await response.json();
      
      // Set remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription({
        sdp: answer.sdp,
        type: answer.type,
      }));

      this.setVoiceState('connected');
      
    } catch (error) {
      console.error('Error connecting voice:', error);
      this.setVoiceState('disconnected');
      this.emit(ConnectionEvent.ERROR, error);
    }
  }

  /**
   * Disconnect voice connection
   */
  public disconnectVoice(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.setVoiceState('disconnected');
  }

  /**
   * Send a chat message via WebSocket
   */
  public async sendChatMessage(message: string, threadId?: string): Promise<string> {
    // Ensure WebSocket is connected first
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] WebSocket not connected, connecting for chat message...`);
      await this.connectWebSocket();
    }
    
    // Ensure we have backend connection ID
    if (!this.backendConnectionId) {
      console.log(`[WS:${this.connectionLogId}] Waiting for backend connection ID for chat...`);
      await this.waitForBackendConnectionId();
    }
    
    const messageId = crypto.randomUUID();
    
    if (!this.webSocket) {
      throw new Error('WebSocket is not connected');
    }
    
    this.webSocket.send(JSON.stringify({
      type: 'chat',
      message: message,
      thread_id: threadId,
      id: messageId
    }));
    
    return messageId;
  }

  /**
   * Send a C1Component action via WebSocket
   */
  public async sendC1Action(action: { llmFriendlyMessage: string }, threadId?: string): Promise<string> {
    // Ensure WebSocket is connected first
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] WebSocket not connected, connecting for C1 action...`);
      await this.connectWebSocket();
    }
    
    // Ensure we have backend connection ID
    if (!this.backendConnectionId) {
      console.log(`[WS:${this.connectionLogId}] Waiting for backend connection ID for C1 action...`);
      await this.waitForBackendConnectionId();
    }
    
    const messageId = crypto.randomUUID();
    
    if (!this.webSocket) {
      throw new Error('WebSocket is not connected');
    }
    
    this.webSocket.send(JSON.stringify({
      type: 'thesys_bridge',
      prompt: { content: action.llmFriendlyMessage },
      threadId: threadId,
      responseId: messageId,
    }));
    
    return messageId;
  }

  /**
   * Close all connections
   */
  public disconnect(): void {
    this.disconnectVoice();
    this.closeWebSocket();
    this.setConnectionState('disconnected');
    
    // Clean up WebSocket connection handler
    if (this.wsCleanupCallback) {
      this.wsCleanupCallback();
      this.wsCleanupCallback = undefined;
    }
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get the current voice state
   */
  public getVoiceState(): VoiceConnectionState {
    return this.voiceState;
  }

  /**
   * Get the current streaming content
   */
  public getStreamingContent(): string {
    return this.streamingContent;
  }

  /**
   * Get the current streaming message ID
   */
  public getStreamingMessageId(): string | null {
    return this.streamingMessageId;
  }

  /**
   * Check if streaming is active
   */
  public isStreamingActive(): boolean {
    return this.streamingMessageId !== null;
  }

  /**
   * Get the remote audio stream
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get the backend connection ID (useful for debugging)
   */
  public getBackendConnectionId(): string | null {
    return this.backendConnectionId;
  }

  /**
   * Check if connection is ready for voice
   */
  public isReadyForVoice(): boolean {
    return !!(this.webSocket && 
              this.webSocket.readyState === WebSocket.OPEN && 
              this.backendConnectionId && 
              this.webrtcURL);
  }

  /**
   * Set the active thread ID for voice context
   */
  public setActiveThreadId(threadId: string | null): void {
    console.log(`[WS:${this.connectionLogId}] Setting active thread ID: ${threadId}`);
    this.activeThreadId = threadId;
  }

  /**
   * Get the active thread ID
   */
  public getActiveThreadId(): string | null {
    return this.activeThreadId;
  }

  /**
   * Mark a thread as voice-enabled
   */
  public enableVoiceForThread(threadId: string): void {
    console.log(`[WS:${this.connectionLogId}] Enabling voice for thread: ${threadId}`);
    this.threadVoiceMapping.set(threadId, true);
    this.setActiveThreadId(threadId);
  }

  /**
   * Check if a thread has voice enabled
   */
  public isVoiceEnabledForThread(threadId: string): boolean {
    return this.threadVoiceMapping.get(threadId) || false;
  }

  /**
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(): void {
    console.log(`[WS:${this.connectionLogId}] WebSocket connected`);
    this.setConnectionState('connected');
    this.reconnectAttempts = 0;
    
    // Call custom WebSocket connection handler if provided
    if (this.onWebSocketConnect && this.webSocket) {
      console.log(`[WS:${this.connectionLogId}] Calling custom onWebSocketConnect handler`);
      this.wsCleanupCallback = this.onWebSocketConnect(this.webSocket);
    } else {
      console.log(`[WS:${this.connectionLogId}] No custom onWebSocketConnect handler provided`);
    }
    
    // Send UI framework preference to backend (skip for per-connection endpoints)
    const isPerConnectionEndpoint = this.websocketURL.includes('/per-connection-messages');
    if (!isPerConnectionEndpoint) {
      this.sendMessage({
        type: 'client_config',
        uiFramework: this.uiFramework
      });
    }
  }

  /**
   * Parses assistant message content, extracting C1Component JSON if present.
   */
  private _parseAssistantContent(rawContent: string): { c1Content?: string, textContent?: string } {
    // Ensure we have a string
    if (typeof rawContent !== 'string') {
      return { textContent: JSON.stringify(rawContent) };
    }

    /* --------------------------------------------------------------
     * 1. Decode HTML entities (&lt;, &gt;, &quot;, etc.)
     * ------------------------------------------------------------ */
    const decoded = (() => {
      // Small, DOM-based decoder works in all browsers / Electron / Tauri
      try {
        const txt = document.createElement('textarea');
        txt.innerHTML = rawContent;
        return txt.value;
      } catch {
        // Fallback – very small subset we actually see
        return rawContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
      }
    })();

    /* --------------------------------------------------------------
     * 2. Extract inner JSON wrapped by <content> … </content>
     * ------------------------------------------------------------ */
    // Use a single back-slash in the character class and closing tag; the
    // double-escaped version broke esbuild parsing.
    const match = decoded.match(/<content>([\s\S]*?)<\/content>/);
    if (match && match[1]) {
      return { c1Content: match[1] };
    }

    // No <content> wrapper → treat as plain text
    return { textContent: decoded };
  }

  /**
   * Handle WebSocket message event
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    console.log(`[WS:${this.connectionLogId}] WebSocket message received:`, event.data);
    
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'connection_ack':
          console.log(`[WS:${this.connectionLogId}] WebSocket connection acknowledged:`, data.message);
          break;
          
        case 'immediate_voice_response':
        case 'voice_response':
        case 'text_chat_response': {
          console.log(`[WS:${this.connectionLogId}] Received ${data.type} message:`, data);
          
          const assistantMessage: AssistantMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant',
            content: data.content || '',
            contentType: data.contentType || 'c1', // Default to C1 for backward compatibility
            hasVoiceOver: data.isVoiceOverOnly || false,
            timestamp: new Date()
          };
          this.emit(ConnectionEvent.MESSAGE_RECEIVED, assistantMessage);
          break;
        }
          
        case 'user_transcription': {
          console.log(`[WS:${this.connectionLogId}] Received user transcription message:`, data);
          // Only process final transcriptions into messages
          if (data.final === false) break;

          const userMessage: UserMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'user',
            content: data.content,
            timestamp: new Date()
          };
          this.emit(ConnectionEvent.MESSAGE_RECEIVED, userMessage);
          
          // Also emit the raw transcription event for other potential uses
          this.emit(ConnectionEvent.TRANSCRIPTION, {
            id: data.id,
            text: data.content,
            final: true
          });
          break;
        }
          
        case 'c1_token': {
          // Streaming C1Component chunks handler
          const msgId = data.id;
          if (typeof msgId === 'string') {
            console.log(`[WS:${this.connectionLogId}] Processing c1_token for message ID: ${msgId}`);
            
            // Check if this is the first chunk for this message ID
            if (this.streamingMessageId !== msgId) {
              console.log(`[WS:${this.connectionLogId}] First c1_token chunk for message ${msgId}`);
              
              // Initialize streaming state
              this.streamingMessageId = msgId;
              this.streamingContent = data.content || '';
              this.streamingContentType = 'c1'; // Track content type
              
              // Emit streaming started event
              this.emit(ConnectionEvent.STREAMING_STARTED, {
                id: msgId,
                content: this.streamingContent,
                contentType: 'c1' // Mark as C1 content
              });
            } else {
              // Accumulate content for subsequent chunks
              console.log(`[WS:${this.connectionLogId}] Accumulating content for streaming message ${msgId}`);
              this.streamingContent += (data.content || '');
              
              // Emit streaming chunk event
              this.emit(ConnectionEvent.STREAMING_CHUNK, {
                id: msgId,
                content: data.content || '',
                accumulatedContent: this.streamingContent,
                contentType: 'c1' // Mark as C1 content
              });
            }
          }
          break;
        }
          
        case 'html_token': {
          // Streaming HTML chunks handler (for OpenAI, Anthropic, etc.)
          const msgId = data.id;
          if (typeof msgId === 'string') {
            console.log(`[WS:${this.connectionLogId}] Processing html_token for message ID: ${msgId}`);
            
            // Check if this is the first chunk for this message ID
            if (this.streamingMessageId !== msgId) {
              console.log(`[WS:${this.connectionLogId}] First html_token chunk for message ${msgId}`);
              
              // Initialize streaming state
              this.streamingMessageId = msgId;
              this.streamingContent = data.content || '';
              this.streamingContentType = 'html'; // Track content type
              
              // Emit streaming started event
              this.emit(ConnectionEvent.STREAMING_STARTED, {
                id: msgId,
                content: this.streamingContent,
                contentType: 'html' // Mark as HTML content
              });
            } else {
              // Accumulate content for subsequent chunks
              console.log(`[WS:${this.connectionLogId}] Accumulating HTML content for streaming message ${msgId}`);
              this.streamingContent += (data.content || '');
              
              // Emit streaming chunk event
              this.emit(ConnectionEvent.STREAMING_CHUNK, {
                id: msgId,
                content: data.content || '',
                accumulatedContent: this.streamingContent,
                contentType: 'html' // Mark as HTML content
              });
            }
          }
          break;
        }
          
        case 'chat_done': {
          // End-of-stream marker
          const doneId = data.id;
          if (typeof doneId === 'string' && this.streamingMessageId === doneId) {
            console.log(`[WS:${this.connectionLogId}] Received chat_done for message ${doneId}`);

            /* ----------------------------------------------------------------
             * 1. Build **final assistant message** from the accumulated stream
             * ---------------------------------------------------------------- */
            if (this.streamingContent.trim().length > 0) {
              const finalAssistant: AssistantMessage = {
                id: doneId,
                role: 'assistant',
                content: this.streamingContent,
                contentType: this.streamingContentType, // Use the streaming content type directly
                timestamp: new Date(),
              };

              // Surface to consumers before we clear the buffer
              this.emit(ConnectionEvent.MESSAGE_RECEIVED, finalAssistant);
            }

            /* ----------------------------------------------------------------
             * 2. Notify listeners that streaming is complete
             * ---------------------------------------------------------------- */
            this.emit(ConnectionEvent.STREAMING_DONE, {
              id: doneId,
              content: this.streamingContent
            });
            
            // Reset streaming state
            this.streamingMessageId = null;
            this.streamingContent = '';
            this.streamingContentType = 'c1';
          }
          break;
        }
          
        case 'enhancement_started':
          // Slow path (visualisation) signalled it is working on UI
          console.log(`[WS:${this.connectionLogId}] Enhancement in progress`);
          this.emit(ConnectionEvent.ENHANCEMENT_STARTED);
          break;

        // Per-connection specific message types
        case 'connection_established':
          console.log(`[WS:${this.connectionLogId}] Per-connection established:`, data.connection_id);
          // Set backend connection ID for voice connections
          if (data.connection_id && !this.backendConnectionId) {
            this.backendConnectionId = data.connection_id;
            console.log(`[WS:${this.connectionLogId}] Backend connection ID set: ${data.connection_id}`);
          }
          break;
          
        case 'connection_state':
          console.log(`[WS:${this.connectionLogId}] Per-connection state:`, data.state, data.message);
          if (data.state === 'disconnecting') {
            this.setConnectionState('disconnected');
          }
          break;
          
        case 'error':
          console.error(`[WS:${this.connectionLogId}] Server error:`, data.message);
          this.emit(ConnectionEvent.ERROR, new Error(data.message || 'Server error'));
          break;
          
        default:
          console.log(`[WS:${this.connectionLogId}] Received unknown message type:`, data.type, data);
          break;
      }
    } catch (error) {
      console.error(`[WS:${this.connectionLogId}] Error processing WebSocket message:`, error);
      this.emit(ConnectionEvent.ERROR, error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleWebSocketError(error: Event): void {
    console.error(`[WS:${this.connectionLogId}] WebSocket error:`, error);
    this.setConnectionState('error');
    this.emit(ConnectionEvent.ERROR, error);
    this.handleReconnect();
  }

  /**
   * Handle WebSocket close event
   */
  private handleWebSocketClose(event: CloseEvent): void {
    console.log(`[WS:${this.connectionLogId}] WebSocket disconnected:`, event);
    this.setConnectionState('disconnected');
    this.webSocket = null;
    
    // Clear backend connection ID since it's no longer valid
    const wasConnected = this.backendConnectionId !== null;
    this.backendConnectionId = null;
    
    // If voice was connected, set it to disconnected (will need to reconnect when WebSocket comes back)
    if (this.voiceState === 'connected') {
      console.log(`[WS:${this.connectionLogId}] Voice connection lost due to WebSocket disconnect`);
      this.setVoiceState('disconnected');
    }
    
    if (this.autoReconnect && wasConnected) {
      console.log(`[WS:${this.connectionLogId}] Starting WebSocket reconnection process...`);
      this.handleReconnect();
    }
  }

  /**
   * Handle data channel message
   */
  private handleDataChannelMessage(event: MessageEvent): void {
    console.log('WebRTC transcript message received via data channel:', event.data);
    
    try {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'user-stopped-speaking') {
        this.emit(ConnectionEvent.VOICE_STATE_CHANGED, 'user-stopped');
      } else if (msg.type === 'bot-started-speaking') {
        this.emit(ConnectionEvent.VOICE_STATE_CHANGED, 'bot-started');
      } else if (msg.type === 'user_transcription' && msg.data?.final) {
        // When a final transcript arrives via WebRTC, treat it like a message
        const userMessage: UserMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: msg.data.text,
            timestamp: new Date(msg.data.timestamp)
        };
        this.emit(ConnectionEvent.MESSAGE_RECEIVED, userMessage);
      }
    } catch (err) {
      console.error('Error parsing transcript JSON:', err);
    }
  }

  /**
   * Handle reconnection logic with WebSocket-first pattern
   */
  private handleReconnect(): void {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[WS:${this.connectionLogId}] Not reconnecting: autoReconnect=${this.autoReconnect}, attempts=${this.reconnectAttempts}, max=${this.maxReconnectAttempts}`);
      return;
    }
    
    this.reconnectAttempts++;
    
    console.log(`[WS:${this.connectionLogId}] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        // Re-establish WebSocket connection first
        await this.connectWebSocket();
        
        // Wait for backend connection ID to be received
        if (!this.backendConnectionId) {
          console.log(`[WS:${this.connectionLogId}] Waiting for backend connection ID after reconnect...`);
          await this.waitForBackendConnectionId();
        }
        
        console.log(`[WS:${this.connectionLogId}] WebSocket reconnection successful, backend ID: ${this.backendConnectionId}`);
        
        // Note: Voice connection will need to be manually re-established by user
        // This is by design - we don't automatically reconnect voice to avoid unexpected behavior
        
      } catch (error) {
        console.error(`[WS:${this.connectionLogId}] Reconnection failed:`, error);
        // The error handling will trigger another reconnection attempt if needed
      }
    }, this.reconnectInterval);
  }

  /**
   * Safely close WebSocket connection
   */
  private closeWebSocket(): void {
    const ws = this.webSocket;
    if (!ws) return;
    
    try {
      console.log(`[WS:${this.connectionLogId}] Closing WebSocket connection...`);
      
      // Check if it's already closed or closing
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.log(`[WS:${this.connectionLogId}] WebSocket already closing/closed (state: ${ws.readyState})`);
        return;
      }
      
      // For CONNECTING state, we need to wait for connection to establish before closing
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`[WS:${this.connectionLogId}] WebSocket is connecting, setting up onopen handler to close immediately`);
        const originalOnOpen = ws.onopen;
        ws.onopen = (event) => {
          // Call original handler if exists
          if (originalOnOpen) {
            originalOnOpen.call(ws, event);
          }
          console.log(`[WS:${this.connectionLogId}] WebSocket connected, now closing immediately`);
          ws.close();
        };
        return;
      }
      
      // For OPEN state, just close it
      console.log(`[WS:${this.connectionLogId}] Closing open WebSocket connection`);
      ws.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }

  /**
   * Set the connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit(ConnectionEvent.STATE_CHANGED, state);
    }
  }

  /**
   * Set the voice state and emit event
   */
  private setVoiceState(state: VoiceConnectionState): void {
    if (this.voiceState !== state) {
      this.voiceState = state;
      this.emit(ConnectionEvent.VOICE_STATE_CHANGED, state);
    }
  }
  
  /**
   * Setup global interaction handlers for framework-generated content
   */
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') {
      console.log('ConnectionService: Cannot setup global handlers - window undefined (server-side)');
      return;
    }
    
    // Create global geuiSDK object
    (window as any).geuiSDK = {
      handleFormSubmit: this.handleFormSubmit.bind(this),
      handleButtonClick: this.handleButtonClick.bind(this),
      handleInputChange: this.handleInputChange.bind(this),
      sendInteraction: this.sendInteraction.bind(this)
    };
    
    console.log('ConnectionService: Global window.geuiSDK handlers set up successfully');
  }
  
  /**
   * Handle form submission from framework-generated content
   */
  private handleFormSubmit(event: Event, formId: string): void {
    console.log('ConnectionService: handleFormSubmit called', { formId, event });
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Convert FormData to object
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Create a user-friendly message describing the form submission
    const formFields = Object.entries(data)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    const userMessage = formFields 
      ? `📝 Submitted form: ${formFields}`
      : `📝 Submitted form "${formId}"`;
    
    // Add user message to chat
    this.addUserMessage(userMessage);
    
    this.sendInteraction('form_submit', {
      formId,
      formData: data,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.onFormSubmit) {
      this.onFormSubmit(formId, formData);
    }
  }
  
  /**
   * Handle button click from framework-generated content
   */
  private handleButtonClick(event: Event, actionType: string, context: any = {}): void {
    console.log('ConnectionService: handleButtonClick called', { actionType, context, event });
    event.preventDefault();
    
    // Create a user-friendly message describing the button click
    let userMessage = `🔘 Clicked "${actionType}"`;
    
    // Add context in a more readable format
    if (context && Object.keys(context).length > 0) {
      if (context.message) {
        userMessage = `🔘 ${context.message}`;
      } else {
        const contextStr = Object.entries(context)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        userMessage += ` (${contextStr})`;
      }
    }
    
    // Add user message to chat
    this.addUserMessage(userMessage);
    
    this.sendInteraction('button_click', {
      actionType,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.onButtonClick) {
      this.onButtonClick(actionType, context);
    }
  }
  
  /**
   * Handle input change from framework-generated content
   */
  private handleInputChange(event: Event, fieldName: string): void {
    console.log('ConnectionService: handleInputChange called', { fieldName, event });
    const input = event.target as HTMLInputElement;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    
    // Only show user message for significant input changes (not every keystroke)
    // Check if input has data-action attribute for real-time actions
    const hasAction = input.hasAttribute('data-action');
    if (hasAction) {
      const actionType = input.getAttribute('data-action') || 'input-change';
      const userMessage = input.type === 'checkbox' 
        ? `☑️ ${value ? 'Checked' : 'Unchecked'} "${fieldName}"`
        : `⌨️ Updated "${fieldName}": ${value}`;
      
      this.addUserMessage(userMessage);
    }
    
    this.sendInteraction('input_change', {
      fieldName,
      value,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.onInputChange) {
      this.onInputChange(fieldName, value);
    }
  }
  
  /**
   * Send interaction data to backend
   */
  private sendInteraction(type: string, context: any): void {
    this.sendMessage({
      type: 'user_interaction',
      interactionType: type,
      context
    });
  }
  
  /**
   * Send a message via WebSocket
   */
  private sendMessage(message: any): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }
    
    this.webSocket.send(JSON.stringify(message));
  }
  
  /**
   * Add a user message to the chat (for interaction display)
   */
  private addUserMessage(content: string): void {
    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    // Emit the message so it appears in the chat
    this.emit(ConnectionEvent.MESSAGE_RECEIVED, userMessage);
  }
}
