import React, { useState, useRef, useEffect } from 'react';
import { useMynaClient, Message } from '../src';

/**
 * Example: Headless Custom UI
 * 
 * This example demonstrates how to use the useMynaClient hook to build
 * a completely custom chat interface without using any of the default
 * Myna UI components. This gives you full control over the UI while
 * still leveraging the connection and state management provided by the SDK.
 */
const HeadlessCustomExample: React.FC = () => {
  // Text input state
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Initialize the Myna client with connection settings
  const client = useMynaClient({
    webrtcURL: 'https://your-backend.com/api/offer',
    websocketURL: 'wss://your-backend.com/ws/messages',
    autoConnect: true,
  });
  
  // Destructure values from the client for easier access
  const {
    messages,
    sendText,
    startVoice,
    stopVoice,
    connectionState,
    voiceState,
    isLoading,
    isVoiceLoading,
    isEnhancing,
    streamingContent,
    streamingMessageId,
    isStreamingActive,
    audioStream,
  } = client;
  
  // Apply audio stream to audio element when available
  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
    }
  }, [audioStream]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreamingActive, streamingContent]);
  
  // Handle sending messages
  const handleSendMessage = () => {
    if (inputText.trim() && !isLoading) {
      sendText(inputText);
      setInputText('');
    }
  };
  
  // Handle voice toggle
  const handleToggleVoice = () => {
    if (voiceState === 'connected') {
      stopVoice();
    } else {
      startVoice();
    }
  };
  
  // Custom function to format message content
  const formatMessageContent = (message: Message) => {
    if (message.role === 'user') {
      return message.content;
    } else if (message.c1Content) {
      // In a real implementation, you would parse and render C1Components
      // This is a simplified example that just indicates C1 content presence
      return (
        <div className="c1-content-placeholder">
          <p>C1 Component content would render here</p>
          <pre>{message.c1Content.substring(0, 100)}...</pre>
        </div>
      );
    } else {
      return message.content;
    }
  };
  
  return (
    <div className="custom-chat-container">
      {/* Custom header */}
      <header className="custom-chat-header">
        <h2>Custom Chat Interface</h2>
        <div className="connection-status">
          <span className={`status-indicator ${connectionState}`}></span>
          {connectionState}
        </div>
      </header>
      
      {/* Messages area */}
      <div className="custom-messages-area">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`custom-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {formatMessageContent(message)}
              {message.hasVoiceOver && (
                <span className="voice-indicator">🔈</span>
              )}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {/* Streaming message (if active) */}
        {isStreamingActive && streamingMessageId && streamingContent && (
          <div className="custom-message assistant-message streaming">
            <div className="message-content">
              <div className="c1-content-placeholder">
                <p>Streaming content...</p>
                <pre>{streamingContent.substring(0, 100)}...</pre>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicators */}
        {(isLoading || isVoiceLoading || isEnhancing) && (
          <div className="loading-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>
              {isEnhancing ? 'Enhancing...' : 
               isVoiceLoading ? 'Processing voice...' : 
               'Thinking...'}
            </span>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Custom input area */}
      <div className="custom-input-area">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          disabled={isLoading || connectionState !== 'connected'}
        />
        
        <div className="custom-controls">
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading || connectionState !== 'connected'}
            className="send-button"
          >
            Send
          </button>
          
          <button 
            onClick={handleToggleVoice}
            disabled={connectionState !== 'connected'}
            className={`voice-button ${voiceState === 'connected' ? 'active' : ''}`}
          >
            {voiceState === 'connected' ? 'Stop Voice' : 'Start Voice'}
          </button>
        </div>
      </div>
      
      {/* Hidden audio element for voice playback */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Custom CSS for the example */}
      <style>{`
        .custom-chat-container {
          display: flex;
          flex-direction: column;
          height: 600px;
          width: 400px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .custom-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .custom-chat-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        
        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }
        
        .status-indicator.connected { background-color: #22c55e; }
        .status-indicator.connecting { background-color: #f59e0b; }
        .status-indicator.disconnected { background-color: #94a3b8; }
        .status-indicator.error { background-color: #ef4444; }
        
        .custom-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background-color: #ffffff;
        }
        
        .custom-message {
          max-width: 80%;
          padding: 12px;
          border-radius: 8px;
          position: relative;
        }
        
        .user-message {
          align-self: flex-end;
          background-color: #3b82f6;
          color: white;
        }
        
        .assistant-message {
          align-self: flex-start;
          background-color: #f1f5f9;
          color: #0f172a;
        }
        
        .message-content {
          word-break: break-word;
        }
        
        .message-timestamp {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }
        
        .voice-indicator {
          position: absolute;
          top: -8px;
          left: -8px;
          background-color: #3b82f6;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        
        .streaming {
          opacity: 0.8;
          animation: pulse 1.5s infinite ease-in-out;
        }
        
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        .loading-indicator {
          align-self: center;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
        }
        
        .typing-dots {
          display: flex;
          gap: 4px;
        }
        
        .typing-dots span {
          width: 8px;
          height: 8px;
          background-color: #64748b;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        .c1-content-placeholder {
          background-color: rgba(0,0,0,0.05);
          padding: 8px;
          border-radius: 4px;
          margin-top: 4px;
          font-size: 12px;
        }
        
        .custom-input-area {
          padding: 16px;
          border-top: 1px solid #e2e8f0;
          background-color: #ffffff;
        }
        
        .custom-input-area textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          resize: none;
          height: 80px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
        }
        
        .custom-input-area textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        .custom-controls {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
        }
        
        .custom-controls button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .send-button {
          background-color: #3b82f6;
          color: white;
          border: none;
        }
        
        .send-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .voice-button {
          background-color: white;
          color: #0f172a;
          border: 1px solid #e2e8f0;
        }
        
        .voice-button:hover:not(:disabled) {
          background-color: #f8fafc;
        }
        
        .voice-button.active {
          background-color: #ef4444;
          color: white;
          border: none;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default HeadlessCustomExample;
