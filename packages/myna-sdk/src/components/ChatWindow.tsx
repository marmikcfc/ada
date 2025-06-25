import React, { CSSProperties, useEffect, useRef } from 'react';
import { ThemeProvider } from '@crayonai/react-ui';
import { ChatWindowProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';
import CustomChatMessage from './CustomChatMessage';
import CustomChatComposer from './CustomChatComposer';
import { C1Component } from '@thesysai/genui-sdk';

/**
 * Extended props for the ChatWindow component
 */
export interface ExtendedChatWindowProps extends ChatWindowProps {
  /** Custom width for the window */
  width?: string | number;
  /** Custom height for the window */
  height?: string | number;
  /** Custom header content */
  headerContent?: React.ReactNode;
  /** Agent name displayed in the header */
  agentName?: string;
  /** URL for the agent logo */
  logoUrl?: string;
  /** Additional CSS styles */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A modal-style chat window component
 */
const ChatWindow: React.FC<ExtendedChatWindowProps> = ({
  onClose,
  messages,
  isLoading,
  isVoiceLoading,
  isEnhancing,
  onSendMessage,
  onToggleVoice,
  isVoiceConnected,
  streamingContent = '',
  streamingMessageId = null,
  isStreamingActive = false,
  theme,
  showThreadManager = false,
  width = '380px',
  height = '600px',
  headerContent,
  agentName = 'AI Assistant',
  logoUrl,
  style,
  className = '',
}) => {
  // Merge custom theme with default theme
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreamingActive, streamingContent]);
  
  // Handle C1Component actions
  const handleC1ComponentAction = (action: any) => {
    if (action?.llmFriendlyMessage) {
      // If there's a human-friendly message, show it as a user message
      if (action?.humanFriendlyMessage && onSendMessage) {
        onSendMessage(action.humanFriendlyMessage);
      }
    }
  };
  
  // Handle C1Component message updates
  const handleC1UpdateMessage = (updatedContent: string, messageId: string) => {
    // This would typically be handled by the message store
    console.log('Message updated:', messageId, updatedContent);
  };
  
  // Combined styles for the chat window
  const windowStyles: CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width,
    height,
    backgroundColor: cssVars['--myna-color-surface'],
    color: cssVars['--myna-color-text'],
    borderRadius: cssVars['--myna-radius-lg'],
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 10000,
    fontFamily: cssVars['--myna-font-family'],
    ...style,
  };
  
  // Header styles
  const headerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${cssVars['--myna-spacing-md']} ${cssVars['--myna-spacing-md']}`,
    borderBottom: `1px solid ${cssVars['--myna-color-border']}`,
    backgroundColor: cssVars['--myna-color-primary'],
    color: '#ffffff',
  };
  
  // Agent info styles
  const agentInfoStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: cssVars['--myna-spacing-sm'],
  };
  
  // Logo styles
  const logoStyles: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: cssVars['--myna-radius-full'],
    objectFit: 'cover',
  };
  
  // Close button styles
  const closeButtonStyles: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: cssVars['--myna-spacing-xs'],
    borderRadius: cssVars['--myna-radius-full'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  // Messages container styles
  const messagesContainerStyles: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: cssVars['--myna-spacing-md'],
    display: 'flex',
    flexDirection: 'column',
    gap: cssVars['--myna-spacing-md'],
  };
  
  // Loading indicator styles
  const loadingIndicatorStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: cssVars['--myna-spacing-sm'],
    padding: cssVars['--myna-spacing-sm'],
    color: cssVars['--myna-color-textSecondary'],
    fontSize: cssVars['--myna-font-size-sm'],
  };
  
  // Typing dots animation
  const typingDotsStyles = `
    .typing-dots {
      display: inline-flex;
      align-items: center;
      height: 20px;
    }
    
    .typing-dots span {
      width: 6px;
      height: 6px;
      margin: 0 2px;
      background-color: ${cssVars['--myna-color-textSecondary']};
      border-radius: 50%;
      display: inline-block;
      animation: typing-dots 1.4s infinite ease-in-out both;
    }
    
    .typing-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .typing-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    @keyframes typing-dots {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  
  // Thread manager styles (if enabled)
  const threadManagerStyles: CSSProperties = {
    width: '250px',
    borderRight: `1px solid ${cssVars['--myna-color-border']}`,
    backgroundColor: cssVars['--myna-color-background'],
    display: showThreadManager ? 'block' : 'none',
  };
  
  // Main content styles (adjusted if thread manager is shown)
  const mainContentStyles: CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };
  
  // Chat content styles
  const chatContentStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  };
  
  return (
    <ThemeProvider theme={{}}>
      <style>{typingDotsStyles}</style>
      <div className={`myna-chat-window ${className}`} style={windowStyles}>
        {/* Header */}
        <div className="myna-chat-header" style={headerStyles}>
          {headerContent || (
            <div className="myna-agent-info" style={agentInfoStyles}>
              {logoUrl && (
                <img src={logoUrl} alt={`${agentName} logo`} style={logoStyles} />
              )}
              <span style={{ fontWeight: 500 }}>{agentName}</span>
            </div>
          )}
          <button 
            className="myna-close-button" 
            style={closeButtonStyles} 
            onClick={onClose}
            aria-label="Close chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Main content area */}
        <div className="myna-main-content" style={mainContentStyles}>
          {/* Thread manager sidebar (if enabled) */}
          {showThreadManager && (
            <div className="myna-thread-manager" style={threadManagerStyles}>
              {/* Thread manager content would go here */}
              <div style={{ padding: cssVars['--myna-spacing-md'] }}>
                <h3 style={{ margin: 0, fontSize: cssVars['--myna-font-size-md'] }}>Conversations</h3>
              </div>
            </div>
          )}
          
          {/* Chat content area */}
          <div className="myna-chat-content" style={chatContentStyles}>
            {/* Messages container */}
            <div className="myna-messages-container" style={messagesContainerStyles} ref={chatContainerRef}>
              {messages.map((message, index) => (
                <CustomChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length - 1}
                  hasVoiceOver={message.hasVoiceOver}
                >
                  {/* Render C1Component for messages that have c1Content */}
                  {message.c1Content && (
                    <C1Component
                      c1Response={message.c1Content}
                      isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length - 1}
                      updateMessage={(content: string) => handleC1UpdateMessage(content, message.id)}
                      onAction={handleC1ComponentAction}
                    />
                  )}
                </CustomChatMessage>
              ))}
              
              {/* Live-streaming bubble (appears while slow-path chunks arrive) */}
              {isStreamingActive &&
                streamingMessageId &&
                streamingContent.trim().length > 0 && (
                <CustomChatMessage
                  /* Prefix with `streaming-` so it never
                     collides with a real message ID */
                  key={`streaming-${streamingMessageId}`}
                  message={{
                    id: `streaming-${streamingMessageId}`,
                    role: 'assistant',
                    c1Content: streamingContent,
                    timestamp: new Date(),
                  }}
                  isLast={true}
                  isStreaming={true}
                  hasVoiceOver={false}
                >
                  <C1Component
                    c1Response={streamingContent}
                    isStreaming={true}
                    onAction={handleC1ComponentAction}
                  />
                </CustomChatMessage>
              )}

              {/* Loading indicator */}
              {(isEnhancing ?? false) || (isLoading ?? false) || (isVoiceLoading ?? false) ? (
                <div className="myna-loading-indicator" style={loadingIndicatorStyles}>
                  <span className="myna-loading-text">
                    {isEnhancing
                      ? 'Generating enhanced display…'
                      : (isLoading
                          ? 'Assistant is thinking...'
                          : 'Assistant is preparing to speak...')}
                  </span>
                  <span className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              ) : null}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <CustomChatComposer
              onSendMessage={onSendMessage}
              disabled={(isLoading ?? false) || (isVoiceLoading ?? false)}
              isLoading={(isLoading ?? false) || (isVoiceLoading ?? false)}
              onToggleVoiceConnection={onToggleVoice}
              isVoiceConnected={isVoiceConnected}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatWindow;
