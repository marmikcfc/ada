import React, { useState } from 'react';
import { 
  GenuxCore,
  MessageList,
  Composer,
  ThreadSidebar,
  useGenuxCore,
  Message
} from 'genux-sdk';
import './App.css';

/**
 * Example 4: Chat Primitives
 * 
 * This demonstrates how to use the basic chat primitive components
 * as building blocks to create your own custom chat interface.
 * 
 * Features:
 * - Modular components that can be arranged in any layout
 * - Each component handles its specific responsibility
 * - Full control over styling and layout
 * - Flexible composition patterns
 */
function App() {
  // Layout state to demonstrate different arrangements
  const [layout, setLayout] = useState<'default' | 'minimal' | 'split'>('default');
  
  // Get core functionality from the hook
  const {
    // State
    messages,
    threads,
    selectedThreadId,
    isLoading,
    streamingContent,
    
    // Actions
    sendText,
    startVoice,
    stopVoice,
    selectThread,
    createThread,
    deleteThread,
    
    // Voice state
    voiceState,
  } = useGenuxCore({
    webrtcURL: '/api/webrtc',
    websocketURL: '/api/ws',
    enableThreads: true, // Enable thread management
  });

  // Render different layouts to demonstrate component flexibility
  const renderChatLayout = () => {
    switch (layout) {
      case 'minimal':
        return (
          <div className="minimal-layout">
            {/* Just the essential components in a simple vertical layout */}
            <MessageList 
              messages={messages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              className="minimal-message-list"
            />
            <Composer
              onSendText={sendText}
              onToggleVoice={() => voiceState === 'connected' ? stopVoice() : startVoice()}
              isVoiceActive={voiceState === 'connected'}
              isLoading={isLoading}
              className="minimal-composer"
              placeholder="Type a message..."
            />
          </div>
        );
        
      case 'split':
        return (
          <div className="split-layout">
            {/* Left panel for threads */}
            <div className="left-panel">
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThreadId}
                onSelectThread={selectThread}
                onCreateThread={createThread}
                onDeleteThread={deleteThread}
                className="thread-sidebar"
              />
            </div>
            
            {/* Right panel split into messages and composer */}
            <div className="right-panel">
              <div className="message-panel">
                <MessageList 
                  messages={messages}
                  isLoading={isLoading}
                  streamingContent={streamingContent}
                  className="split-message-list"
                  emptyState={
                    <div className="custom-empty-state">
                      <h3>No messages yet</h3>
                      <p>Start a conversation or select a thread</p>
                    </div>
                  }
                />
              </div>
              <div className="composer-panel">
                <Composer
                  onSendText={sendText}
                  onToggleVoice={() => voiceState === 'connected' ? stopVoice() : startVoice()}
                  isVoiceActive={voiceState === 'connected'}
                  isLoading={isLoading}
                  className="split-composer"
                  voiceButtonPosition="left"
                  sendButtonText="Send Message"
                />
              </div>
            </div>
          </div>
        );
        
      default: // 'default'
        return (
          <div className="default-layout">
            {/* Standard chat layout with sidebar on left */}
            <div className="sidebar-container">
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThreadId}
                onSelectThread={selectThread}
                onCreateThread={createThread}
                onDeleteThread={deleteThread}
                className="default-thread-sidebar"
                newThreadButtonText="New Conversation"
              />
            </div>
            
            <div className="chat-container">
              <div className="messages-container">
                <MessageList 
                  messages={messages}
                  isLoading={isLoading}
                  streamingContent={streamingContent}
                  className="default-message-list"
                  renderMessage={(message: Message) => (
                    <div className={`custom-message ${message.role === 'user' ? 'user' : 'assistant'}`}>
                      <div className="message-avatar">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-bubble">
                        {message.content}
                      </div>
                    </div>
                  )}
                />
              </div>
              
              <div className="composer-container">
                <Composer
                  onSendText={sendText}
                  onToggleVoice={() => voiceState === 'connected' ? stopVoice() : startVoice()}
                  isVoiceActive={voiceState === 'connected'}
                  isLoading={isLoading}
                  className="default-composer"
                  placeholder="Ask a question..."
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Chat Primitives Example</h1>
        <p>
          This example shows how to use the basic chat primitive components
          as building blocks to create your own custom chat interface.
        </p>
        
        {/* Layout switcher */}
        <div className="layout-switcher">
          <button 
            className={layout === 'default' ? 'active' : ''} 
            onClick={() => setLayout('default')}
          >
            Default Layout
          </button>
          <button 
            className={layout === 'minimal' ? 'active' : ''} 
            onClick={() => setLayout('minimal')}
          >
            Minimal Layout
          </button>
          <button 
            className={layout === 'split' ? 'active' : ''} 
            onClick={() => setLayout('split')}
          >
            Split Layout
          </button>
        </div>
      </header>
      
      <main className="app-content">
        {/* The actual chat layout with primitive components */}
        <div className="chat-layout">
          {renderChatLayout()}
        </div>
        
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { 
  useGenuxCore, 
  MessageList, 
  Composer, 
  ThreadSidebar 
} from 'genux-sdk';

// Get core functionality
const {
  messages,
  threads,
  selectedThreadId,
  isLoading,
  streamingContent,
  sendText,
  selectThread,
  createThread,
  // ... more actions and state
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
  enableThreads: true,
});

// Use primitive components to build your UI
return (
  <div className="my-chat-layout">
    {/* Thread management sidebar */}
    <ThreadSidebar
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={selectThread}
      onCreateThread={createThread}
      onDeleteThread={deleteThread}
      newThreadButtonText="Start New Chat"
    />
    
    {/* Message display area */}
    <MessageList 
      messages={messages}
      isLoading={isLoading}
      streamingContent={streamingContent}
      renderMessage={(message) => (
        <MyCustomMessageComponent message={message} />
      )}
    />
    
    {/* Input composer */}
    <Composer
      onSendText={sendText}
      onToggleVoice={handleVoiceToggle}
      isVoiceActive={isVoiceActive}
      isLoading={isLoading}
      placeholder="Type your message..."
    />
  </div>
);`}
          </pre>
        </div>
      </main>
    </div>
  );
}

export default App;
