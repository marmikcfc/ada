/**
 * Myna SDK - Voice and Chat Interface
 * 
 * A lightweight, fully-customizable web SDK that exposes Ada's dual-path 
 * conversational capabilities via a <Myna/> React component.
 */

// Main component
export { default as Myna } from './components/Myna';

// Default components (for overriding/extending)
export {
  DefaultChatButton,
  DefaultChatWindow,
  DefaultChatMessage,
  DefaultChatComposer,
  DefaultBubbleWidget,
} from './components/defaults';

// Hooks for headless usage
export { useMynaClient } from './hooks/useMynaClient';
export { useThreadManager } from './hooks/useThreadManager';

// Core components for customization
export { default as ChatButton } from './components/ChatButton';
export { default as BubbleWidget } from './components/BubbleWidget';
export { default as ChatWindow } from './components/ChatWindow';
export { default as CustomChatMessage } from './components/CustomChatMessage';
export { default as CustomChatComposer } from './components/CustomChatComposer';
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
  MynaProps,
  MynaOptions,
  
  // Hook interfaces
  MynaClient,
  
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

// Export thread manager hook types
export type {
  UseThreadManagerOptions,
  ThreadManagerState,
  ThreadManagerActions,
  UseThreadManagerResult,
} from './hooks/useThreadManager';
