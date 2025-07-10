/**
 * Core type definitions for the Genux SDK
 */

// Re-export component prop interfaces for TypeScript support
export type { ThreadListProps, Thread } from '../components/core/ThreadList';
export type { ChatWindowProps } from '../components/composite/ChatWindow';

/** VoiceBotUI component props interface */
export interface VoiceBotUIProps {
  /** Voice connection state */
  isVoiceConnected?: boolean;
  /** Voice loading state */
  isVoiceLoading?: boolean;
  /** Voice toggle callback */
  onToggleVoice?: () => void;
  /** Agent display name */
  agentName?: string;
  /** Agent subtitle text */
  agentSubtitle?: string;
  /** Start call button text */
  startCallButtonText?: string;
  /** End call button text */
  endCallButtonText?: string;
  /** Connecting state text */
  connectingText?: string;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Main props interface for the Genux component
 */
export interface GenuxProps {
  /** WebRTC endpoint URL for voice communication */
  webrtcURL: string;
  /** WebSocket endpoint URL for message streaming */
  websocketURL: string;
  /** Whether to show the floating chat button */
  bubbleEnabled?: boolean;
  /** Whether to show the thread manager sidebar */
  showThreadManager?: boolean;
  /** Whether to allow fullscreen mode (shows fullscreen button in bubble hover menu) */
  allowFullScreen?: boolean;
  /** Whether to disable all voice features for chat-only mode */
  disableVoice?: boolean;
  /** Additional configuration options */
  options?: GenuxOptions;
}

/**
 * Configuration options for the Genux SDK
 */
export interface GenuxOptions {
  /** Visualization provider configuration */
  visualization?: {
    /** The provider to use for rendering assistant messages */
    provider: 'default' | 'custom' | 'none';
    /** Custom render function (only when provider === 'custom') */
    render?: (msg: AssistantMessage, ctx: VisualizationContext) => React.ReactNode;
  };
  /** Design system to use */
  designSystem?: 'default' | 'shadcn';
  /** Theme customization for GenUX components */
  theme?: Partial<ThemeTokens>;
  /** Theme customization for Crayon components (C1Components, tables, etc.) */
  crayonTheme?: Record<string, any>;
  /** MCP endpoints to use */
  mcpEndpoints?: MCPEndpoint[];
  /** Component overrides */
  components?: Partial<ComponentOverrides>;
  /** Friendly display name for the agent (used in header) */
  agentName?: string;
  /** Agent subtitle for fullscreen mode */
  agentSubtitle?: string;
  /** Logo URL shown next to the agent name */
  logoUrl?: string;
  /** Background color/gradient for fullscreen mode */
  backgroundColor?: string;
  /** Primary color for fullscreen mode theming */
  primaryColor?: string;
  /** Accent color for fullscreen mode theming */
  accentColor?: string;
  /** Thread manager title in fullscreen mode */
  threadManagerTitle?: string;
  /** Whether to enable thread manager in fullscreen mode */
  enableThreadManager?: boolean;
  /** Text for start call button */
  startCallButtonText?: string;
  /** Text for end call button */
  endCallButtonText?: string;
  /** Text shown while connecting */
  connectingText?: string;
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
  
  /** Custom component overrides for fullscreen mode */
  fullscreenComponents?: {
    /** Custom ThreadList component for left column */
    ThreadList?: React.ComponentType<ThreadListProps>;
    /** Custom VoiceBotUI component for center column */
    VoiceBotUI?: React.ComponentType<VoiceBotUIProps>;
    /** Custom ChatWindow component for right column */
    ChatWindow?: React.ComponentType<ChatWindowProps>;
  };
  
  /** Layout configuration for fullscreen mode */
  fullscreenLayout?: {
    /** Show/hide left column (ThreadList) */
    showThreadList?: boolean;
    /** Show/hide center column (VoiceBotUI) */
    showVoiceBot?: boolean;
    /** Show/hide right column (ChatWindow) */
    showChatWindow?: boolean;
    /** Custom column widths (e.g., "300px auto 400px") */
    columnWidths?: string;
  };
  
  /** Container mode - when true, VoiceBotFullscreenLayout uses 100% dimensions instead of viewport units */
  containerMode?: boolean;
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
 * Comprehensive theme tokens for complete UI coverage
 */
export interface ThemeTokens {
  colors: {
    // Brand colors
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceHover: string;
    elevated: string;
    overlay: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    textDisabled: string;
    
    // Interactive colors
    link: string;
    linkHover: string;
    linkVisited: string;
    
    // Border colors
    border: string;
    borderHover: string;
    borderFocus: string;
    borderDisabled: string;
    
    // State colors
    error: string;
    errorBackground: string;
    errorBorder: string;
    success: string;
    successBackground: string;
    successBorder: string;
    warning: string;
    warningBackground: string;
    warningBorder: string;
    info: string;
    infoBackground: string;
    infoBorder: string;
    
    // Chat-specific colors
    chatUserBubble: string;
    chatUserText: string;
    chatAssistantBubble: string;
    chatAssistantText: string;
    chatTimestamp: string;
  };
  
  spacing: {
    '0': string;
    '3xs': string;
    '2xs': string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  
  borderRadius: {
    none: string;
    '3xs': string;
    '2xs': string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
  
  typography: {
    // Font families
    fontFamily: string;
    fontFamilyMono: string;
    
    // Font sizes
    fontSize: {
      '3xs': string;  // 10px
      '2xs': string;  // 11px
      xs: string;     // 12px
      sm: string;     // 14px
      md: string;     // 16px
      lg: string;     // 18px
      xl: string;     // 20px
      '2xl': string;  // 24px
      '3xl': string;  // 30px
      '4xl': string;  // 36px
      '5xl': string;  // 48px
    };
    
    // Font weights
    fontWeight: {
      thin: number;      // 100
      light: number;     // 300
      regular: number;   // 400
      medium: number;    // 500
      semibold: number;  // 600
      bold: number;      // 700
      extrabold: number; // 800
      black: number;     // 900
    };
    
    // Line heights
    lineHeight: {
      tight: string;   // 1.25
      normal: string;  // 1.5
      relaxed: string; // 1.75
      loose: string;   // 2
    };
    
    // Letter spacing
    letterSpacing: {
      tight: string;   // -0.025em
      normal: string;  // 0
      wide: string;    // 0.025em
      wider: string;   // 0.05em
      widest: string;  // 0.1em
    };
    
    // Predefined text styles
    heading: {
      h1: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h2: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h3: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h4: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h5: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h6: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    
    body: {
      large: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      medium: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      small: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    
    label: {
      large: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      medium: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      small: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    
    code: {
      fontSize: string;
      fontWeight: number;
      fontFamily: string;
      lineHeight: string;
      letterSpacing: string;
    };
  };
  
  shadows: {
    none: string;
    sm: string;      // Subtle shadow
    md: string;      // Default shadow
    lg: string;      // Prominent shadow
    xl: string;      // Large shadow
    '2xl': string;   // Extra large shadow
    inner: string;   // Inset shadow
  };
  
  effects: {
    backdropBlur: string;
    transition: string;
    transitionFast: string;
    transitionSlow: string;
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
   * When false it renders full-screen / inline.  Provided by Genux
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
 * Genux client interface (for headless use)
 */
export interface GenuxClient {
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
  /** Whether to hide the header (useful when embedded with custom header) */
  hideHeader?: boolean;
}
