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
 * Options for the ConnectionService
 */
export interface ConnectionServiceOptions {
  webrtcURL?: string;
  websocketURL: string;
  mcpEndpoints?: MCPEndpoint[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * WebRTC connection options (currently unused but kept for future extension)
 */
// interface WebRTCOptions {
//   iceServers?: RTCIceServer[];
// }

/**
 * ConnectionService manages WebRTC and WebSocket connections for the Genux SDK
 */
export class ConnectionService extends EventEmitter {
  /**
   * Underlying endpoints are useful for consumers (e.g. `useGenuxClient`)
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
  
  // Unique ID for the WebSocket connection
  private wsConnectionId: string;

  /**
   * Create a new ConnectionService
   */
  constructor(options: ConnectionServiceOptions) {
    super();
    this.webrtcURL = options.webrtcURL;
    this.websocketURL = options.websocketURL;
    this._mcpEndpoints = options.mcpEndpoints; // Stored for future MCP integration
    console.log('MCP endpoints configured:', this._mcpEndpoints?.length || 0, 'endpoints'); // Use it to avoid TS error
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectInterval = options.reconnectInterval ?? 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.wsConnectionId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Initialize WebSocket connection
   */
  public async connectWebSocket(): Promise<void> {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log(`[WS:${this.wsConnectionId}] WebSocket already connected`);
      return;
    }

    this.setConnectionState('connecting');
    
    try {
      console.log(`[WS:${this.wsConnectionId}] Connecting to WebSocket at: ${this.websocketURL}`);
      this.webSocket = new WebSocket(this.websocketURL);
      
      this.webSocket.onopen = this.handleWebSocketOpen.bind(this);
      this.webSocket.onmessage = this.handleWebSocketMessage.bind(this);
      this.webSocket.onerror = this.handleWebSocketError.bind(this);
      this.webSocket.onclose = this.handleWebSocketClose.bind(this);
    } catch (error) {
      console.error(`[WS:${this.wsConnectionId}] Error connecting to WebSocket:`, error);
      this.setConnectionState('error');
      this.emit(ConnectionEvent.ERROR, error);
      this.handleReconnect();
    }
  }

  /**
   * Initialize WebRTC connection for voice
   */
  public async connectVoice(): Promise<void> {
    if (!this.webrtcURL) {
      console.log('Voice is disabled (no webrtcURL provided)');
      return;
    }

    if (this.voiceState === 'connected' || this.voiceState === 'connecting') {
      console.log('Voice already connected or connecting');
      return;
    }

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

      // Send offer to backend
      const response = await fetch(this.webrtcURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
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
  public sendChatMessage(message: string, threadId?: string): string {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    const messageId = crypto.randomUUID();
    
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
  public sendC1Action(action: { llmFriendlyMessage: string }, threadId?: string): string {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    const messageId = crypto.randomUUID();
    
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
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(): void {
    console.log(`[WS:${this.wsConnectionId}] WebSocket connected`);
    this.setConnectionState('connected');
    this.reconnectAttempts = 0;
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
    console.log(`[WS:${this.wsConnectionId}] WebSocket message received:`, event.data);
    
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'connection_ack':
          console.log(`[WS:${this.wsConnectionId}] WebSocket connection acknowledged:`, data.message);
          break;
          
        case 'immediate_voice_response':
        case 'voice_response':
        case 'text_chat_response': {
          console.log(`[WS:${this.wsConnectionId}] Received ${data.type} message:`, data);
          const { c1Content, textContent } = this._parseAssistantContent(data.content);
          const assistantMessage: AssistantMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant',
            content: textContent,
            c1Content: c1Content,
            hasVoiceOver: data.isVoiceOverOnly || false,
            timestamp: new Date()
          };
          this.emit(ConnectionEvent.MESSAGE_RECEIVED, assistantMessage);
          break;
        }
          
        case 'user_transcription': {
          console.log(`[WS:${this.wsConnectionId}] Received user transcription message:`, data);
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
            console.log(`[WS:${this.wsConnectionId}] Processing c1_token for message ID: ${msgId}`);
            
            // Check if this is the first chunk for this message ID
            if (this.streamingMessageId !== msgId) {
              console.log(`[WS:${this.wsConnectionId}] First c1_token chunk for message ${msgId}`);
              
              // Initialize streaming state
              this.streamingMessageId = msgId;
              this.streamingContent = data.content || '';
              
              // Emit streaming started event
              this.emit(ConnectionEvent.STREAMING_STARTED, {
                id: msgId,
                content: this.streamingContent
              });
            } else {
              // Accumulate content for subsequent chunks
              console.log(`[WS:${this.wsConnectionId}] Accumulating content for streaming message ${msgId}`);
              this.streamingContent += (data.content || '');
              
              // Emit streaming chunk event
              this.emit(ConnectionEvent.STREAMING_CHUNK, {
                id: msgId,
                content: data.content || '',
                accumulatedContent: this.streamingContent
              });
            }
          }
          break;
        }
          
        case 'chat_done': {
          // End-of-stream marker
          const doneId = data.id;
          if (typeof doneId === 'string' && this.streamingMessageId === doneId) {
            console.log(`[WS:${this.wsConnectionId}] Received chat_done for message ${doneId}`);

            /* ----------------------------------------------------------------
             * 1. Build **final assistant message** from the accumulated stream
             * ---------------------------------------------------------------- */
            if (this.streamingContent.trim().length > 0) {
              const { c1Content, textContent } = this._parseAssistantContent(
                this.streamingContent,
              );

              const finalAssistant: AssistantMessage = {
                id: doneId,
                role: 'assistant',
                content: textContent,
                c1Content,
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
          }
          break;
        }
          
        case 'enhancement_started':
          // Slow path (visualisation) signalled it is working on UI
          console.log(`[WS:${this.wsConnectionId}] Enhancement in progress`);
          this.emit(ConnectionEvent.ENHANCEMENT_STARTED);
          break;
          
        default:
          console.log(`[WS:${this.wsConnectionId}] Received unknown message type:`, data.type, data);
          break;
      }
    } catch (error) {
      console.error(`[WS:${this.wsConnectionId}] Error processing WebSocket message:`, error);
      this.emit(ConnectionEvent.ERROR, error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleWebSocketError(error: Event): void {
    console.error(`[WS:${this.wsConnectionId}] WebSocket error:`, error);
    this.setConnectionState('error');
    this.emit(ConnectionEvent.ERROR, error);
    this.handleReconnect();
  }

  /**
   * Handle WebSocket close event
   */
  private handleWebSocketClose(event: CloseEvent): void {
    console.log(`[WS:${this.wsConnectionId}] WebSocket disconnected:`, event);
    this.setConnectionState('disconnected');
    this.webSocket = null;
    
    if (this.autoReconnect) {
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
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[WS:${this.wsConnectionId}] Not reconnecting: autoReconnect=${this.autoReconnect}, attempts=${this.reconnectAttempts}, max=${this.maxReconnectAttempts}`);
      return;
    }
    
    this.reconnectAttempts++;
    
    console.log(`[WS:${this.wsConnectionId}] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectInterval);
  }

  /**
   * Safely close WebSocket connection
   */
  private closeWebSocket(): void {
    const ws = this.webSocket;
    if (!ws) return;
    
    try {
      console.log(`[WS:${this.wsConnectionId}] Closing WebSocket connection...`);
      
      // Check if it's already closed or closing
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.log(`[WS:${this.wsConnectionId}] WebSocket already closing/closed (state: ${ws.readyState})`);
        return;
      }
      
      // For CONNECTING state, we need to wait for connection to establish before closing
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`[WS:${this.wsConnectionId}] WebSocket is connecting, setting up onopen handler to close immediately`);
        const originalOnOpen = ws.onopen;
        ws.onopen = (event) => {
          // Call original handler if exists
          if (originalOnOpen) {
            originalOnOpen.call(ws, event);
          }
          console.log(`[WS:${this.wsConnectionId}] WebSocket connected, now closing immediately`);
          ws.close();
        };
        return;
      }
      
      // For OPEN state, just close it
      console.log(`[WS:${this.wsConnectionId}] Closing open WebSocket connection`);
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
}
