import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@crayonai/react-ui';
import { ChatWindowProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';
import CustomChatMessage from './CustomChatMessage';
import CustomChatComposer from './CustomChatComposer';
import ThreadManager from './ThreadManager';
import { C1Component } from '@thesysai/genui-sdk';
import { useThreadManager } from '../hooks/useThreadManager';

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
  /** When true acts as a floating widget (slide-in). False = full-screen */
  isFloating?: boolean;
  /** Thread manager options */
  threadManagerOptions?: {
    enablePersistence?: boolean;
    storageKey?: string;
    maxThreads?: number;
    autoGenerateTitles?: boolean;
    showCreateButton?: boolean;
    allowThreadDeletion?: boolean;
    /** Whether thread manager starts collapsed */
    initiallyCollapsed?: boolean;
  };
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
  isFloating = true,
  threadManagerOptions = {},
}) => {
  // State for thread manager collapse
  const [isThreadManagerCollapsed, setIsThreadManagerCollapsed] = useState(
    threadManagerOptions.initiallyCollapsed ?? false
  );

  // Initialize thread manager when showThreadManager is true
  const threadManager = useThreadManager({
    enablePersistence: true,
    storageKey: 'myna-chat-threads',
    maxThreads: 50,
    autoGenerateTitles: true,
    showCreateButton: true,
    allowThreadDeletion: true,
    ...threadManagerOptions,
  });

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

  // Auto-create thread if none exists and we have messages
  useEffect(() => {
    if (showThreadManager && messages.length > 0 && !threadManager.activeThreadId) {
      const firstMessage = messages[0];
      if (firstMessage.role === 'user') {
        threadManager.createThread(firstMessage.content);
      }
    }
  }, [showThreadManager, messages, threadManager.activeThreadId, threadManager.createThread]);

  // Update thread when new messages arrive
  useEffect(() => {
    if (showThreadManager && threadManager.activeThreadId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' || lastMessage.role === 'assistant') {
        threadManager.updateThread(
          threadManager.activeThreadId,
          lastMessage.content || 'New message',
          lastMessage.id
        );
      }
    }
  }, [messages, threadManager.activeThreadId, threadManager.updateThread, showThreadManager]);
  
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

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    threadManager.switchThread(threadId);
    // In a real implementation, you would load messages for the selected thread
    // For now, we'll just switch the active thread
  };

  // Handle create new thread
  const handleCreateThread = () => {
    threadManager.createThread();
    // In a real implementation, you would clear the current chat and start fresh
  };

  // Handle thread deletion with confirmation
  const handleDeleteThread = async (threadId: string) => {
    try {
      await threadManager.deleteThread(threadId);
      // Show success message or handle post-deletion logic
    } catch (error) {
      console.error('Failed to delete thread:', error);
      // Show error message to user
    }
  };

  // Handle thread renaming
  const handleRenameThread = async (threadId: string, newTitle: string) => {
    try {
      await threadManager.renameThread(threadId, newTitle);
    } catch (error) {
      console.error('Failed to rename thread:', error);
    }
  };

  // Toggle thread manager collapse
  const toggleThreadManagerCollapse = () => {
    setIsThreadManagerCollapsed(!isThreadManagerCollapsed);
  };
  
  // Combined styles for the chat window – adapt to floating/full-screen
  const windowStyles: CSSProperties = {
    position: 'fixed',
    ...(isFloating
      ? {
          bottom: '24px',
          right: '24px',
          width,
          height,
          borderRadius: cssVars['--myna-radius-lg'],
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          // slide-in animation
          animation: 'myna-slide-in 0.25s ease-out',
        }
      : {
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          borderRadius: 0,
        }),
    backgroundColor: cssVars['--myna-color-surface'],
    color: cssVars['--myna-color-text'],
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

    /* slide-in animation for floating mode */
    @keyframes myna-slide-in {
      from { transform: translateX(110%); }
      to { transform: translateX(0); }
    }
  `;
  
  // Thread manager styles (if enabled) - updated for collapse functionality
  const threadManagerStyles: CSSProperties = {
    width: isThreadManagerCollapsed ? '60px' : '250px',
    borderRight: `1px solid ${cssVars['--myna-color-border']}`,
    backgroundColor: cssVars['--myna-color-background'],
    display: showThreadManager ? 'flex' : 'none',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
  };

  // Collapsed thread manager content
  const collapsedThreadManagerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: cssVars['--myna-spacing-sm'],
    height: '100%',
  };

  // Collapse button styles
  const collapseButtonStyles: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: cssVars['--myna-spacing-xs'],
    color: cssVars['--myna-color-text'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cssVars['--myna-radius-sm'],
    transition: 'background-color 0.2s ease',
  };

  // Main content styles (adjusted if thread manager is shown and collapsed)
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
          {/* Show close / minimise button **only** when the parent supplied
              an `onClose` callback – i.e. when we are in floating-widget mode.
              In full-screen/inline mode (`isFloating === false`) the window
              should not render a close icon. */}
          {onClose && (
            <button 
            className="myna-close-button" 
            style={closeButtonStyles} 
            onClick={onClose}
            aria-label="Minimize chat"
          >
            {/* Down-chevron icon for minimising */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          )}
        </div>
        
        {/* Main content area */}
        <div className="myna-main-content" style={mainContentStyles}>
          {/* Thread manager sidebar (if enabled) */}
          {showThreadManager && (
            <div className="myna-thread-manager" style={threadManagerStyles}>
              {isThreadManagerCollapsed ? (
                // Collapsed view
                <div style={collapsedThreadManagerStyles}>
                  <button
                    style={collapseButtonStyles}
                    onClick={toggleThreadManagerCollapse}
                    title="Expand conversations"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                    </svg>
                  </button>
                  
                  {/* Quick create button */}
                  <button
                    style={{
                      ...collapseButtonStyles,
                      marginTop: 'auto',
                      marginBottom: cssVars['--myna-spacing-md'],
                      backgroundColor: cssVars['--myna-color-primary'],
                      color: '#ffffff',
                      borderRadius: cssVars['--myna-radius-full'],
                      padding: cssVars['--myna-spacing-sm'],
                    }}
                    onClick={handleCreateThread}
                    title="Create new thread"
                    disabled={threadManager.isCreatingThread}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              ) : (
                // Expanded view with full ThreadManager
                <>
                  {/* Custom header with collapse button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: cssVars['--myna-spacing-md'],
                    borderBottom: `1px solid ${cssVars['--myna-color-border']}`,
                    backgroundColor: cssVars['--myna-color-surface'],
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: cssVars['--myna-font-size-md'],
                      fontWeight: '600',
                      color: cssVars['--myna-color-text'],
                    }}>
                      Conversations
                    </h3>
                    <button
                      style={collapseButtonStyles}
                      onClick={toggleThreadManagerCollapse}
                      title="Collapse conversations"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                      </svg>
                    </button>
                  </div>

                  {/* ThreadManager component */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ThreadManager
                      threads={threadManager.threads}
                      activeThreadId={threadManager.activeThreadId ?? undefined}
                      onThreadSelect={handleThreadSelect}
                      onCreateThread={handleCreateThread}
                      onDeleteThread={handleDeleteThread}
                      onRenameThread={handleRenameThread}
                      isCreatingThread={threadManager.isCreatingThread}
                      isLoading={threadManager.isLoading}
                      options={{
                        maxThreads: 50,
                        autoGenerateTitles: true,
                        showCreateButton: true,
                        allowThreadDeletion: true,
                      }}
                      theme={theme}
                      style={{ 
                        borderRight: 'none', // Remove border since parent handles it
                        height: '100%',
                      }}
                    />
                  </div>
                </>
              )}
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
                  hasVoiceOver={false}
                >
                  {/* Render C1Component for messages that have c1Content */}
                  {message.role === 'assistant' && 'c1Content' in message && message.c1Content && (
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
                    content: '', // Empty content since we're using C1Component
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
