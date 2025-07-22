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
  isEnhancing?: boolean;
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
  sendC1Action?: (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => void;
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
  isEnhancing = false,
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
  sendC1Action,
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
    backgroundColor: cssVars['--geui-color-background'],
    borderRadius: cssVars['--geui-radius-lg'],
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: 'height 0.3s ease',
    ...style,
  };
  
  const headerStyles: CSSProperties = {
    padding: cssVars['--geui-spacing-md'],
    borderBottom: isMinimized ? 'none' : `1px solid ${cssVars['--geui-color-border']}`,
    backgroundColor: agentName === 'AI Assistant' ? cssVars['--geui-color-primary'] : cssVars['--geui-color-surface'],
    color: agentName === 'AI Assistant' ? '#ffffff' : cssVars['--geui-color-text'],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: isMinimized ? 'pointer' : 'default',
  };
  
  const messagesContainerStyles: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: cssVars['--geui-spacing-md'],
    display: isMinimized ? 'none' : 'block',
  };
  
  const minimizeButtonStyles: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: agentName === 'AI Assistant' ? '#ffffff' : cssVars['--geui-color-text'],
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cssVars['--geui-radius-sm'],
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
  
  
  // Combine messages with streaming content and loading states
  const displayMessages = [...messages];
  
  // Add streaming message if active
  if (isStreamingActive && streamingContent) {
    // Parse streaming content to extract C1 content if present
    const parseStreamingContent = (rawContent: string) => {
      // Check if it contains C1 content wrapper
      if (rawContent.includes('<content>')) {
        // Try to extract C1 content (even if incomplete)
        const completeMatch = rawContent.match(/<content>([\s\S]*?)<\/content>/);
        if (completeMatch) {
          return { c1Content: completeMatch[1], content: undefined };
        }
        
        // For streaming content, extract partial content if <content> tag is present
        const partialMatch = rawContent.match(/<content>([\s\S]*)/);
        if (partialMatch) {
          return { c1Content: partialMatch[1], content: undefined };
        }
      }
      
      // Default to regular content
      return { content: rawContent, c1Content: undefined };
    };
    
    const { content, c1Content } = parseStreamingContent(streamingContent);
    
    const streamingMessage: Message = {
      id: streamingMessageId || 'streaming',
      role: 'assistant',
      content,
      c1Content,
      timestamp: new Date(),
    };
    displayMessages.push(streamingMessage);
  }
  
  // Add loading state messages (only when not streaming to avoid conflicts)
  if (isLoading && !isStreamingActive) {
    const loadingMessage: Message = {
      id: 'loading',
      role: 'assistant',
      content: `💭 ${agentName} is thinking...`,
      timestamp: new Date(),
      isLoading: true,
    };
    displayMessages.push(loadingMessage);
  }
  
  if (isEnhancing && !isStreamingActive && !isLoading) {
    const enhancingMessage: Message = {
      id: 'enhancing',
      role: 'assistant',
      content: '✨ Generating enhanced display...',
      timestamp: new Date(),
      isLoading: true,
    };
    displayMessages.push(enhancingMessage);
  }
  
  return (
    <div className={`geui-chat-window ${isMinimized ? 'minimized' : ''} ${className}`} style={containerStyles}>
      {/* Header */}
      <div className="geui-chat-header" style={headerStyles} onClick={handleHeaderClick}>
        <div style={{ flex: 1 }}>
          {header || (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMinimized && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: cssVars['--geui-color-primary'],
                }}></div>
              )}
              <span style={{ fontSize: cssVars['--geui-font-size-md'], fontWeight: '500' }}>
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
            className="geui-minimize-button"
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
      <div className="geui-chat-messages" style={messagesContainerStyles}>
        {displayMessages.map((message, index) => {
          const isCurrentlyStreaming = isStreamingActive && index === displayMessages.length - 1;
          return (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={isCurrentlyStreaming}
              theme={theme}
              renderContent={() => {
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
                      sendC1Action={sendC1Action}
                      isStreaming={isCurrentlyStreaming}
                      crayonTheme={crayonTheme}
                    />
                  );
                }
                return message.content;
              }}
            />
          );
        })}
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
        .geui-minimize-button:hover {
          background-color: rgba(0, 0, 0, 0.1) !important;
        }
        
        .geui-chat-window.minimized .geui-chat-header {
          border-bottom: none !important;
        }
        
        .geui-chat-window.minimized .geui-chat-header:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        
      `}</style>
    </div>
  );
};