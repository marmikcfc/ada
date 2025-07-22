import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';
import type { ThreadListProps, VoiceBotUIProps, ChatWindowProps } from '../../../packages/geui-sdk/src/types';
import { C1Component } from '@thesysai/genui-sdk';
import { ThemeProvider } from '@crayonai/react-ui';

/**
 * Custom ThreadList Component
 * Shows how to completely override the thread list with custom branding
 */
const CustomThreadList: React.FC<ThreadListProps> = ({ 
  threads, 
  activeThreadId, 
  onSelectThread, 
  onCreateThread 
}) => (
  <div style={{
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    height: '100%',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <div style={{ 
      color: '#ff6b6b', 
      fontSize: '18px', 
      fontWeight: 'bold', 
      marginBottom: '20px',
      textAlign: 'center'
    }}>
      🔥 My Custom Threads
    </div>
    
    <button
      onClick={onCreateThread}
      style={{
        width: '100%',
        padding: '12px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        marginBottom: '16px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}
    >
      ➕ New Conversation
    </button>
    
    {threads.map(thread => (
      <div
        key={thread.id}
        onClick={() => onSelectThread(thread.id)}
        style={{
          padding: '12px',
          backgroundColor: thread.id === activeThreadId ? '#ff6b6b' : 'rgba(255, 255, 255, 0.1)',
          color: thread.id === activeThreadId ? 'white' : '#ccc',
          borderRadius: '8px',
          marginBottom: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        {thread.title}
      </div>
    ))}
  </div>
);

/**
 * Custom VoiceBot Component
 * Shows how to create a completely custom voice interface
 */
const CustomVoiceBot: React.FC<VoiceBotUIProps> = ({
  isVoiceConnected,
  isVoiceLoading,
  onToggleVoice,
  agentName = "Custom AI"
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    textAlign: 'center',
    padding: '40px'
  }}>
    {/* Custom animated logo */}
    <div style={{
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      backgroundColor: isVoiceConnected ? '#4ade80' : isVoiceLoading ? '#fbbf24' : '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      marginBottom: '30px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isVoiceConnected ? 'scale(1.1)' : 'scale(1)'
    }}
    onClick={onToggleVoice}
    >
      {isVoiceLoading ? '⏳' : isVoiceConnected ? '🎤' : '🤖'}
    </div>
    
    <h1 style={{ 
      fontSize: '36px', 
      margin: '0 0 16px 0',
      textShadow: '0 2px 4px rgba(0,0,0,0.3)'
    }}>
      {agentName}
    </h1>
    
    <p style={{ 
      fontSize: '18px', 
      opacity: 0.9,
      margin: '0 0 30px 0'
    }}>
      {isVoiceConnected ? '🟢 Listening...' : 
       isVoiceLoading ? '🟡 Connecting...' : 
       '🔴 Click to start talking'}
    </p>
    
    <div style={{
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }}>
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        fontSize: '14px'
      }}>
        🎯 Custom Voice Interface
      </div>
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        fontSize: '14px'
      }}>
        🎨 Fully Customizable
      </div>
    </div>
  </div>
);

/**
 * Custom Chat Window Component
 * Shows how to create a branded chat interface
 */
const CustomChatWindow: React.FC<ChatWindowProps> = ({
  messages = [],
  onSendMessage,
  onC1Action,
  agentName = "Custom AI"
}) => {
  const [inputValue, setInputValue] = React.useState('');
  
  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1e1e1e',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Custom Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          color: '#ff6b6b', 
          margin: 0, 
          fontSize: '20px' 
        }}>
          💬 Chat with {agentName}
        </h3>
      </div>
      
      {/* Messages Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        color: 'white'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#888',
            marginTop: '50px'
          }}>
            👋 Start a conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            // Debug logging
            console.log('Rendering message:', message);
            
            return (
              <div
                key={message.id || index}
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: message.role === 'user' ? '#ff6b6b' : '#333',
                  marginLeft: message.role === 'user' ? '20%' : '0',
                  marginRight: message.role === 'user' ? '0' : '20%'
                }}
              >
                <strong style={{ opacity: 0.8 }}>
                  {message.role === 'user' ? 'You' : agentName}:
                </strong>
                <div style={{ marginTop: '4px' }}>
                  {/* Handle different message content formats - same logic as default ChatWindow */}
                  {message.role === 'assistant' && message.c1Content ? (
                    <ThemeProvider theme={{}}>
                      <C1Component
                        c1Response={message.c1Content}
                        onAction={onC1Action}
                        isStreaming={false}
                      />
                    </ThemeProvider>
                  ) : (
                    message.content || 'No content available'
                  )}
                </div>
                {/* Show additional debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
                    Type: {message.type || 'unknown'} | Role: {message.role || 'unknown'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Custom Input */}
      <div style={{
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '25px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: 'white',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: '#ff6b6b',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Demo: Custom Fullscreen Components
 * 
 * This demonstrates how to completely customize all three components
 * in the fullscreen layout while maintaining full functionality.
 */
const CustomFullscreenDemo: React.FC = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000
    }}>
      <GeUI
        webrtcURL="/api/offer"
        websocketURL="/ws/messages"
        bubbleEnabled={false}  // Show fullscreen directly
        options={{
          agentName: "CustomBot Pro",
          agentSubtitle: "Your personalized AI assistant",
          backgroundColor: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
          primaryColor: "#ff6b6b",
          accentColor: "#ff8e8e",
          enableThreadManager: true,
          threadManagerTitle: "My Conversations",
          
          // Custom component overrides
          fullscreenComponents: {
            ThreadList: CustomThreadList,
            VoiceBotUI: CustomVoiceBot,
            ChatWindow: CustomChatWindow
          },
          
          // Custom layout configuration
          fullscreenLayout: {
            showThreadList: true,
            showVoiceBot: true,
            showChatWindow: true,
            columnWidths: "280px 1fr 400px"  // Custom column sizing
          }
        }}
      />
    </div>
  );
};

export default CustomFullscreenDemo;