import React, { useState, useRef, CSSProperties } from 'react';
import { ThreadManagerProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';

/**
 * ThreadManager component for managing conversation threads
 * 
 * Displays a list of conversation threads with options to create new threads,
 * switch between existing threads, and manage thread metadata.
 */
const ThreadManager: React.FC<ThreadManagerProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  isCreatingThread = false,
  isLoading = false,
  options = {},
  theme,
  style,
  className = '',
  hideHeader = false,
}) => {
  // State for editing thread titles
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Merge custom theme with default theme
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);

  // Default options
  const {
    maxThreads = 50,
    autoGenerateTitles = true,
    showCreateButton = true,
    allowThreadDeletion = true,
  } = options;

  // Container styles
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: cssVars['--genux-color-background'],
    borderRight: `1px solid ${cssVars['--genux-color-border']}`,
    ...style,
  };

  // Header styles
  const headerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: cssVars['--genux-spacing-md'],
    borderBottom: `1px solid ${cssVars['--genux-color-border']}`,
    backgroundColor: cssVars['--genux-color-surface'],
  };

  // Title styles
  const titleStyles: CSSProperties = {
    margin: 0,
    fontSize: cssVars['--genux-font-size-md'],
    fontWeight: '600',
    color: cssVars['--genux-color-text'],
  };

  // Create button styles
  const createButtonStyles: CSSProperties = {
    padding: `${cssVars['--genux-spacing-xs']} ${cssVars['--genux-spacing-sm']}`,
    backgroundColor: cssVars['--genux-color-primary'],
    color: '#ffffff',
    border: 'none',
    borderRadius: cssVars['--genux-radius-md'],
    cursor: isCreatingThread ? 'not-allowed' : 'pointer',
    fontSize: cssVars['--genux-font-size-sm'],
    fontWeight: '500',
    opacity: isCreatingThread ? 0.6 : 1,
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: cssVars['--genux-spacing-xs'],
  };

  // Thread list styles
  const threadListStyles: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: cssVars['--genux-spacing-sm'],
  };

  // Thread item styles
  const getThreadItemStyles = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: cssVars['--genux-spacing-sm'],
    marginBottom: cssVars['--genux-spacing-xs'],
    borderRadius: cssVars['--genux-radius-md'],
    cursor: 'pointer',
    backgroundColor: isActive 
      ? cssVars['--genux-color-primary'] 
      : 'transparent',
    color: isActive 
      ? '#ffffff' 
      : cssVars['--genux-color-text'],
    transition: 'background-color 0.2s ease, color 0.2s ease',
    position: 'relative',
    border: isActive 
      ? 'none' 
      : `1px solid transparent`,
  });

  // Thread content styles
  const threadContentStyles: CSSProperties = {
    flex: 1,
    minWidth: 0, // Allow text to truncate
  };

  // Thread title styles
  const threadTitleStyles: CSSProperties = {
    fontSize: cssVars['--genux-font-size-sm'],
    fontWeight: '500',
    margin: 0,
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  // Thread meta styles
  const threadMetaStyles: CSSProperties = {
    fontSize: cssVars['--genux-font-size-xs'],
    opacity: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  // Thread actions styles
  const threadActionsStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: cssVars['--genux-spacing-xs'],
    marginLeft: cssVars['--genux-spacing-xs'],
    opacity: 0,
    transition: 'opacity 0.2s ease',
  };

  // Action button styles
  const actionButtonStyles: CSSProperties = {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: cssVars['--genux-radius-sm'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  };

  // Edit input styles
  const editInputStyles: CSSProperties = {
    flex: 1,
    padding: '2px 4px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: cssVars['--genux-radius-sm'],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'inherit',
    fontSize: cssVars['--genux-font-size-sm'],
    fontWeight: '500',
    outline: 'none',
  };

  // Loading styles
  const loadingStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: cssVars['--genux-spacing-lg'],
    color: cssVars['--genux-color-textSecondary'],
    fontSize: cssVars['--genux-font-size-sm'],
  };

  // Empty state styles
  const emptyStateStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: cssVars['--genux-spacing-lg'],
    textAlign: 'center',
    color: cssVars['--genux-color-textSecondary'],
  };

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    if (editingThreadId) return; // Don't switch if editing
    onThreadSelect(threadId);
  };

  // Handle thread creation
  const handleCreateThread = () => {
    if (isCreatingThread) return;
    onCreateThread();
  };

  // Handle start editing
  const handleStartEdit = (threadId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(threadId);
    setEditTitle(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Handle finish editing
  const handleFinishEdit = () => {
    if (editingThreadId && editTitle.trim() && onRenameThread) {
      onRenameThread(editingThreadId, editTitle.trim());
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  // Handle delete thread
  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteThread && window.confirm('Are you sure you want to delete this thread?')) {
      onDeleteThread(threadId);
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // CSS for hover effects
  const hoverStyles = `
    .thread-item:hover .thread-actions {
      opacity: 1;
    }
    
    .thread-item:hover {
      background-color: ${cssVars['--genux-color-surface']} !important;
    }
    
    .thread-item.active:hover {
      background-color: ${cssVars['--genux-color-primary']} !important;
      opacity: 0.9;
    }
    
    .new-conversation-item:hover {
      background-color: ${cssVars['--genux-color-background']} !important;
    }
    
    .action-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .action-button.delete-button:hover {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    .create-button:hover:not(:disabled) {
      opacity: 0.9;
    }
  `;

  return (
    <>
      <style>{hoverStyles}</style>
      <div className={`genux-thread-manager ${className}`} style={containerStyles}>
        {/* Header */}
        {!hideHeader && (
          <div className="genux-thread-manager-header" style={headerStyles}>
            <h3 style={titleStyles}>Conversations</h3>
          </div>
        )}

        {/* Thread List */}
        <div className="genux-thread-list" style={threadListStyles}>
          {isLoading ? (
            <div style={loadingStyles}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #e2e8f0',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }} />
              Loading threads...
            </div>
          ) : (
            <>
              {/* New Conversation Button Row */}
              <div
                className="new-conversation-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: cssVars['--genux-spacing-md'],
                  cursor: 'pointer',
                  borderRadius: cssVars['--genux-radius-md'],
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.2s ease',
                  border: `1px dashed ${cssVars['--genux-color-border']}`,
                  marginBottom: cssVars['--genux-spacing-sm'],
                }}
                onClick={handleCreateThread}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: cssVars['--genux-color-primary'],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: cssVars['--genux-spacing-sm'],
                  flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <div style={{
                  flex: 1,
                  fontSize: cssVars['--genux-font-size-sm'],
                  color: cssVars['--genux-color-text'],
                  fontWeight: '500',
                }}>
                  {isCreatingThread ? 'Creating conversation...' : 'New conversation'}
                </div>
              </div>

              {/* Existing Threads */}
              {threads.length === 0 ? (
                <div style={emptyStateStyles}>
                  <svg 
                    width="48" 
                    height="48" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                    style={{ marginBottom: '12px', opacity: 0.5 }}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <p style={{ margin: 0, fontSize: cssVars['--genux-font-size-sm'] }}>
                    No conversations yet
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: cssVars['--genux-font-size-xs'], opacity: 0.8 }}>
                    Click "New conversation" above to get started
                  </p>
                </div>
              ) : (
                // Filter out duplicate threads and limit to maxThreads
                threads
                  .filter((thread, index, self) => 
                    index === self.findIndex(t => t.title === thread.title && t.id === thread.id)
                  )
                  .slice(0, maxThreads)
                  .map((thread) => (
                    <div
                      key={thread.id}
                      className={`thread-item ${thread.isActive ? 'active' : ''}`}
                      style={getThreadItemStyles(thread.isActive)}
                      onClick={() => handleThreadSelect(thread.id)}
                    >
                      <div style={threadContentStyles}>
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
                            style={editInputStyles}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h4 style={threadTitleStyles}>{thread.title}</h4>
                        )}
                        <div style={threadMetaStyles}>
                          {thread.lastMessage && (
                            <div style={{ marginBottom: '2px' }}>{thread.lastMessage}</div>
                          )}
                          <div>
                            {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''} · {formatRelativeTime(thread.updatedAt)}
                          </div>
                        </div>
                      </div>

                      {/* Thread Actions - Always show on active thread or on hover */}
                      <div 
                        className="thread-actions" 
                        style={{
                          ...threadActionsStyles,
                          opacity: thread.isActive ? 1 : threadActionsStyles.opacity, // Always show for active thread
                        }}
                      >
                        {/* Edit button */}
                        <button
                          className="action-button edit-button"
                          style={actionButtonStyles}
                          onClick={(e) => handleStartEdit(thread.id, thread.title, e)}
                          title="Rename thread"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                          </svg>
                        </button>

                        {/* Delete button */}
                        {allowThreadDeletion && (
                          <button
                            className="action-button delete-button"
                            style={{ ...actionButtonStyles, marginLeft: '4px' }}
                            onClick={(e) => handleDeleteThread(thread.id, e)}
                            title="Delete thread"
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
            </>
          )}
        </div>

        {/* Inline CSS for animations */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
};

export default ThreadManager; 