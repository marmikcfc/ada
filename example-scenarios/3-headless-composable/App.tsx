import React, { useState, useRef, useEffect } from 'react';
import { useGenuxCore, Message, MessageRole } from 'genux-sdk';
import './App.css';

/**
 * Example 3: Headless / Fully Composable
 * 
 * This demonstrates the most flexible way to use Genux SDK with complete
 * control over the DOM structure and UI components. No pre-built UI is used,
 * only the core functionality hook.
 * 
 * Features:
 * - Complete control over DOM and styling
 * - Custom message rendering
 * - Custom input handling
 * - Custom voice UI
 * - No widget or pre-built components
 */
function App() {
  // Text input state
  const [inputText, setInputText] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Get core functionality from the hook
  const {
    // State
    messages,
    isLoading,
    isVoiceConnected,
    streamingContent,
    
    // Actions
    sendText,
    startVoice,
    stopVoice,
    clearMessages,
    
    // Voice state
    voiceState,
  } = useGenuxCore({
    webrtcURL: '/api/webrtc',
    websocketURL: '/api/ws',
    onError: (error) => console.error('Genux error:', error),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle text input submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      sendText(inputText);
      setInputText('');
    }
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (voiceState === 'connected') {
      stopVoice();
    } else {
      startVoice();
    }
  };

  // Custom message rendering function
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={message.id} 
        className={`custom-message ${isUser ? 'user-message' : 'assistant-message'}`}
      >
        {/* Custom avatar */}
        <div className="message-avatar">
          {isUser ? (
            <div className="user-avatar">U</div>
          ) : (
            <div className="assistant-avatar">A</div>
          )}
        </div>
        
        {/* Message content with custom rendering */}
        <div className="message-content">
          {/* For user messages, just show the text */}
          {isUser && <div className="message-text">{message.content}</div>}
          
          {/* For assistant messages, we can parse and render C1 content */}
          {!isUser && (
            <div className="assistant-content">
              {/* This is where you'd implement your own C1 content renderer */}
              {/* For this example, we'll just render the text */}
              <div className="message-text">{message.content}</div>
            </div>
          )}
          
          {/* Message timestamp */}
          <div className="message-time">
            {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Headless Composable Example</h1>
        <p>
          This example shows how to use Genux SDK in a completely headless way,
          with full control over the UI and DOM structure.
        </p>
      </header>
      
      <main className="app-content">
        <div className="chat-container">
          {/* Custom chat header */}
          <div className="chat-header">
            <h2>Custom Chat Interface</h2>
            <button 
              className="clear-button" 
              onClick={clearMessages}
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
          </div>
          
          {/* Custom message list */}
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                Start a conversation by typing a message or using voice input.
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            
            {/* Streaming message */}
            {streamingContent && (
              <div className="custom-message assistant-message">
                <div className="message-avatar">
                  <div className="assistant-avatar">A</div>
                </div>
                <div className="message-content">
                  <div className="message-text streaming">
                    {streamingContent}
                    <span className="cursor"></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isLoading && !streamingContent && (
              <div className="loading-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messageEndRef} />
          </div>
          
          {/* Custom composer */}
          <form className="custom-composer" onSubmit={handleSendMessage}>
            {/* Voice button */}
            <button 
              type="button"
              className={`voice-button ${voiceState === 'connected' ? 'active' : ''}`}
              onClick={handleVoiceToggle}
            >
              {voiceState === 'connected' ? (
                <span className="mic-icon recording">⏹</span>
              ) : (
                <span className="mic-icon">🎤</span>
              )}
            </button>
            
            {/* Text input */}
            <input
              type="text"
              className="message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || voiceState === 'connected'}
            />
            
            {/* Send button */}
            <button 
              type="submit" 
              className="send-button"
              disabled={!inputText.trim() || isLoading}
            >
              Send
            </button>
          </form>
        </div>
        
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { useGenuxCore } from 'genux-sdk';

// Get core functionality without any UI components
const {
  // State
  messages,
  isLoading,
  streamingContent,
  
  // Actions
  sendText,
  startVoice,
  stopVoice,
  
  // Voice state
  voiceState,
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
});

// Build your own UI with complete control
return (
  <div className="my-custom-chat">
    {/* Your custom message list */}
    <div className="message-list">
      {messages.map(message => (
        <MyCustomMessage key={message.id} message={message} />
      ))}
      {streamingContent && <MyStreamingMessage content={streamingContent} />}
    </div>
    
    {/* Your custom composer */}
    <MyCustomComposer 
      onSendText={sendText}
      onToggleVoice={() => voiceState === 'connected' ? stopVoice() : startVoice()}
      isVoiceActive={voiceState === 'connected'}
      isLoading={isLoading}
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
