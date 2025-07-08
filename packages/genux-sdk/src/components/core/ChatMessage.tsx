import React, { CSSProperties } from 'react';
import { Message } from '../../types';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  className?: string;
  style?: CSSProperties;
  theme?: any;
  // Allow custom rendering
  renderContent?: (message: Message) => React.ReactNode;
  // Show voice indicator
  showVoiceIndicator?: boolean;
}

/**
 * Reusable chat message component
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  className = '',
  style,
  theme,
  renderContent,
  showVoiceIndicator = false,
}) => {
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  const isUser = message.role === 'user';
  
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: cssVars['--genux-spacing-md'],
    position: 'relative',
    ...style,
  };
  
  const bubbleStyles: CSSProperties = {
    maxWidth: '80%',
    padding: cssVars['--genux-spacing-md'],
    borderRadius: cssVars['--genux-radius-lg'],
    backgroundColor: isUser ? cssVars['--genux-color-primary'] : 'transparent',
    color: isUser ? '#ffffff' : cssVars['--genux-color-text'],
    boxShadow: isUser ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    fontSize: cssVars['--genux-font-size-md'],
    lineHeight: '1.5',
    opacity: isStreaming ? 0.8 : 1,
    transition: 'opacity 0.3s ease',
  };
  
  const voiceIndicatorStyles: CSSProperties = {
    position: 'absolute',
    top: '-8px',
    left: isUser ? 'auto' : '8px',
    right: isUser ? '8px' : 'auto',
    backgroundColor: cssVars['--genux-color-primary'],
    color: '#ffffff',
    borderRadius: cssVars['--genux-radius-full'],
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  };
  
  const content = renderContent ? renderContent(message) : message.content;
  const hasVoiceOver = 'hasVoiceOver' in message && message.hasVoiceOver;
  
  return (
    <div 
      className={`genux-chat-message ${isUser ? 'user' : 'assistant'} ${className}`}
      style={containerStyles}
    >
      <div 
        className={`genux-message-bubble ${isStreaming ? 'streaming' : ''}`}
        style={bubbleStyles}
      >
        {showVoiceIndicator && hasVoiceOver && (
          <div style={voiceIndicatorStyles}>
            🔈
          </div>
        )}
        
        <div className="genux-message-content">
          {content}
        </div>
      </div>
      
      {isStreaming && (
        <style>{`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          
          .genux-message-bubble.streaming {
            animation: pulse 1.5s infinite ease-in-out;
          }
        `}</style>
      )}
    </div>
  );
};