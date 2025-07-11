import React, { useRef, useEffect, CSSProperties } from 'react';
import { Message } from '../../types';
import { ChatMessage } from '../core/ChatMessage';
import { MessageComposer } from '../core/MessageComposer';
import { FlexibleContentRenderer } from '../core/FlexibleContentRenderer';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  header?: React.ReactNode;
  agentName?: string;
  isLoading?: boolean;
  className?: string;
  style?: CSSProperties;
  theme?: any;
  crayonTheme?: Record<string, any>;
  // Optional features
  showVoiceButton?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  // Streaming support
  streamingContent?: string;
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;
  // C1Component support
  onC1Action?: (action: any) => void;
  // Custom renderers
  renderMessage?: (message: Message) => React.ReactNode;
  // Minimize support
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  showMinimizeButton?: boolean;
  minimizedHeight?: string | number;
}

/**
 * Simple chat window without thread management
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  header,
  agentName = 'Chat',
  isLoading = false,
  className = '',
  style,
  theme,
  crayonTheme,
  showVoiceButton = false,
  onVoiceToggle,
  isVoiceActive = false,
  streamingContent = '',
  streamingMessageId = null,
  isStreamingActive = false,
  onC1Action,
  renderMessage,
  isMinimized = false,
  onMinimize,
  onRestore,
  showMinimizeButton = true,
  minimizedHeight = '60px',
}) => {
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);
  
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: isMinimized ? minimizedHeight : '100%',
    backgroundColor: cssVars['--genux-color-background'],
    borderRadius: cssVars['--genux-radius-lg'],
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: 'height 0.3s ease',
    ...style,
  };
  
  const headerStyles: CSSProperties = {
    padding: cssVars['--genux-spacing-md'],
    borderBottom: isMinimized ? 'none' : `1px solid ${cssVars['--genux-color-border']}`,
    backgroundColor: agentName === 'AI Assistant' ? cssVars['--genux-color-primary'] : cssVars['--genux-color-surface'],
    color: agentName === 'AI Assistant' ? '#ffffff' : cssVars['--genux-color-text'],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: isMinimized ? 'pointer' : 'default',
  };
  
  const messagesContainerStyles: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: cssVars['--genux-spacing-md'],
    display: isMinimized ? 'none' : 'block',
  };
  
  const minimizeButtonStyles: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: agentName === 'AI Assistant' ? '#ffffff' : cssVars['--genux-color-text'],
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cssVars['--genux-radius-sm'],
    transition: 'background-color 0.2s ease',
    minWidth: '32px',
    minHeight: '32px',
    fontSize: '16px',
    fontWeight: 'bold',
  };
  
  const handleHeaderClick = () => {
    if (isMinimized && onRestore) {
      onRestore();
    }
  };
  
  const handleMinimizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMinimize) {
      onMinimize();
    }
  };
  
  // Default message renderer with flexible content support
  const defaultRenderMessage = (message: Message) => {
    // For assistant messages, use FlexibleContentRenderer to support multiple formats
    if (message.role === 'assistant') {
      return (
        <FlexibleContentRenderer
          content={message.content}
          c1Content={'c1Content' in message ? message.c1Content : undefined}
          htmlContent={'htmlContent' in message ? message.htmlContent : undefined}
          reactContent={'reactContent' in message ? message.reactContent : undefined}
          contentType={'contentType' in message ? message.contentType : 'auto'}
          allowDangerousHtml={'allowDangerousHtml' in message ? message.allowDangerousHtml : false}
          onC1Action={onC1Action}
          isStreaming={isStreamingActive}
          crayonTheme={crayonTheme}
        />
      );
    }
    return message.content;
  };
  
  const messageRenderer = renderMessage || defaultRenderMessage;
  
  // Combine messages with streaming content
  const displayMessages = [...messages];
  if (isStreamingActive && streamingContent) {
    const streamingMessage: Message = {
      id: streamingMessageId || 'streaming',
      role: 'assistant',
      content: streamingContent,
      timestamp: new Date(),
    };
    displayMessages.push(streamingMessage);
  }
  
  return (
    <div className={`genux-chat-window ${isMinimized ? 'minimized' : ''} ${className}`} style={containerStyles}>
      {/* Header */}
      <div className="genux-chat-header" style={headerStyles} onClick={handleHeaderClick}>
        <div style={{ flex: 1 }}>
          {header || (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMinimized && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: cssVars['--genux-color-primary'],
                }}></div>
              )}
              <span style={{ fontSize: cssVars['--genux-font-size-md'], fontWeight: '500' }}>
                {isMinimized ? `${agentName} minimized - Click to restore` : agentName}
              </span>
            </div>
          )}
        </div>
        
        {/* Minimize/Restore Button */}
        {(showMinimizeButton || isMinimized) && (
          <button
            onClick={isMinimized ? handleHeaderClick : handleMinimizeClick}
            style={minimizeButtonStyles}
            title={isMinimized ? 'Restore chat' : 'Minimize chat'}
            className="genux-minimize-button"
          >
            {isMinimized ? (
              // Restore icon - expand arrows
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18-5h-3a2 2 0 0 1 2 2v3m0 6v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            ) : (
              // Minimize icon - line at bottom
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 19h12"/>
              </svg>
            )}
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="genux-chat-messages" style={messagesContainerStyles}>
        {displayMessages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={isStreamingActive && index === displayMessages.length - 1}
            theme={theme}
            renderContent={() => messageRenderer(message)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Composer */}
      {!isMinimized && (
        <MessageComposer
          onSendMessage={onSendMessage}
          disabled={isLoading || isStreamingActive}
          loading={isLoading}
          theme={theme}
          showVoiceButton={showVoiceButton}
          onVoiceToggle={onVoiceToggle}
          isVoiceActive={isVoiceActive}
        />
      )}
      
      <style>{`
        .genux-minimize-button:hover {
          background-color: rgba(0, 0, 0, 0.1) !important;
        }
        
        .genux-chat-window.minimized .genux-chat-header {
          border-bottom: none !important;
        }
        
        .genux-chat-window.minimized .genux-chat-header:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
    </div>
  );
};