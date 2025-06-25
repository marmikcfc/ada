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
  onClose: () => void;
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
  c1Content?: string;
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
