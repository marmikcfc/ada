import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  useThreadManager, 
  useThreadListManager,
} from '@thesysai/genui-sdk';
import AnimatedBlob from './AnimatedBlob';
import GenerativeUIChat from './GenerativeUIChat';
import './FullscreenLayout.css';
import { Message } from '../types';

interface Thread {
  threadId: string;
  title: string;
  createdAt: Date;
  messages: any[];
}

interface VoiceBotFullscreenLayoutConfig {
  // Agent configuration
  agentName?: string;
  agentSubtitle?: string;
  logoUrl?: string;
  
  // UI configuration
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  
  // Thread manager configuration
  threadManagerTitle?: string;
  enableThreadManager?: boolean;
  
  // Custom labels
  startCallButtonText?: string;
  endCallButtonText?: string;
  connectingText?: string;
  webrtcURL?: string;
  websocketURL?: string;
}

interface VoiceBotFullscreenLayoutProps {
  // Voice state
  isVoiceConnected?: boolean;
  isVoiceLoading?: boolean;
  onToggleVoice?: () => void;
  
  // Chat state
  onSendMessage?: (message: string) => void;
  onC1Action?: (action: any) => void;
  isLoading?: boolean;
  isEnhancing?: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;
  /** List of chat messages from MynaClient */
  messages?: Message[];
  
  // Configuration
  config?: VoiceBotFullscreenLayoutConfig;
  
  // Close handler
  onClose?: () => void;
}

