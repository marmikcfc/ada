import EventEmitter from 'eventemitter3';
import { 
  ConnectionState, 
  VoiceConnectionState, 
  MCPEndpoint,
  UserMessage
} from '../types';

/**
 * Thread-specific connection information
 */
interface ThreadConnectionInfo {
  threadId: string;
  websocketConnectionId?: string;
  webrtcConnectionId?: string;
  websocketState: ConnectionState;
  webrtcState: VoiceConnectionState;
  lastActivity: Date;
}

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
  INTERACTION_PROCESSING = 'interaction_processing',
  INTERACTION_COMPLETE = 'interaction_complete',
  INTERACTION_LOADING = 'interaction_loading',
  ERROR = 'error',
  THREAD_SWITCH_START = 'thread_switch_start',
  THREAD_SWITCH_COMPLETE = 'thread_switch_complete',
  THREAD_SWITCH_ERROR = 'thread_switch_error'
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
  onLinkClick?: (href: string, context: any) => void;
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
  private onFormSubmit?: (formId: string, formData: FormData) => void;
  private onButtonClick?: (actionType: string, context: any) => void;
  private onInputChange?: (fieldName: string, value: any) => void;
  private onLinkClick?: (href: string, context: any) => void;
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
  
  // Configuration state tracking
  private configurationState: 'none' | 'pending' | 'sent' | 'accepted' = 'none';
  private configurationPromise: Promise<void> | null = null;
  private configurationResolve: (() => void) | null = null;
  
  // Simple connection identifier for logging (generated locally)
  private connectionLogId: string;
  
  // Thread management for voice isolation
  private activeThreadId: string | null = null;
  private threadVoiceMapping: Map<string, boolean> = new Map(); // Track which threads have voice enabled
  private threadConnections: Map<string, ThreadConnectionInfo> = new Map(); // Track connection info per thread
  
  // Interaction processing state management
  private processingInteractions: Map<string, { type: string, timestamp: number }> = new Map();
  private interactionDebounceMap: Map<string, NodeJS.Timeout> = new Map();

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
    this.onFormSubmit = options.onFormSubmit;
    this.onButtonClick = options.onButtonClick;
    this.onInputChange = options.onInputChange;
    this.onLinkClick = options.onLinkClick;
    this.onWebSocketConnect = options.onWebSocketConnect;
    
    // Setup global interaction handlers
    this.setupGlobalHandlers();
  }

  /**
   * Initialize WebSocket connection
   */
  public async connectWebSocket(threadId?: string): Promise<void> {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] WebSocket already connected`);
      
      // If a thread ID is provided and different from current, switch to it
      if (threadId && threadId !== this.activeThreadId) {
        await this.switchToThread(threadId);
      }
      return;
    }

    // Set thread context if provided
    if (threadId) {
      this.setActiveThreadId(threadId);
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
   * Wait for configuration to be accepted by the backend
   */
  private async waitForConfiguration(): Promise<void> {
    // If configuration is already accepted, return immediately
    if (this.configurationState === 'accepted') {
      return;
    }
    
    // If there's already a promise waiting, return it
    if (this.configurationPromise) {
      return this.configurationPromise;
    }
    
    // Create a new promise for configuration
    this.configurationPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.configurationPromise = null;
        this.configurationResolve = null;
        this.configurationState = 'none';
        reject(new Error('Timeout waiting for configuration acceptance'));
      }, 30000); // 30 second timeout
      
      // Store resolve function to call when configuration is accepted
      this.configurationResolve = () => {
        clearTimeout(timeout);
        this.configurationPromise = null;
        this.configurationResolve = null;
        resolve();
      };
      
      // If configuration is already accepted by the time we set up the promise, resolve immediately
      if (this.configurationState === 'accepted') {
        this.configurationResolve();
      }
    });
    
    return this.configurationPromise;
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

      // Send offer to backend with backend connection ID and thread context for proper routing
      const response = await fetch(this.webrtcURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          backend_connection_id: this.backendConnectionId, // Include backend connection ID
          thread_id: this.activeThreadId, // Include thread context
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
      
      // Update thread connection info with WebRTC details
      if (this.activeThreadId) {
        this.setThreadConnectionInfo(this.activeThreadId, {
          webrtcConnectionId: this.backendConnectionId, // Using same connection ID for now
          webrtcState: 'connected'
        });
      }
      
    } catch (error) {
      console.error('Error connecting voice:', error);
      this.setVoiceState('disconnected');
      
      // Update thread connection info on error
      if (this.activeThreadId) {
        this.setThreadConnectionInfo(this.activeThreadId, {
          webrtcState: 'disconnected'
        });
      }
      
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
    // Use provided threadId or active thread
    const targetThreadId = threadId || this.activeThreadId;
    
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
    
    // Ensure configuration has been accepted
    if (this.configurationState !== 'accepted') {
      console.log(`[WS:${this.connectionLogId}] Waiting for configuration acceptance...`);
      await this.waitForConfiguration();
    }
    
    const messageId = crypto.randomUUID();
    
    if (!this.webSocket) {
      throw new Error('WebSocket is not connected');
    }
    
    // Update thread connection info if we have a thread
    if (targetThreadId) {
      this.setThreadConnectionInfo(targetThreadId, {
        websocketConnectionId: this.backendConnectionId || undefined,
        websocketState: this.connectionState
      });
    }
    
    this.webSocket.send(JSON.stringify({
      type: 'chat',
      message: message,
      thread_id: targetThreadId,
      id: messageId
    }));
    
    console.log(`[WS:${this.connectionLogId}] Sent message for thread: ${targetThreadId}`);
    
    return messageId;
  }

  /**
   * Send a C1Component action via WebSocket
   */
  public async sendC1Action(action: { llmFriendlyMessage: string }, threadId?: string): Promise<string> {
    // Use provided threadId or active thread
    const targetThreadId = threadId || this.activeThreadId;
    
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
    
    // Update thread connection info if we have a thread
    if (targetThreadId) {
      this.setThreadConnectionInfo(targetThreadId, {
        websocketConnectionId: this.backendConnectionId || undefined,
        websocketState: this.connectionState
      });
    }
    
    this.webSocket.send(JSON.stringify({
      type: 'thesys_bridge',
      prompt: { content: action.llmFriendlyMessage },
      thread_id: targetThreadId,
      responseId: messageId,
    }));
    
    console.log(`[WS:${this.connectionLogId}] Sent C1 action for thread: ${targetThreadId}`);
    
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
    
    // Clear all interaction processing states and debounce timers
    this.processingInteractions.clear();
    for (const [_key, timeout] of this.interactionDebounceMap.entries()) {
      clearTimeout(timeout);
    }
    this.interactionDebounceMap.clear();
    
    // Clean up all thread connections
    this.cleanupAllThreadConnections();
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
   * Get thread-specific connection information
   */
  public getThreadConnectionInfo(threadId: string): ThreadConnectionInfo | undefined {
    return this.threadConnections.get(threadId);
  }

  /**
   * Set thread-specific connection information
   */
  public setThreadConnectionInfo(threadId: string, info: Partial<ThreadConnectionInfo>): void {
    const existing = this.threadConnections.get(threadId) || {
      threadId,
      websocketState: 'disconnected' as ConnectionState,
      webrtcState: 'disconnected' as VoiceConnectionState,
      lastActivity: new Date()
    };
    
    const updated: ThreadConnectionInfo = {
      ...existing,
      ...info,
      lastActivity: new Date()
    };
    
    this.threadConnections.set(threadId, updated);
    console.log(`[WS:${this.connectionLogId}] Updated thread connection info for ${threadId}:`, updated);
  }

  /**
   * Disconnect a specific thread's connections
   */
  public async disconnectThread(threadId: string): Promise<void> {
    console.log(`[WS:${this.connectionLogId}] Disconnecting thread: ${threadId}`);
    
    const threadInfo = this.threadConnections.get(threadId);
    if (!threadInfo) {
      console.log(`[WS:${this.connectionLogId}] No connection info found for thread: ${threadId}`);
      return;
    }
    
    // If this is the active thread, disconnect everything
    if (this.activeThreadId === threadId) {
      // Disconnect voice if active
      if (this.voiceState === 'connected') {
        this.disconnectVoice();
      }
      
      // Clear active thread
      this.activeThreadId = null;
      
      // Update thread connection info
      this.setThreadConnectionInfo(threadId, {
        websocketState: 'disconnected',
        webrtcState: 'disconnected'
      });
    }
    
    // Remove thread from connections map after a delay (to allow for reconnection)
    setTimeout(() => {
      if (this.activeThreadId !== threadId) {
        this.threadConnections.delete(threadId);
        console.log(`[WS:${this.connectionLogId}] Removed connection info for thread: ${threadId}`);
      }
    }, 30000); // Keep for 30 seconds in case of quick switch back
  }

  /**
   * Clean up all thread connections
   */
  public cleanupAllThreadConnections(): void {
    console.log(`[WS:${this.connectionLogId}] Cleaning up all thread connections`);
    
    // Disconnect all threads
    for (const [threadId, _info] of this.threadConnections) {
      this.disconnectThread(threadId).catch(error => {
        console.error(`Error disconnecting thread ${threadId}:`, error);
      });
    }
    
    // Clear the map
    this.threadConnections.clear();
    
    // Clear active thread
    this.activeThreadId = null;
  }

  /**
   * Get all active thread connections
   */
  public getActiveThreadConnections(): Map<string, ThreadConnectionInfo> {
    return new Map(this.threadConnections);
  }

  /**
   * Disconnect the current thread cleanly
   */
  public async disconnectCurrentThread(): Promise<void> {
    if (!this.activeThreadId) {
      console.log(`[WS:${this.connectionLogId}] No active thread to disconnect`);
      return;
    }

    const threadId = this.activeThreadId;
    console.log(`[WS:${this.connectionLogId}] Disconnecting current thread: ${threadId}`);

    // 1. Close voice if active
    if (this.voiceState === 'connected') {
      console.log(`[WS:${this.connectionLogId}] Disconnecting voice for thread: ${threadId}`);
      this.disconnectVoice();
    }

    // 2. Backend will handle thread context via the next connection
    // No need to send explicit disconnect message as backend doesn't support it
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log(`[WS:${this.connectionLogId}] Thread ${threadId} will be disconnected with WebSocket close`);
      // Give backend a moment to finish any pending operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 3. Update thread connection info before closing
    this.setThreadConnectionInfo(threadId, {
      websocketState: 'disconnected',
      webrtcState: 'disconnected',
      websocketConnectionId: undefined,
      webrtcConnectionId: undefined
    });

    // 4. Close WebSocket connection
    this.closeWebSocket();

    // 5. Clear connection state
    this.setConnectionState('disconnected');
    this.backendConnectionId = null;
    this.activeThreadId = null;

    console.log(`[WS:${this.connectionLogId}] Thread ${threadId} disconnected successfully`);
  }

  /**
   * Switch to a different thread (disconnect current, connect new)
   */
  public async switchToThread(threadId: string): Promise<void> {
    console.log(`[WS:${this.connectionLogId}] Switching to thread: ${threadId}`);
    
    // If switching to the same thread, do nothing
    if (this.activeThreadId === threadId) {
      console.log(`[WS:${this.connectionLogId}] Already on thread: ${threadId}`);
      return;
    }

    // Emit thread switch start event
    this.emit(ConnectionEvent.THREAD_SWITCH_START, {
      fromThread: this.activeThreadId,
      toThread: threadId
    });

    try {
      // 1. Disconnect current thread completely
      await this.disconnectCurrentThread();

      // 2. Set new active thread
      this.setActiveThreadId(threadId);

      // 3. Re-establish WebSocket connection with new thread context
      console.log(`[WS:${this.connectionLogId}] Establishing connection for thread: ${threadId}`);
      await this.connectWebSocket(threadId);

      // 4. Wait for connection to be established and get backend ID
      await this.waitForBackendConnectionId();

      // 5. Update thread connection info
      this.setThreadConnectionInfo(threadId, {
        websocketState: this.connectionState,
        websocketConnectionId: this.backendConnectionId || undefined
      });

      // 6. Thread context is now included in regular chat messages
      // No need to send a separate thread_context message as backend doesn't support it
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN && this.backendConnectionId) {
        console.log(`[WS:${this.connectionLogId}] Thread context established for: ${threadId}, ready for messages`);
      }

      // 7. Restore voice if it was enabled for this thread
      if (this.isVoiceEnabledForThread(threadId) && this.webrtcURL) {
        console.log(`[WS:${this.connectionLogId}] Restoring voice for thread: ${threadId}`);
        await this.connectVoice(threadId);
      }

      // Emit thread switch complete event
      this.emit(ConnectionEvent.THREAD_SWITCH_COMPLETE, {
        threadId,
        connectionId: this.backendConnectionId
      });

      console.log(`[WS:${this.connectionLogId}] Thread switch to ${threadId} completed successfully`);
    } catch (error) {
      console.error(`[WS:${this.connectionLogId}] Error switching to thread ${threadId}:`, error);
      
      // Emit thread switch error event
      this.emit(ConnectionEvent.THREAD_SWITCH_ERROR, {
        threadId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(): void {
    console.log(`[WS:${this.connectionLogId}] WebSocket connected`);
    this.setConnectionState('connected');
    this.reconnectAttempts = 0;
    
    // Reset configuration state for new connection
    this.configurationState = 'pending';
    this.configurationPromise = null;
    this.configurationResolve = null;
    
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
    
    // Thread context is now included in regular chat messages
    // No need to send a separate thread_context message
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
          
          // Preserve the role from the backend if provided, otherwise default to 'assistant'
          const messageRole = data.role || 'assistant';
          console.log(`[WS:${this.connectionLogId}] Message role: ${messageRole} (from backend: ${data.role})`);
          
          const message = {
            id: data.id || crypto.randomUUID(),
            role: messageRole as 'user' | 'assistant',
            content: data.content || '',
            contentType: data.contentType || 'c1', // Default to C1 for backward compatibility
            hasVoiceOver: data.isVoiceOverOnly || false,
            timestamp: new Date()
          };
          
          // Filter out duplicate messages that come from backend
          if (messageRole === 'user' && typeof data.content === 'string') {
            const content = data.content.trim();
            
            // Skip "Updated [field]" messages - these are input changes
            if (content.startsWith('Updated ') && content.includes(':')) {
              console.log(`[WS:${this.connectionLogId}] Filtering out input update message:`, content);
              break;
            }
            
            // Skip backend's form submission messages since we already show our own
            if (content.startsWith('Submitted ') && content.includes('with:')) {
              console.log(`[WS:${this.connectionLogId}] Filtering out duplicate form submission message:`, content);
              break;
            }
          }
          
          this.emit(ConnectionEvent.MESSAGE_RECEIVED, message);
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
             * 1. Build **final message** from the accumulated stream
             * ---------------------------------------------------------------- */
            if (this.streamingContent.trim().length > 0) {
              // Preserve the role from the backend if provided, otherwise default to 'assistant'
              const messageRole = data.role || 'assistant';
              console.log(`[WS:${this.connectionLogId}] Final streaming message role: ${messageRole} (from backend: ${data.role})`);
              
              const finalMessage = {
                id: doneId,
                role: messageRole as 'user' | 'assistant',
                content: this.streamingContent,
                contentType: this.streamingContentType, // Use the streaming content type directly
                timestamp: new Date(),
              };

              // Surface to consumers before we clear the buffer
              this.emit(ConnectionEvent.MESSAGE_RECEIVED, finalMessage);
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
          
          // Track configuration state
          if (data.state === 'config_received') {
            this.configurationState = 'sent';
            console.log(`[WS:${this.connectionLogId}] Configuration sent, waiting for processing...`);
          } else if (data.state === 'ready' || data.state === 'active') {
            // Configuration has been accepted and connection is ready
            this.configurationState = 'accepted';
            console.log(`[WS:${this.connectionLogId}] Configuration accepted, connection ready`);
            
            // Resolve any pending configuration promise
            if (this.configurationResolve) {
              this.configurationResolve();
            }
          } else if (data.state === 'disconnecting') {
            this.setConnectionState('disconnected');
            this.configurationState = 'none';
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
    
    // Reset configuration state
    this.configurationState = 'none';
    this.configurationPromise = null;
    this.configurationResolve = null;
    
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
   * Helper methods for interaction processing state management
   */
  private generateInteractionKey(type: string, identifier: string): string {
    return `${type}:${identifier}`;
  }
  
  private isInteractionProcessing(type: string, identifier: string): boolean {
    const key = this.generateInteractionKey(type, identifier);
    const processing = this.processingInteractions.get(key);
    if (processing) {
      // Check if the interaction is still recent (within 5 seconds)
      const now = Date.now();
      if (now - processing.timestamp > 5000) {
        this.processingInteractions.delete(key);
        return false;
      }
      return true;
    }
    return false;
  }
  
  private markInteractionProcessing(type: string, identifier: string): void {
    const key = this.generateInteractionKey(type, identifier);
    this.processingInteractions.set(key, { type, timestamp: Date.now() });
    this.emit(ConnectionEvent.INTERACTION_PROCESSING, { type, identifier, processing: true });
  }
  
  private markInteractionComplete(type: string, identifier: string): void {
    const key = this.generateInteractionKey(type, identifier);
    this.processingInteractions.delete(key);
    this.emit(ConnectionEvent.INTERACTION_COMPLETE, { type, identifier, processing: false });
  }
  
  /**
   * Public method to check if an interaction is currently processing
   */
  public checkInteractionProcessing(type: string, identifier: string): boolean {
    return this.isInteractionProcessing(type, identifier);
  }
  
  /**
   * Public method to get all currently processing interactions
   */
  public getProcessingInteractions(): Array<{ type: string; identifier: string; processing: boolean; timestamp: number }> {
    const result: Array<{ type: string; identifier: string; processing: boolean; timestamp: number }> = [];
    for (const [key, data] of this.processingInteractions.entries()) {
      const [type, identifier] = key.split(':', 2);
      result.push({
        type,
        identifier,
        processing: true,
        timestamp: data.timestamp
      });
    }
    return result;
  }
  
  private debounceInteraction(key: string, callback: () => void, delay: number = 300): void {
    // Clear existing timeout for this key
    const existingTimeout = this.interactionDebounceMap.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      callback();
      this.interactionDebounceMap.delete(key);
    }, delay);
    
    this.interactionDebounceMap.set(key, timeoutId);
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
      handleLinkClick: this.handleLinkClick.bind(this),
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
    
    // Check if this form is already being processed
    if (this.isInteractionProcessing('form_submit', formId)) {
      console.log('⏭️ Form submission already in progress, ignoring duplicate');
      return;
    }
    
    // Mark as processing immediately to prevent duplicates
    this.markInteractionProcessing('form_submit', formId);
    
    // Emit loading event to trigger "thinking" message
    console.log('🚀 ConnectionService: Emitting INTERACTION_LOADING event for form submit');
    this.emit(ConnectionEvent.INTERACTION_LOADING);
    
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
    
    // Send the interaction with debouncing
    const debounceKey = `form_submit:${formId}`;
    this.debounceInteraction(debounceKey, () => {
      this.sendInteraction('form_submit', {
        formId,
        formData: data,
        timestamp: new Date().toISOString()
      });
    }, 100); // Short debounce for form submissions
    
    // Call custom handler if provided
    if (this.onFormSubmit) {
      this.onFormSubmit(formId, formData);
    }
    
    // Mark as complete after a short delay to allow for processing
    setTimeout(() => {
      this.markInteractionComplete('form_submit', formId);
    }, 1000);
  }
  
  /**
   * Handle button click from framework-generated content
   */
  private handleButtonClick(event: Event, actionType: string, context: any = {}): void {
    console.log('ConnectionService: handleButtonClick called', { actionType, context, event });
    event.preventDefault();
    
    const buttonId = `${actionType}-${JSON.stringify(context)}`;
    
    // Check if this button click is already being processed
    if (this.isInteractionProcessing('button_click', buttonId)) {
      console.log('⏭️ Button click already in progress, ignoring duplicate');
      return;
    }
    
    // Mark as processing immediately to prevent duplicates
    this.markInteractionProcessing('button_click', buttonId);
    
    // Emit loading event to trigger "thinking" message
    console.log('🚀 ConnectionService: Emitting INTERACTION_LOADING event for button click');
    this.emit(ConnectionEvent.INTERACTION_LOADING);
    
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
    
    // Send the interaction with debouncing
    const debounceKey = `button_click:${buttonId}`;
    this.debounceInteraction(debounceKey, () => {
      this.sendInteraction('button_click', {
        actionType,
        context,
        timestamp: new Date().toISOString()
      });
    }, 200); // Slightly longer debounce for button clicks
    
    // Call custom handler if provided
    if (this.onButtonClick) {
      this.onButtonClick(actionType, context);
    }
    
    // Mark as complete after a short delay
    setTimeout(() => {
      this.markInteractionComplete('button_click', buttonId);
    }, 1000);
  }
  
  /**
   * Handle input change from framework-generated content
   */
  private handleInputChange(event: Event, fieldName: string): void {
    console.log('ConnectionService: handleInputChange called', { fieldName, event });
    const input = event.target as HTMLInputElement;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    
    // Use debouncing for input changes to avoid excessive backend calls
    const debounceKey = `input_change:${fieldName}`;
    this.debounceInteraction(debounceKey, () => {
      // Don't show user messages for input changes - too noisy
      // Only send the interaction to backend for processing
      
      this.sendInteraction('input_change', {
        fieldName,
        value,
        timestamp: new Date().toISOString()
      });
      
      // Call custom handler if provided
      if (this.onInputChange) {
        this.onInputChange(fieldName, value);
      }
    }, 500); // Longer debounce for input changes to reduce noise
  }
  
  /**
   * Handle link click from framework-generated content
   */
  private handleLinkClick(event: Event, href: string, context: any = {}): void {
    console.log('ConnectionService: handleLinkClick called', { href, context, event });
    event.preventDefault();
    
    const linkId = `${href}-${JSON.stringify(context)}`;
    
    // Check if this link click is already being processed
    if (this.isInteractionProcessing('link_click', linkId)) {
      console.log('⏭️ Link click already in progress, ignoring duplicate');
      return;
    }
    
    // Mark as processing immediately to prevent duplicates
    this.markInteractionProcessing('link_click', linkId);
    
    // Emit loading event to trigger "thinking" message
    console.log('🚀 ConnectionService: Emitting INTERACTION_LOADING event for link click');
    this.emit(ConnectionEvent.INTERACTION_LOADING);
    
    // Create a user-friendly message describing the link click
    let userMessage = `🔗 Clicked link`;
    
    // Add context in a more readable format
    if (context && context.text) {
      userMessage = `🔗 Clicked "${context.text}"`;
    } else if (href) {
      // Extract meaningful text from href
      const urlParts = href.split('/');
      const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      if (lastPart && !lastPart.includes('://')) {
        userMessage = `🔗 Clicked "${decodeURIComponent(lastPart).replace(/[-_]/g, ' ')}"`;
      } else {
        userMessage = `🔗 Clicked link to ${new URL(href, window.location.href).hostname}`;
      }
    }
    
    // Add additional context if provided
    if (context && Object.keys(context).length > 0 && !context.text) {
      const contextStr = Object.entries(context)
        .filter(([key]) => key !== 'text')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (contextStr) {
        userMessage += ` (${contextStr})`;
      }
    }
    
    // Add user message to chat
    this.addUserMessage(userMessage);
    
    // Send the interaction with debouncing
    const debounceKey = `link_click:${linkId}`;
    this.debounceInteraction(debounceKey, () => {
      this.sendInteraction('link_click', {
        href,
        context,
        timestamp: new Date().toISOString()
      });
    }, 200); // Same debounce as button clicks
    
    // Call custom handler if provided
    if (this.onLinkClick) {
      this.onLinkClick(href, context);
    }
    
    // Mark as complete after a short delay
    setTimeout(() => {
      this.markInteractionComplete('link_click', linkId);
    }, 1000);
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
    
    // Include thread_id if we have an active thread
    const messageWithThread = {
      ...message,
      thread_id: this.activeThreadId
    };
    
    this.webSocket.send(JSON.stringify(messageWithThread));
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
