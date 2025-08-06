import React, { useState, useRef, CSSProperties } from 'react';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';
import type { Thread } from '../../types';

export interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onRenameThread?: (threadId: string, title: string) => void;
  isCreatingThread?: boolean;
  isLoading?: boolean;
  allowDeletion?: boolean;
  maxThreads?: number;
  theme?: any;
  className?: string;
  style?: CSSProperties;
}

/**
 * Reusable thread list component for managing conversations
 */
export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  isCreatingThread = false,
  isLoading = false,
  allowDeletion = true,
  maxThreads = 50,
  theme,
  className = '',
  style,
}) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: cssVars['--geui-color-background'],
    ...style,
  };

  const threadItemStyles = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: cssVars['--geui-spacing-sm'],
    marginBottom: cssVars['--geui-spacing-xs'],
    borderRadius: cssVars['--geui-radius-md'],
    cursor: 'pointer',
    backgroundColor: isActive ? cssVars['--geui-color-primary'] : 'transparent',
    color: isActive ? '#ffffff' : cssVars['--geui-color-text'],
    transition: 'background-color 0.2s ease',
  });

  const handleStartEdit = (threadId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(threadId);
    setEditTitle(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleFinishEdit = () => {
    if (editingThreadId && editTitle.trim() && onRenameThread) {
      onRenameThread(editingThreadId, editTitle.trim());
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteThread && window.confirm('Are you sure you want to delete this thread?')) {
      onDeleteThread(threadId);
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`geui-thread-list ${className}`} style={containerStyles}>
      {/* New Thread Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: cssVars['--geui-spacing-md'],
          cursor: 'pointer',
          borderRadius: cssVars['--geui-radius-md'],
          border: `1px dashed ${cssVars['--geui-color-border']}`,
          marginBottom: cssVars['--geui-spacing-sm'],
          transition: 'background-color 0.2s ease',
        }}
        onClick={onCreateThread}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: cssVars['--geui-color-primary'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: cssVars['--geui-spacing-sm'],
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <span style={{ fontSize: cssVars['--geui-font-size-sm'], fontWeight: '500' }}>
          {isCreatingThread ? 'Creating...' : 'New conversation'}
        </span>
      </div>

      {/* Thread List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: cssVars['--geui-spacing-sm'] }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: cssVars['--geui-spacing-lg'] }}>
            Loading threads...
          </div>
        ) : threads.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: cssVars['--geui-spacing-lg'],
            color: cssVars['--geui-color-textSecondary'],
          }}>
            No conversations yet
          </div>
        ) : (
          threads.slice(0, maxThreads).map((thread) => (
            <div
              key={thread.id}
              style={threadItemStyles(thread.isActive || thread.id === activeThreadId)}
              onClick={() => onSelectThread(thread.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingThreadId === thread.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishEdit();
                      if (e.key === 'Escape') {
                        setEditingThreadId(null);
                        setEditTitle('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '2px 4px',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      borderRadius: cssVars['--geui-radius-sm'],
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'inherit',
                      fontSize: cssVars['--geui-font-size-sm'],
                      outline: 'none',
                    }}
                  />
                ) : (
                  <>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: cssVars['--geui-font-size-sm'],
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {thread.title}
                    </h4>
                    <div style={{ 
                      fontSize: cssVars['--geui-font-size-xs'],
                      opacity: 0.8,
                      marginTop: '2px',
                    }}>
                      {thread.messageCount} messages · {formatRelativeTime(thread.updatedAt)}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thread Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                marginLeft: '8px',
                opacity: (thread.isActive || thread.id === activeThreadId) ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}>
                {onRenameThread && (
                  <button
                    onClick={(e) => handleStartEdit(thread.id, thread.title, e)}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: cssVars['--geui-radius-sm'],
                    }}
                    title="Rename"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                    </svg>
                  </button>
                )}
                {allowDeletion && onDeleteThread && (
                  <button
                    onClick={(e) => handleDeleteThread(thread.id, e)}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: cssVars['--geui-radius-sm'],
                    }}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .geui-thread-list .thread-item:hover .thread-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};