/**
 * GeUI SDK - Voice and Chat Interface
 * 
 * A lightweight, fully-customizable web SDK that exposes Ada's dual-path 
 * conversational capabilities via a <GeUI/> React component.
 */

// Export official styles for consumers who need them
//import '@crayonai/react-ui/styles/index.css';

// Main component
export { default as GeUI } from './components/GeUI';

// Fullscreen components
export { default as VoiceBotFullscreenLayout } from './components/composite/VoiceBotFullscreenLayout';
export { default as AnimatedBlob } from './components/core/AnimatedBlob';

// Note: FullscreenModal has been replaced by FullscreenLayout

// Default components (for overriding/extending)
export {
  DefaultChatButton,
  // DefaultChatMessage,
  // DefaultChatComposer,
  DefaultBubbleWidget,
} from './components/defaults';

// Hooks for headless usage
export { useGeUIClient } from './hooks/useGeUIClient';
export { useThreadListManager } from './hooks/useThreadListManager';
export { useThreadManager } from './hooks/useThreadManager';
export { useThreadedClient } from './hooks/useThreadedClient';
export { useThreadInterface } from './hooks/useThreadInterface';

// Contexts for thread management
export { ThreadProvider, useThreadContext, useOptionalThreadContext } from './contexts/ThreadContext';

// Core components for customization
export { default as ChatButton } from './components/ChatButton';
export { default as BubbleWidget } from './components/core/BubbleWidget';
// export { default as CustomChatMessage } from './components/ChatMessage';
// export { default as CustomChatComposer } from './components/ChatComposer';

// New Core Components (Reusable)
export * from './components/core';

// New Composite Components
export * from './components/composite';

// Core services
export { ConnectionService, ConnectionEvent } from './core/ConnectionService';

// Utilities
export { MessageStorage } from './utils/messageStorage';

// Theming utilities
export { 
  defaultTheme,
  lightTheme,
  darkTheme,
  createTheme,
  themeToCssVars,
  toCrayonTheme,
  crayonLightTheme,
  crayonDarkTheme,
  crayonDefaultTheme,
  type CrayonTheme
} from './theming/defaultTheme';

// Comprehensive themes (advanced usage)
export {
  comprehensiveLightTheme,
  comprehensiveDarkTheme,
  comprehensiveDefaultTheme
} from './theming/comprehensiveThemes';

// Types
export type {
  // Main component props
  GeUIProps,
  GeUIOptions,
  
  // Hook interfaces
  GeUIClient,
  
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
  ThreadMessageStorage,
  ThreadListAPI,
  ThreadAPI,
  
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

// Export FlexibleContentRenderer types
export type { FlexibleContentRendererProps } from './components/core/FlexibleContentRenderer';

// Extended component props (re-exported from defaults)
export type {
  // ExtendedChatComposerProps,
  // ExtendedChatMessageProps,
  BubbleWidgetProps,
} from './components/defaults';

// Note: FullscreenModalProps has been replaced by FullscreenLayoutProps

// Export thread list manager hook types
export type {
  UseThreadListManagerOptions,
  UseThreadListManagerResult,
} from './hooks/useThreadListManager';

// Export thread manager hook types
export type {
  UseThreadManagerOptions,
  UseThreadManagerResult,
} from './hooks/useThreadManager';

// Export threaded client hook types
export type {
  UseThreadedClientOptions,
} from './hooks/useThreadedClient';

// Export thread interface hook types
export type {
  ThreadInterfaceOptions,
  ThreadInterface,
  StorageInfo as ThreadInterfaceStorageInfo,
} from './hooks/useThreadInterface';
