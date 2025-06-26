/**
 * Core type definitions for the Myna SDK
 */

/**
 * Main props interface for the Myna component
 */
export interface MynaProps {
  /** WebRTC endpoint URL for voice communication */
  webrtcURL: string;
  /** WebSocket endpoint URL for message streaming */
  websocketURL: string;
  /** Whether to show the floating chat button */
  bubbleEnabled?: boolean;
  /** Whether to show the thread manager sidebar */
  showThreadManager?: boolean;
  /** Additional configuration options */
  options?: MynaOptions;
}

/**
 * Configuration options for the Myna SDK
 */
export interface MynaOptions {
  /** Visualization provider configuration */
  visualization?: {
    /** The provider to use for rendering assistant messages */
    provider: 'default' | 'custom' | 'none';
    /** Custom render function (only when provider === 'custom') */
    render?: (msg: AssistantMessage, ctx: VisualizationContext) => React.ReactNode;
  };
  /** Design system to use */
  designSystem?: 'default' | 'shadcn';
  /** Theme customization */
  theme?: Partial<ThemeTokens>;
  /** MCP endpoints to use */
  mcpEndpoints?: MCPEndpoint[];
  /** Component overrides */
  components?: Partial<ComponentOverrides>;
  /** Friendly display name for the agent (used in header) */
  agentName?: string;
  /** Logo URL shown next to the agent name */
  logoUrl?: string;
  /** Thread manager configuration */
  threadManager?: {
    /** Whether to enable persistence to localStorage */
    enablePersistence?: boolean;
    /** Custom storage key for localStorage */
    storageKey?: string;
    /** Maximum number of threads to display */
    maxThreads?: number;
    /** Whether to auto-generate thread titles */
    autoGenerateTitles?: boolean;
    /** Whether to show the create thread button */
    showCreateButton?: boolean;
    /** Whether to allow thread deletion */
    allowThreadDeletion?: boolean;
    /** Whether thread manager starts collapsed */
    initiallyCollapsed?: boolean;
    /** Custom thread title generator function */
    generateTitle?: (firstMessage: string) => string;
  };
}

/**
 * MCP endpoint configuration
 */
export interface MCPEndpoint {
  name: string;
  url: string;
  apiKey?: string;
}

/**
 * Theme tokens for customization
 */
export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      regular: number;
      medium: number;
      bold: number;
    };
  };
}

/**
 * Component overrides
 */
export interface ComponentOverrides {
  ChatButton: React.ComponentType<ChatButtonProps>;
  ChatWindow: React.ComponentType<ChatWindowProps>;
  ChatMessage: React.ComponentType<ChatMessageProps>;
  ChatComposer: React.ComponentType<ChatComposerProps>;
  VoiceButton: React.ComponentType<VoiceButtonProps>;
}

/**
 * Props for the ChatButton component
 */
export interface ChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  theme?: Partial<ThemeTokens>;
}

/**
 * Props for the ChatWindow component
 */
export interface ChatWindowProps {
  /**
   * Callback invoked when the user requests the window to close / minimise.
   * Optional because full-screen mode (bubbleEnabled = false) does not need it.
   */
  onClose?: () => void;
  messages: Message[];
  isLoading: boolean;
  isVoiceLoading: boolean;
  isEnhancing: boolean;
  onSendMessage: (message: string) => void;
  onToggleVoice: () => void;
  isVoiceConnected: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;
  theme?: Partial<ThemeTokens>;
  showThreadManager?: boolean;
  /**
   * When true the window behaves as a floating widget (slides in/out).
   * When false it renders full-screen / inline.  Provided by Myna
   * internally based on the `bubbleEnabled` prop.
   */
  isFloating?: boolean;
}

/**
 * Props for the ChatMessage component
 */
export interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  hasVoiceOver?: boolean;
  children?: React.ReactNode;
}

/**
 * Props for the ChatComposer component
 */
export interface ChatComposerProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  isLoading: boolean;
  onToggleVoiceConnection?: () => void;
  isVoiceConnected?: boolean;
}

/**
 * Props for the VoiceButton component
 */
export interface VoiceButtonProps {
  onClick: () => void;
  isConnected: boolean;
  isConnecting: boolean;
}

/**
 * Message types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Base message interface
 */
export interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: Date;
}

/**
 * User message
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  content: string;
  type?: 'prompt';
}

/**
 * Assistant message
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  content?: string;
  /** C1Component content for rich display */
  c1Content?: string;
  /** Whether this message has voice-over audio */
  hasVoiceOver?: boolean;
}

/**
 * System message
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
  content: string;
}

/**
 * Union type of all message types
 */
export type Message = UserMessage | AssistantMessage | SystemMessage;

/**
 * Visualization context
 */
export interface VisualizationContext {
  history: Message[];
  updateMessage: (content: string) => void;
  onAction: (action: any) => void;
}

/**
 * Connection states
 */
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Voice connection states
 */
export type VoiceConnectionState = 'connected' | 'connecting' | 'disconnected';

/**
 * Myna client interface (for headless use)
 */
export interface MynaClient {
  sendText: (message: string) => void;
  startVoice: () => void;
  stopVoice: () => void;
  messages: Message[];
  connectionState: ConnectionState;
  voiceState: VoiceConnectionState;
}

/**
 * Thread management types
 */
export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
  isActive?: boolean;
}

/**
 * Thread summary for display in thread list
 */
export interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}

/**
 * Thread manager configuration
 */
export interface ThreadManagerOptions {
  /** Maximum number of threads to display */
  maxThreads?: number;
  /** Whether to auto-generate thread titles */
  autoGenerateTitles?: boolean;
  /** Whether to show thread creation button */
  showCreateButton?: boolean;
  /** Whether to show thread deletion option */
  allowThreadDeletion?: boolean;
}

/**
 * Props for the ThreadManager component
 */
export interface ThreadManagerProps {
  /** List of available threads */
  threads: ThreadSummary[];
  /** Currently active thread ID */
  activeThreadId?: string;
  /** Callback when a thread is selected */
  onThreadSelect: (threadId: string) => void;
  /** Callback when a new thread is created */
  onCreateThread: () => void;
  /** Callback when a thread is deleted */
  onDeleteThread?: (threadId: string) => void;
  /** Callback when a thread is renamed */
  onRenameThread?: (threadId: string, newTitle: string) => void;
  /** Whether thread creation is in progress */
  isCreatingThread?: boolean;
  /** Whether threads are loading */
  isLoading?: boolean;
  /** Thread manager configuration */
  options?: ThreadManagerOptions;
  /** Custom theme */
  theme?: Partial<ThemeTokens>;
  /** Additional CSS styles */
  style?: React.CSSProperties;
  /** Additional CSS class names */
  className?: string;
}
