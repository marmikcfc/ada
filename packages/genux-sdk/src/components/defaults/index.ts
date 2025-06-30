/**
 * Default component exports for the Genux SDK
 * 
 * These are the default implementations of all overrideable components.
 * Users can import these to extend or customize them, or use them as
 * reference when creating their own implementations.
 */

export { default as DefaultChatButton } from '../ChatButton';
export { default as DefaultChatWindow } from '../ChatWindow';
export { default as DefaultChatMessage } from '../CustomChatMessage';
export { default as DefaultChatComposer } from '../CustomChatComposer';
export { default as DefaultBubbleWidget } from '../BubbleWidget';

// Re-export types for convenience
export type {
  ChatButtonProps,
  ChatWindowProps,
  ChatMessageProps,
  ChatComposerProps,
  VoiceButtonProps,
  ComponentOverrides,
} from '../../types';

// Extended props interfaces
export type { ExtendedChatWindowProps } from '../ChatWindow';
export type { ExtendedChatComposerProps } from '../CustomChatComposer';
export type { ExtendedChatMessageProps } from '../CustomChatMessage';
export type { BubbleWidgetProps } from '../BubbleWidget'; 