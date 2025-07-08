import React, { CSSProperties } from 'react';
import { Message } from '../../types';
import { Thread, ThreadList } from '../core/ThreadList';
import { ChatWindow } from './ChatWindow';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface ThreadedChatWindowProps {
  // Chat props
  messages: Message[];
  onSendMessage: (message: string) => void;
  header?: React.ReactNode;
  isLoading?: boolean;
  // Thread props
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onRenameThread?: (threadId: string, title: string) => void;
  isCreatingThread?: boolean;
  // Layout props
  showThreadList?: boolean;
  threadListPosition?: 'left' | 'right';
  threadListWidth?: string | number;
  // Styling
  className?: string;
  style?: CSSProperties;
  theme?: any;
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
}

/**
 * Chat window with thread management sidebar
 */
export const ThreadedChatWindow: React.FC<ThreadedChatWindowProps> = ({
  // Chat props
  messages,
  onSendMessage,
  header,
  isLoading = false,
  // Thread props
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  isCreatingThread = false,
  // Layout props
  showThreadList = true,
  threadListPosition = 'left',
  threadListWidth = '300px',
  // Styling
  className = '',
  style,
  theme,
  // Optional features
  showVoiceButton = false,
  onVoiceToggle,
  isVoiceActive = false,
  streamingContent = '',
  streamingMessageId = null,
  isStreamingActive = false,
  onC1Action,
}) => {
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: threadListPosition === 'left' ? 'row' : 'row-reverse',
    height: '100%',
    backgroundColor: cssVars['--genux-color-background'],
    borderRadius: cssVars['--genux-radius-lg'],
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    ...style,
  };
  
  const threadListStyles: CSSProperties = {
    width: showThreadList ? threadListWidth : 0,
    borderRight: threadListPosition === 'left' ? `1px solid ${cssVars['--genux-color-border']}` : 'none',
    borderLeft: threadListPosition === 'right' ? `1px solid ${cssVars['--genux-color-border']}` : 'none',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
  };
  
  const chatStyles: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };
  
  return (
    <div className={`genux-threaded-chat-window ${className}`} style={containerStyles}>
      {/* Thread List */}
      <div style={threadListStyles}>
        {showThreadList && (
          <ThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
            onCreateThread={onCreateThread}
            onDeleteThread={onDeleteThread}
            onRenameThread={onRenameThread}
            isCreatingThread={isCreatingThread}
            theme={theme}
          />
        )}
      </div>
      
      {/* Chat Window */}
      <div style={chatStyles}>
        <ChatWindow
          messages={messages}
          onSendMessage={onSendMessage}
          header={header}
          isLoading={isLoading}
          theme={theme}
          showVoiceButton={showVoiceButton}
          onVoiceToggle={onVoiceToggle}
          isVoiceActive={isVoiceActive}
          streamingContent={streamingContent}
          streamingMessageId={streamingMessageId}
          isStreamingActive={isStreamingActive}
          onC1Action={onC1Action}
        />
      </div>
    </div>
  );
};