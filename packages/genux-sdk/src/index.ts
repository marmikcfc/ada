/**
 * Genux SDK - Voice and Chat Interface
 * 
 * A lightweight, fully-customizable web SDK that exposes Ada's dual-path 
 * conversational capabilities via a <Genux/> React component.
 */

// Export official styles for consumers who need them
import '@crayonai/react-ui/styles/index.css';

// Main component
export { default as Genux } from './components/Genux';

// Fullscreen components
export { default as FullscreenLayout } from './components/FullscreenLayout';
export { default as FullscreenModal } from './components/FullscreenModal';
export { default as VoiceBotFullscreenLayout } from './components/VoiceBotFullscreenLayout';
export { default as AnimatedBlob } from './components/AnimatedBlob';

// Note: FullscreenModal has been replaced by FullscreenLayout

// Default components (for overriding/extending)
export {
  DefaultChatButton,
  DefaultChatWindow,
  DefaultChatMessage,
  DefaultChatComposer,
  DefaultBubbleWidget,
} from './components/defaults';

// Hooks for headless usage
export { useGenuxClient } from './hooks/useGenuxClient';
export { useThreadManager } from './hooks/useThreadManager';

// Core components for customization
export { default as ChatButton } from './components/ChatButton';
export { default as BubbleWidget } from './components/BubbleWidget';
export { default as ChatWindow } from './components/ChatWindow';
export { default as CustomChatMessage } from './components/ChatMessage';
export { default as CustomChatComposer } from './components/ChatComposer';
export { default as ThreadManager } from './components/ThreadManager';

// Core services
export { ConnectionService, ConnectionEvent } from './core/ConnectionService';

// Theming utilities
export { 
  default as defaultTheme,
  createTheme,
  darkTheme,
  themeToCssVars
} from './theming/defaultTheme';

// Types
export type {
  // Main component props
  GenuxProps,
  GenuxOptions,
  
  // Hook interfaces
  GenuxClient,
  
  // Message types
  Message,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  MessageRole,
  
  // Component props
  ChatButtonProps,
  ChatWindowProps,
  ChatMessageProps,
  ChatComposerProps,
  VoiceButtonProps,
  
  // Thread Management
  Thread,
  ThreadSummary,
  ThreadManagerOptions,
  ThreadManagerProps,
  
  // Theming
  ThemeTokens,
  
  // Connection
  ConnectionState,
  VoiceConnectionState,
  MCPEndpoint,
  
  // Customization
  ComponentOverrides,
  VisualizationContext
} from './types';

// Extended component props (re-exported from defaults)
export type {
  ExtendedChatWindowProps,
  ExtendedChatComposerProps,
  ExtendedChatMessageProps,
  BubbleWidgetProps,
} from './components/defaults';

// Note: FullscreenModalProps has been replaced by FullscreenLayoutProps

// Fullscreen layout props and configuration
export type { 
  FullscreenLayoutProps, 
  FullscreenLayoutConfig 
} from './components/FullscreenLayout';

// Export thread manager hook types
export type {
  UseThreadManagerOptions,
  ThreadManagerState,
  ThreadManagerActions,
  UseThreadManagerResult,
} from './hooks/useThreadManager';
