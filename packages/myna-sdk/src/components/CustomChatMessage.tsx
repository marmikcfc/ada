import React, { CSSProperties } from 'react';
import { ChatMessageProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';

/**
 * Extended props for the CustomChatMessage component
 */
export interface ExtendedChatMessageProps extends ChatMessageProps {
  /** Additional CSS styles for the message container */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A component that renders chat messages with support for C1Components
 */
const CustomChatMessage: React.FC<ExtendedChatMessageProps> = ({
  message,
  isLast,
  isStreaming,
  hasVoiceOver,
  children,
  style,
  className = '',
}) => {
  // Use default theme (could be overridden via context in the future)
  const theme = createTheme();
  const cssVars = themeToCssVars(theme);
  
  // Determine if the message is from the user or assistant
  const isUser = message.role === 'user';
  
  // Container styles
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: cssVars['--myna-spacing-md'],
    position: 'relative',
    ...style,
  };
  
  // Message bubble styles
  const bubbleStyles: CSSProperties = {
    maxWidth: '80%',
    padding: cssVars['--myna-spacing-md'],
    borderRadius: cssVars['--myna-radius-lg'],
    backgroundColor: isUser 
      ? cssVars['--myna-color-primary'] 
      : cssVars['--myna-color-background'],
    color: isUser ? '#ffffff' : cssVars['--myna-color-text'],
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    border: isUser 
      ? 'none' 
      : `1px solid ${cssVars['--myna-color-border']}`,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    fontSize: cssVars['--myna-font-size-md'],
    lineHeight: '1.5',
  };
  
  // Voice indicator styles
  const voiceIndicatorStyles: CSSProperties = {
    position: 'absolute',
    top: '-8px',
    left: isUser ? 'auto' : '8px',
    right: isUser ? '8px' : 'auto',
    backgroundColor: cssVars['--myna-color-primary'],
    color: '#ffffff',
    borderRadius: cssVars['--myna-radius-full'],
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  };
  
  // Streaming animation
  const streamingAnimationStyles = `
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    .myna-streaming-message {
      animation: pulse 1.5s infinite ease-in-out;
    }
  `;
  
  return (
    <>
      <style>{streamingAnimationStyles}</style>
      <div 
        className={`myna-message-container ${className} ${isLast ? 'myna-message-last' : ''}`} 
        style={containerStyles}
      >
        <div 
          className={`myna-message-bubble ${isUser ? 'myna-message-user' : 'myna-message-assistant'} ${isStreaming ? 'myna-streaming-message' : ''}`} 
          style={bubbleStyles}
        >
          {/* Voice indicator icon */}
          {hasVoiceOver && (
            <div className="myna-voice-indicator" style={voiceIndicatorStyles}>
              🔈
            </div>
          )}
          
          {/* Message content */}
          {message.content && !children && (
            <div className="myna-message-text">
              {message.content}
            </div>
          )}
          
          {/* C1Component or other rich content */}
          {children}
        </div>
      </div>
    </>
  );
};

export default CustomChatMessage;
