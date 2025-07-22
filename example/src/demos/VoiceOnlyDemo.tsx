import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';
import type { VoiceBotUIProps } from '../../../packages/geui-sdk/src/types';

/**
 * Enhanced Voice-Only Interface
 * Shows a pure voice interaction without any chat UI
 */
const VoiceOnlyInterface: React.FC<VoiceBotUIProps> = ({
  isVoiceConnected,
  isVoiceLoading,
  onToggleVoice,
  agentName = "Voice Assistant"
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      position: 'relative'
    }}>
      {/* Voice Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '40px',
        padding: '12px 24px',
        borderRadius: '25px',
        backgroundColor: isVoiceConnected ? 'rgba(34, 197, 94, 0.2)' : 
                        isVoiceLoading ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        border: `2px solid ${isVoiceConnected ? '#22c55e' : 
                              isVoiceLoading ? '#fbbf24' : '#ef4444'}`,
        color: isVoiceConnected ? '#22c55e' : isVoiceLoading ? '#fbbf24' : '#ef4444',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        {isVoiceConnected ? '🎤 Listening' : 
         isVoiceLoading ? '⏳ Connecting' : '🔇 Disconnected'}
      </div>

      {/* Main Voice Interface */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        maxWidth: '600px'
      }}>
        {/* Large Voice Button */}
        <div
          onClick={onToggleVoice}
          style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: isVoiceConnected ? '#22c55e' : 
                            isVoiceLoading ? '#fbbf24' : '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            transform: isVoiceConnected ? 'scale(1.1)' : 'scale(1)',
            border: '4px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <div style={{
            fontSize: '80px',
            animation: isVoiceConnected ? 'pulse 2s infinite' : 'none'
          }}>
            {isVoiceLoading ? '⏳' : isVoiceConnected ? '🎤' : '🎙️'}
          </div>
        </div>

        {/* Agent Info */}
        <div>
          <h1 style={{
            fontSize: '48px',
            margin: '0 0 16px 0',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {agentName}
          </h1>
          
          <p style={{
            fontSize: '24px',
            margin: '0 0 32px 0',
            opacity: 0.9,
            lineHeight: '1.4'
          }}>
            {isVoiceConnected ? 'I\'m listening... speak naturally!' : 
             isVoiceLoading ? 'Connecting to voice assistant...' : 
             'Click the microphone to start talking'}
          </p>
        </div>

        {/* Voice Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          width: '100%'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗣️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Natural Speech</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Speak naturally and get instant responses
            </p>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Real-time</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Instant voice processing and responses
            </p>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Voice-Only</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
              Pure voice interaction, no distractions
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '500px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>How to use:</h4>
          <ol style={{ 
            textAlign: 'left', 
            paddingLeft: '20px', 
            fontSize: '16px',
            lineHeight: '1.6',
            margin: 0
          }}>
            <li>Click the large microphone button</li>
            <li>Speak your question or request</li>
            <li>Listen to the AI's voice response</li>
            <li>Continue the conversation naturally</li>
          </ol>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

/**
 * Demo: Voice-Only Interface
 * 
 * This demonstrates a pure voice-only experience using the new
 * fullscreen component overrides. No chat interface, just voice.
 */
const VoiceOnlyDemo: React.FC = () => {
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
          agentName: "VoiceBot Pro",
          agentSubtitle: "Your voice-only AI assistant",
          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          primaryColor: "#667eea",
          accentColor: "#764ba2",
          startCallButtonText: "🎤 Start Voice Chat",
          endCallButtonText: "🔇 End Voice Chat",
          connectingText: "Connecting to voice assistant...",
          
          // Custom component overrides - voice-only experience
          fullscreenComponents: {
            VoiceBotUI: VoiceOnlyInterface,
            // ThreadList: undefined, // Will use default (can be hidden with layout)
            // ChatWindow: undefined, // Will use default (can be hidden with layout)
          },
          
          // Layout configuration - hide everything except voice
          fullscreenLayout: {
            showThreadList: false,   // Hide thread list
            showVoiceBot: true,      // Show only voice interface
            showChatWindow: false,   // Hide chat window
            columnWidths: "1fr"      // Single column layout
          }
        }}
      />
    </div>
  );
};

export default VoiceOnlyDemo;