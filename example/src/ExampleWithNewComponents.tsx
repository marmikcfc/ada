import React, { useState } from 'react';
import { 
  BubbleWidget, 
  VoiceBot, 
  ChatWindow,
  MinimizableChatWindow,
  ThreadedChatWindow,
  FullscreenLayout,
  ThreadList,
  useGenuxClient,
  useThreadManager
} from '../../packages/genux-sdk/src/index';
import "@crayonai/react-ui/styles/index.css";

/**
 * Example showing how to use the new modular components
 */
function ExampleWithNewComponents() {
  const [showChat, setShowChat] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [mode, setMode] = useState<'simple' | 'threaded' | 'fullscreen' | 'minimizable'>('simple');

  // Initialize GenUX client
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/messages',
    autoConnect: true,
  });

  // Initialize thread manager
  const threadManager = useThreadManager({
    enablePersistence: true,
    storageKey: 'example-threads',
    maxThreads: 50,
  });

  // Floating widget buttons
  const floatingButtons = [
    {
      id: 'chat',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      onClick: () => {
        setShowChat(!showChat);
        setShowFullscreen(false);
      },
      label: 'Toggle chat',
    },
    {
      id: 'fullscreen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
        </svg>
      ),
      onClick: () => {
        setShowFullscreen(!showFullscreen);
        setShowChat(false);
      },
      label: 'Fullscreen mode',
    },
    {
      id: 'mic',
      icon: (
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={client.voiceState === 'connected' ? '#dc2626' : 'currentColor'}
          strokeWidth="2"
        >
          {client.voiceState === 'connected' ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </>
          )}
        </svg>
      ),
      onClick: () => {
        if (client.voiceState === 'connected') {
          client.stopVoice();
        } else {
          client.startVoice();
        }
      },
      label: client.voiceState === 'connected' ? 'Stop voice' : 'Start voice',
    },
  ];

  return (
    <div style={{ height: '100vh', position: 'relative', backgroundColor: '#f5f5f5' }}>
      {/* Main content */}
      <div style={{ padding: '20px' }}>
        <h1>GenUX SDK - New Component Architecture Demo</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => setMode('simple')}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px',
              backgroundColor: mode === 'simple' ? '#667eea' : '#f0f0f0',
              color: mode === 'simple' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Simple Chat
          </button>
          <button 
            onClick={() => setMode('threaded')}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px',
              backgroundColor: mode === 'threaded' ? '#667eea' : '#f0f0f0',
              color: mode === 'threaded' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            With Threads
          </button>
          <button 
            onClick={() => setMode('fullscreen')}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px',
              backgroundColor: mode === 'fullscreen' ? '#667eea' : '#f0f0f0',
              color: mode === 'fullscreen' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Fullscreen
          </button>
          <button 
            onClick={() => setMode('minimizable')}
            style={{ 
              padding: '8px 16px',
              backgroundColor: mode === 'minimizable' ? '#667eea' : '#f0f0f0',
              color: mode === 'minimizable' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Minimizable
          </button>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: 'white',
          minHeight: '400px'
        }}>
          {mode === 'simple' && (
            <div>
              <h2>Simple Chat Window</h2>
              <p>Basic chat without thread management - perfect for customer service.</p>
              <div style={{ height: '300px', border: '1px solid #eee', borderRadius: '4px' }}>
                <ChatWindow
                  messages={client.messages}
                  onSendMessage={client.sendText}
                  header={<h3 style={{ margin: 0 }}>Customer Support</h3>}
                  isLoading={client.isLoading}
                  showVoiceButton={true}
                  onVoiceToggle={() => {
                    if (client.voiceState === 'connected') {
                      client.stopVoice();
                    } else {
                      client.startVoice();
                    }
                  }}
                  isVoiceActive={client.voiceState === 'connected'}
                  streamingContent={client.streamingContent}
                  streamingMessageId={client.streamingMessageId}
                  isStreamingActive={client.isStreamingActive}
                  showMinimizeButton={true}
                  onMinimize={() => {
                    console.log('Chat minimized');
                  }}
                  onRestore={() => {
                    console.log('Chat restored');
                  }}
                />
              </div>
            </div>
          )}

          {mode === 'threaded' && (
            <div>
              <h2>Threaded Chat Window</h2>
              <p>Chat with thread management sidebar for conversation history.</p>
              <div style={{ height: '300px', border: '1px solid #eee', borderRadius: '4px' }}>
                <ThreadedChatWindow
                  messages={client.messages}
                  onSendMessage={client.sendText}
                  header={<h3 style={{ margin: 0 }}>Ada Assistant</h3>}
                  isLoading={client.isLoading}
                  threads={threadManager.threads.map(t => ({
                    id: t.id,
                    title: t.title,
                    lastMessage: t.lastMessage,
                    messageCount: t.messageCount,
                    updatedAt: t.updatedAt,
                    isActive: t.isActive,
                  }))}
                  activeThreadId={threadManager.activeThreadId}
                  onSelectThread={threadManager.switchThread}
                  onCreateThread={threadManager.createThread}
                  onDeleteThread={threadManager.deleteThread}
                  onRenameThread={threadManager.renameThread}
                  isCreatingThread={threadManager.isCreatingThread}
                  showVoiceButton={true}
                  onVoiceToggle={() => {
                    if (client.voiceState === 'connected') {
                      client.stopVoice();
                    } else {
                      client.startVoice();
                    }
                  }}
                  isVoiceActive={client.voiceState === 'connected'}
                  streamingContent={client.streamingContent}
                  streamingMessageId={client.streamingMessageId}
                  isStreamingActive={client.isStreamingActive}
                />
              </div>
            </div>
          )}

          {mode === 'fullscreen' && (
            <div>
              <h2>Fullscreen Layout</h2>
              <p>Click the fullscreen button in the floating widget to see the full experience.</p>
              <div style={{ 
                height: '300px', 
                border: '1px solid #eee', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <FullscreenLayout
                  backgroundColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  left={
                    <ThreadList
                      threads={threadManager.threads.map(t => ({
                        id: t.id,
                        title: t.title,
                        lastMessage: t.lastMessage,
                        messageCount: t.messageCount,
                        updatedAt: t.updatedAt,
                        isActive: t.isActive,
                      }))}
                      activeThreadId={threadManager.activeThreadId}
                      onSelectThread={threadManager.switchThread}
                      onCreateThread={threadManager.createThread}
                      onDeleteThread={threadManager.deleteThread}
                      onRenameThread={threadManager.renameThread}
                      isCreatingThread={threadManager.isCreatingThread}
                    />
                  }
                  center={
                    <VoiceBot
                      size="large"
                      animated={true}
                      isConnected={client.voiceState === 'connected'}
                      isConnecting={client.voiceState === 'connecting'}
                      onToggle={() => {
                        if (client.voiceState === 'connected') {
                          client.stopVoice();
                        } else {
                          client.startVoice();
                        }
                      }}
                    />
                  }
                  right={
                    <ChatWindow
                      messages={client.messages}
                      onSendMessage={client.sendText}
                      isLoading={client.isLoading}
                      streamingContent={client.streamingContent}
                      streamingMessageId={client.streamingMessageId}
                      isStreamingActive={client.isStreamingActive}
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    />
                  }
                />
              </div>
            </div>
          )}

          {mode === 'minimizable' && (
            <div>
              <h2>Minimizable Chat Window</h2>
              <p>Chat window with built-in minimize/restore functionality. Click the minimize button in the top-right corner.</p>
              <div style={{ height: '300px', border: '1px solid #eee', borderRadius: '4px' }}>
                <MinimizableChatWindow
                  messages={client.messages}
                  onSendMessage={client.sendText}
                  header={<h3 style={{ margin: 0 }}>Minimizable Chat</h3>}
                  isLoading={client.isLoading}
                  showVoiceButton={true}
                  onVoiceToggle={() => {
                    if (client.voiceState === 'connected') {
                      client.stopVoice();
                    } else {
                      client.startVoice();
                    }
                  }}
                  isVoiceActive={client.voiceState === 'connected'}
                  streamingContent={client.streamingContent}
                  streamingMessageId={client.streamingMessageId}
                  isStreamingActive={client.isStreamingActive}
                  showMinimizeButton={true}
                  minimizedHeight="50px"
                  onMinimizeChange={(isMinimized) => {
                    console.log('Chat minimized state:', isMinimized);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p><strong>Voice State:</strong> {client.voiceState}</p>
          <p><strong>Connection State:</strong> {client.connectionState}</p>
          <p><strong>Messages:</strong> {client.messages.length}</p>
          <p><strong>Active Thread:</strong> {threadManager.activeThreadId || 'None'}</p>
        </div>
      </div>

      {/* Floating Widget - Always visible */}
      <BubbleWidget
        onChatClick={() => setShowChat(!showChat)}
        onMicToggle={() => {
          if (client.voiceState === 'connected') {
            client.stopVoice();
          } else {
            client.startVoice();
          }
        }}
        isMicActive={client.voiceState === 'connected'}
        onFullScreenClick={() => {
          setShowFullscreen(!showFullscreen);
          setShowChat(false);
        }}
        allowFullScreen={true}
      />

      {/* Popup Chat Window with Minimize Functionality */}
      {showChat && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '400px',
          height: '500px',
          zIndex: 10000,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <MinimizableChatWindow
            agentName="AI Assistant"
            messages={client.messages}
            onSendMessage={client.sendText}
            isLoading={client.isLoading}
            showVoiceButton={true}
            onVoiceToggle={() => {
              if (client.voiceState === 'connected') {
                client.stopVoice();
              } else {
                client.startVoice();
              }
            }}
            isVoiceActive={client.voiceState === 'connected'}
            streamingContent={client.streamingContent}
            streamingMessageId={client.streamingMessageId}
            isStreamingActive={client.isStreamingActive}
            showMinimizeButton={true}
            minimizedHeight="60px"
            onMinimizeChange={(isMinimized) => {
              console.log('Popup chat minimized:', isMinimized);
              // When minimized, we can also hide the chat window container
              if (isMinimized) {
                // Chat window handles its own minimized state internally
              }
            }}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 20000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}>
          <div style={{
            position: 'absolute',
            top: '5%',
            left: '5%',
            width: '90%',
            height: '90%',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <FullscreenLayout
              backgroundColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              left={
                <ThreadList
                  threads={threadManager.threads.map(t => ({
                    id: t.id,
                    title: t.title,
                    lastMessage: t.lastMessage,
                    messageCount: t.messageCount,
                    updatedAt: t.updatedAt,
                    isActive: t.isActive,
                  }))}
                  activeThreadId={threadManager.activeThreadId}
                  onSelectThread={threadManager.switchThread}
                  onCreateThread={threadManager.createThread}
                  onDeleteThread={threadManager.deleteThread}
                  onRenameThread={threadManager.renameThread}
                  isCreatingThread={threadManager.isCreatingThread}
                />
              }
              center={
                <div style={{ textAlign: 'center' }}>
                  <VoiceBot
                    size="large"
                    animated={true}
                    isConnected={client.voiceState === 'connected'}
                    isConnecting={client.voiceState === 'connecting'}
                    onToggle={() => {
                      if (client.voiceState === 'connected') {
                        client.stopVoice();
                      } else {
                        client.startVoice();
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowFullscreen(false)}
                    style={{
                      marginTop: '20px',
                      padding: '10px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Close Fullscreen
                  </button>
                </div>
              }
              right={
                <ChatWindow
                  messages={client.messages}
                  onSendMessage={client.sendText}
                  isLoading={client.isLoading}
                  streamingContent={client.streamingContent}
                  streamingMessageId={client.streamingMessageId}
                  isStreamingActive={client.isStreamingActive}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                />
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ExampleWithNewComponents;