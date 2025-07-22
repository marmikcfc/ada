import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';
import { ChatWindow } from '../../../packages/geui-sdk/src/components/composite/ChatWindow';

/**
 * Demo 3: Voice Bot Demo (Partial Support)
 * 
 * This demonstrates voice-focused interaction with the AI assistant.
 * While not purely voice-only (that requires additional SDK features),
 * this shows how to emphasize voice interaction with fullscreen mode
 * and voice-first design.
 */
const VoiceBotDemo: React.FC = () => {
  return (
    <div style={{ 
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        color: 'white',
        marginBottom: '48px',
        maxWidth: '800px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          margin: '0 0 16px 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          Voice Assistant Demo
        </h1>
        <p style={{
          fontSize: '20px',
          opacity: 0.9,
          margin: '0 0 32px 0',
          lineHeight: '1.6'
        }}>
          Experience natural voice conversations with AI. Click the floating widget to start,
          then use the fullscreen button for an immersive voice experience.
        </p>
        
        {/* Voice Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginTop: '32px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '24px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎤</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Natural Speech</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Speak naturally and get instant voice responses
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '24px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Real-time Processing</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Live transcription and instant AI responses
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '24px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌐</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Full-screen Mode</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Immersive 3D voice visualization experience
            </p>
          </div>
        </div>
      </div>

      {/* Implementation Example */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        marginBottom: '32px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '24px' }}>
          Implementation Code
        </h3>
        <pre style={{
          backgroundColor: '#f1f5f9',
          padding: '20px',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#334155',
          overflow: 'auto',
          lineHeight: '1.6'
        }}>
{`// Voice-focused configuration with fullscreen mode
<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  bubbleEnabled={true}
  allowFullScreen={true}  // Enables immersive voice mode
  options={{
    agentName: "Voice Assistant",
    agentSubtitle: "Speak naturally, I'm listening",
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    primaryColor: "#667eea",
    startCallButtonText: "🎤 Start Voice Chat",
    endCallButtonText: "🔇 End Voice Chat",
    connectingText: "Connecting...",
    theme: {
      colors: {
        primary: "#667eea",
        secondary: "#764ba2"
      }
    }
  }}
/>`}
        </pre>
      </div>

      {/* Instructions */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        color: 'white',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: '32px'
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>🚀 Try it now!</h4>
        <ol style={{ textAlign: 'left', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Click the floating chat bubble in the bottom-right</li>
          <li>Click the fullscreen button (⛶) for immersive mode</li>
          <li>Click the microphone to start voice chat</li>
          <li>Speak naturally and listen to AI responses</li>
        </ol>
        <p style={{ 
          margin: '16px 0 0 0', 
          fontSize: '14px', 
          opacity: 0.8,
          fontStyle: 'italic'
        }}>
          Note: This demo shows voice capabilities within the current chat interface.
          Pure voice-only mode is planned for a future SDK release.
        </p>
      </div>

      {/* Current Limitations */}
      <div style={{
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '600px',
        width: '100%',
        color: 'white'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#fbbf24' }}>⚠️ Current Limitations</h4>
        <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li>Chat interface is still visible (voice-only mode coming soon)</li>
          <li>Voice transcription appears in chat (can be hidden in future updates)</li>
          <li>Fullscreen mode provides the best voice-focused experience</li>
        </ul>
      </div>

      {/* The actual Genux widget - now shows fullscreen voice experience directly */}
      <GeUI
        webrtcURL="/api/offer"
        websocketURL="/ws/messages"
        bubbleEnabled={false}  // This now defaults to fullscreen voice experience!
        options={{
          agentName: "Voice Assistant",
          agentSubtitle: "Speak naturally, I'm listening",
          logoUrl: "/ada-brain-icon.svg",
          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          primaryColor: "#667eea",
          accentColor: "#764ba2",
          startCallButtonText: "🎤 Start Voice Chat",
          endCallButtonText: "🔇 End Voice Chat", 
          connectingText: "Connecting to voice assistant...",
          enableThreadManager: true,
          threadManagerTitle: "Voice Conversations",
          
          // Debug: Log messages to console
          components: {
            ChatWindow: (props) => {
              console.log('VoiceBotDemo ChatWindow props:', props);
              console.log('VoiceBotDemo messages:', props.messages);
              return <ChatWindow {...props} />;
            }
          },
          theme: {
            colors: {
              primary: "#667eea",
              secondary: "#764ba2"
            }
          }
        }}
      />
    </div>
  );
};

export default VoiceBotDemo;