const VoiceBotFullscreenLayout: React.FC<VoiceBotFullscreenLayoutProps> = ({
  isVoiceConnected = false,
  isVoiceLoading = false,
  onToggleVoice,
  onSendMessage,
  onC1Action,
  isLoading = false,
  isEnhancing = false,
  streamingContent = '',
  streamingMessageId = null,
  isStreamingActive = false,
  messages = [],
  config = {},
  onClose
}) => {
  // Extract config values with defaults
  const {
    agentName = "Ada",
    agentSubtitle = "How can I help you today?",
    logoUrl = "/favicon.ico",
    backgroundColor = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    primaryColor = "#667eea",
    accentColor = "#5a67d8",
    threadManagerTitle = "Conversations",
    enableThreadManager = true,
    startCallButtonText = "Start a call",
    endCallButtonText = "End call",
    connectingText = "Connecting...",
  } = config;
  
  const [isThreadManagerCollapsed, setIsThreadManagerCollapsed] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Thread list management with stable callbacks
  const threadListManager = useThreadListManager({
    fetchThreadList: useCallback(() => Promise.resolve([]), []),
    deleteThread: useCallback((threadId) => {
      console.log('Deleting thread:', threadId);
      return Promise.resolve();
    }, []),
    updateThread: useCallback((thread) => {
      console.log('Updating thread:', thread);
      return Promise.resolve(thread);
    }, []),
    onSwitchToNew: useCallback(() => {
      console.log('Starting new voice conversation');
    }, []),
    onSelectThread: useCallback((threadId) => {
      console.log('Selected thread:', threadId);
    }, []),
    createThread: useCallback((message) => {
      console.log('Creating new thread for message:', message);
      return Promise.resolve({
        threadId: crypto.randomUUID(),
        title: 'Voice Chat Session',
        createdAt: new Date(),
        messages: []
      });
    }, [])
  });

  // Thread management with stable callbacks
  const threadManager = useThreadManager({
    threadListManager,
    loadThread: useCallback((threadId) => {
      console.log('Loading thread:', threadId);
      return Promise.resolve([]); 
    }, []),
    onUpdateMessage: useCallback(({ message }) => {
      console.log('Message updated:', message);
    }, []),
    apiUrl: '/api/chat',
  });

  // Toggle thread manager collapse
  const toggleThreadManagerCollapse = useCallback(() => {
    setIsThreadManagerCollapsed(prev => !prev);
  }, []);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    console.log('Selected thread:', threadId);
  }, []);

  // Handle create new thread
  const handleCreateThread = useCallback(() => {
    const newThread: Thread = {
      threadId: crypto.randomUUID(),
      title: 'New Conversation',
      createdAt: new Date(),
      messages: []
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.threadId);
    console.log('Created new thread:', newThread.threadId);
  }, []);

  // Handle delete thread
  const handleDeleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(t => t.threadId !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
    console.log('Deleted thread:', threadId);
  }, [activeThreadId]);

  // Handle rename thread
  const handleRenameThread = useCallback((threadId: string, newTitle: string) => {
    setThreads(prev => prev.map(t => 
      t.threadId === threadId ? { ...t, title: newTitle } : t
    ));
    console.log('Renamed thread:', threadId, 'to:', newTitle);
  }, []);

  // Format relative time for threads
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="fullscreen-layout"
      style={{
        background: backgroundColor,
        '--primary-color': primaryColor,
        '--accent-color': accentColor,
      } as React.CSSProperties}
    >
      {/* Left Column - Thread Manager */}
      {enableThreadManager && (
        <div className={`thread-manager-column ${isThreadManagerCollapsed ? 'collapsed' : 'expanded'}`}>
          {isThreadManagerCollapsed ? (
            // Collapsed view
            <div className="thread-manager-collapsed">
              <button
                className="expand-button"
                onClick={toggleThreadManagerCollapse}
                title="Expand conversations"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z" />
                </svg>
              </button>
              
              <button
                className="quick-create-button"
                onClick={handleCreateThread}
                title="Create new conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          ) : (
            // Expanded view
            <div className="thread-manager-expanded">
              <div className="thread-manager-header">
                <h3>{threadManagerTitle}</h3>
                <button
                  className="collapse-button"
                  onClick={toggleThreadManagerCollapse}
                  title="Collapse conversations"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z" />
                  </svg>
                </button>
              </div>
              
              <div className="thread-list">
                <button className="create-thread-button" onClick={handleCreateThread}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  New Conversation
                </button>
                
                {threads.length === 0 ? (
                  <div className="empty-state">
                    <p>No conversations yet</p>
                    <p>Start by creating a new conversation above</p>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.threadId}
                      className={`thread-item ${activeThreadId === thread.threadId ? 'active' : ''}`}
                      onClick={() => handleThreadSelect(thread.threadId)}
                    >
                      <div className="thread-content">
                        <div className="thread-title">{thread.title}</div>
                        <div className="thread-meta">{formatRelativeTime(thread.createdAt)}</div>
                      </div>
                      <div className="thread-actions">
                        <button
                          className="action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt('Enter new title:', thread.title);
                            if (newTitle && newTitle.trim()) {
                              handleRenameThread(thread.threadId, newTitle.trim());
                            }
                          }}
                          title="Rename thread"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="action-button delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this conversation?')) {
                              handleDeleteThread(thread.threadId);
                            }
                          }}
                          title="Delete thread"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Middle Column - 3D Blob */}
      <div className="blob-column">
        <AnimatedBlob
          isVoiceConnected={isVoiceConnected}
          isVoiceLoading={isVoiceLoading}
          onToggleVoice={onToggleVoice}
          className="fullscreen-blob"
          startCallButtonText={startCallButtonText}
          endCallButtonText={endCallButtonText}
          connectingText={connectingText}
        />
        
        {/* Agent name display */}
        <div className="agent-branding">
          <h1 className="agent-name">{agentName}</h1>
          <p className="agent-subtitle">{agentSubtitle}</p>
        </div>
      </div>

      {/* Right Column - Chat Window */}
      <div className="chat-column">
        <div className="chat-header">
          <div className="chat-header-content">
            {logoUrl && <img src={logoUrl} alt={`${agentName} logo`} className="chat-logo" />}
            <span className="chat-agent-name">{agentName}</span>
          </div>
        </div>
        
        <div className="chat-content">
          <GenerativeUIChat
            threadManager={threadManager}
            agentName={agentName}
            logoUrl={logoUrl}
            messages={messages}
            onSendMessage={onSendMessage}
            onC1Action={onC1Action}
            onToggleVoiceConnection={onToggleVoice}
            isVoiceConnected={isVoiceConnected}
            isVoiceConnectionLoading={isVoiceLoading}
            isLoading={isLoading}
            isVoiceLoading={isVoiceLoading}
            isEnhancing={isEnhancing}
            streamingContent={streamingContent}
            streamingMessageId={streamingMessageId}
            isStreamingActive={isStreamingActive}
            config={config}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceBotFullscreenLayout; 