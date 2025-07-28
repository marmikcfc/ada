import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';
import { ChatMessageProps } from '../../../packages/geui-sdk/src/components/core/ChatMessage';
import { MessageComposerProps } from '../../../packages/geui-sdk/src/components/core/MessageComposer';

/**
 * Demo 4: Custom Chat UI Design
 * 
 * This demonstrates how to completely customize the chat experience
 * by overriding ChatMessage and MessageComposer components with
 * custom designs that match your brand.
 */

// Custom Chat Message Component with Brand Styling
const CustomChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming, ...props }) => {
  const isUser = message.role === 'user';
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '24px',
      padding: '0 16px'
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        backgroundColor: isUser ? 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)' : 'linear-gradient(135deg, #4ecdc4 0%, #44b3a9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        flexShrink: 0
      }}>
        {isUser ? '👤' : '🤖'}
      </div>
      
      {/* Message Content */}
      <div style={{
        maxWidth: '70%',
        position: 'relative'
      }}>
        {/* Message Author */}
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#64748b',
          marginBottom: '6px',
          marginLeft: isUser ? 'auto' : '0',
          textAlign: isUser ? 'right' : 'left'
        }}>
          {isUser ? 'You' : 'AI Assistant'}
        </div>
        
        {/* Message Bubble */}
        <div style={{
          backgroundColor: isUser ? '#ffffff' : '#f8fafc',
          border: isUser ? '2px solid #ff6b6b' : '2px solid #4ecdc4',
          borderRadius: '18px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          animation: isStreaming ? 'pulse 1.5s infinite' : 'none'
        }}>
          {/* Speech Bubble Tail */}
          <div style={{
            position: 'absolute',
            top: '10px',
            [isUser ? 'right' : 'left']: '-8px',
            width: '0',
            height: '0',
            borderTop: `8px solid ${isUser ? '#ff6b6b' : '#4ecdc4'}`,
            borderBottom: '8px solid transparent',
            [isUser ? 'borderLeft' : 'borderRight']: '8px solid transparent'
          }} />
          
          <div style={{
            color: '#1e293b',
            fontSize: '15px',
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {message.content}
          </div>
          
          {/* Streaming indicator */}
          {isStreaming && (
            <div style={{
              display: 'flex',
              gap: '4px',
              marginTop: '8px',
              justifyContent: isUser ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4ecdc4',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0s'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4ecdc4',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.16s'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4ecdc4',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.32s'
              }} />
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '4px',
          textAlign: isUser ? 'right' : 'left'
        }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// Custom Message Composer with Brand Styling
const CustomMessageComposer: React.FC<MessageComposerProps> = ({ 
  onSendMessage, 
  disabled, 
  loading, 
  placeholder = "Share your thoughts...",
  showVoiceButton,
  onVoiceToggle,
  isVoiceActive,
  ...props 
}) => {
  const [message, setMessage] = React.useState('');
  
  const handleSend = () => {
    if (message.trim() && !disabled && !loading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '0 0 12px 12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        backgroundColor: 'white',
        borderRadius: '24px',
        padding: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Emoji Selector Button */}
        <button style={{
          backgroundColor: 'transparent',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '12px',
          transition: 'background-color 0.2s'
        }}>
          😊
        </button>
        
        {/* Message Input */}
        <div style={{ flex: 1 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: '12px 16px',
              borderRadius: '16px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              minHeight: '24px',
              maxHeight: '120px'
            }}
          />
        </div>
        
        {/* Voice Button */}
        {showVoiceButton && onVoiceToggle && (
          <button
            onClick={onVoiceToggle}
            disabled={disabled || loading}
            style={{
              backgroundColor: isVoiceActive ? '#ef4444' : '#10b981',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isVoiceActive ? '🔇' : '🎤'}
          </button>
        )}
        
        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || loading}
          style={{
            backgroundColor: message.trim() && !disabled && !loading ? '#4ecdc4' : '#e2e8f0',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: message.trim() && !disabled && !loading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            transition: 'all 0.2s',
            boxShadow: message.trim() && !disabled && !loading ? '0 2px 8px rgba(78, 205, 196, 0.4)' : 'none'
          }}
        >
          {loading ? '⏳' : '🚀'}
        </button>
      </div>
    </div>
  );
};

const CustomUIDemo: React.FC = () => {
  return (
    <div style={{ 
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Custom UI Design Demo
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#64748b',
            margin: '0 0 32px 0',
            lineHeight: '1.6'
          }}>
            Complete customization of chat components with your brand identity
          </p>
        </div>

        {/* Two Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          alignItems: 'start'
        }}>
          {/* Left Column - Implementation Details */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '24px' }}>
                🎨 Custom Components
              </h3>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#4ecdc4', fontSize: '16px', margin: '0 0 8px 0' }}>
                  ChatMessage Override
                </h4>
                <ul style={{ color: '#64748b', fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Custom avatar design with gradients</li>
                  <li>Speech bubble tails and shadows</li>
                  <li>Animated typing indicators</li>
                  <li>Timestamp and author labels</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#ff6b6b', fontSize: '16px', margin: '0 0 8px 0' }}>
                  MessageComposer Override
                </h4>
                <ul style={{ color: '#64748b', fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Gradient background with rounded design</li>
                  <li>Emoji selector and custom send button</li>
                  <li>Enhanced voice button styling</li>
                  <li>Smooth animations and transitions</li>
                </ul>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '20px' }}>
                Implementation Code
              </h3>
              <pre style={{
                backgroundColor: '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#334155',
                overflow: 'auto',
                lineHeight: '1.5'
              }}>
{`// Custom component overrides
<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/per-connection-messages"
  bubbleEnabled={false}
  options={{
    components: {
      ChatMessage: CustomChatMessage,
      ChatComposer: CustomMessageComposer
    },
    theme: {
      colors: {
        primary: "#4ecdc4",
        secondary: "#ff6b6b"
      }
    }
  }}
/>`}
              </pre>
            </div>
          </div>

          {/* Right Column - Live Demo */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              height: '600px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44b3a9 100%)',
                color: 'white',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                  🚀 Live Custom UI Demo
                </h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                  Experience the fully customized chat interface
                </p>
              </div>
              
              <div style={{ height: 'calc(100% - 88px)' }}>
                <GeUI
                  webrtcURL="/api/offer"
                  websocketURL="/ws/per-connection-messages"
                  bubbleEnabled={false}
                  options={{
                    components: {
                      ChatMessage: CustomChatMessage,
                      ChatComposer: CustomMessageComposer
                    },
                    agentName: "Custom UI Assistant",
                    theme: {
                      colors: {
                        primary: "#4ecdc4",
                        secondary: "#ff6b6b",
                        background: "#ffffff",
                        surface: "#f8fafc",
                        text: "#1e293b",
                        textSecondary: "#64748b",
                        border: "#e2e8f0"
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '48px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Brand Consistency</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Match your brand colors, fonts, and design language perfectly
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Full Control</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Override any component while keeping all functionality intact
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔧</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Easy Integration</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Simple component override system with TypeScript support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomUIDemo;