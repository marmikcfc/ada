import React, { useState } from 'react';
import { VoiceBotUI } from '../../../packages/genux-sdk/src/components/core';
import VoiceBotFullscreenLayout from '../../../packages/genux-sdk/src/components/composite/VoiceBotFullscreenLayout';
import { useGenuxClient } from '../../../packages/genux-sdk/src/hooks/useGenuxClient';

/**
 * Demo: Standalone VoiceBot UI Component
 * 
 * This demonstrates the new modular VoiceBotUI component in isolation,
 * showing how it can be used independently without the full Genux wrapper.
 * Perfect for custom voice-only interfaces and specialized use cases.
 */
const StandaloneVoiceBotDemo: React.FC = () => {
  const [showSimpleUI, setShowSimpleUI] = useState(true);
  
  // Initialize real GenUX client with backend connections
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/messages',
    autoConnect: true
  });

  const handleVoiceToggle = () => {
    if (client.voiceState === 'connected') {
      client.stopVoice();
    } else {
      client.startVoice();
    }
  };

  const handleC1Action = (action: any) => {
    if (action.humanFriendlyMessage) {
      client.sendText(action.humanFriendlyMessage);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#0f0f23',
      minHeight: '100vh',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Standalone VoiceBot UI
        </h1>
        <p style={{
          fontSize: '20px',
          opacity: 0.8,
          margin: '0 0 32px 0',
          lineHeight: '1.6'
        }}>
          Experience the new modular VoiceBotUI component in isolation.
          Perfect for voice-only interfaces and custom implementations.
        </p>
        
        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginTop: '32px'
        }}>
          <div style={{
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#667eea' }}>Modular Design</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
              Standalone component that can be used independently
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(118, 75, 162, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#764ba2' }}>Customizable</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
              Full control over appearance and behavior
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#8b5cf6' }}>Lightweight</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
              Minimal footprint, maximum performance
            </p>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '24px',
        backgroundColor: client.voiceState === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 
                        client.voiceState === 'connecting' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        border: `1px solid ${client.voiceState === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 
                              client.voiceState === 'connecting' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        color: client.voiceState === 'connected' ? '#22c55e' : client.voiceState === 'connecting' ? '#fbbf24' : '#ef4444',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        {client.voiceState === 'connected' ? '🟢 Voice Connected' : 
         client.voiceState === 'connecting' ? '🟡 Connecting...' : '🔴 Voice Disconnected'}
      </div>

      {/* Toggle UI Mode */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        display: 'flex',
        gap: '12px'
      }}>
        <button
          onClick={() => setShowSimpleUI(true)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            backgroundColor: showSimpleUI ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
            color: showSimpleUI ? '#667eea' : 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Simple UI
        </button>
        <button
          onClick={() => setShowSimpleUI(false)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            backgroundColor: !showSimpleUI ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
            color: !showSimpleUI ? '#667eea' : 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Full Layout
        </button>
      </div>

      {/* Main UI - Toggle between Simple VoiceBotUI and Full VoiceBotFullscreenLayout */}
      {showSimpleUI ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '600px',
          margin: '40px 0'
        }}>
          <VoiceBotUI
            isVoiceConnected={client.voiceState === 'connected'}
            isVoiceLoading={client.voiceState === 'connecting'}
            onToggleVoice={handleVoiceToggle}
            agentName="Ada Voice"
            agentSubtitle="Your voice-first AI assistant"
            startCallButtonText="🎤 Start Voice Session"
            endCallButtonText="🔇 End Voice Session"
            connectingText="Establishing voice connection..."
            style={{
              width: '100%',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </div>
      ) : (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 100
        }}>
          <VoiceBotFullscreenLayout
            isVoiceConnected={client.voiceState === 'connected'}
            isVoiceLoading={client.voiceState === 'connecting'}
            onToggleVoice={handleVoiceToggle}
            onSendMessage={client.sendText}
            messages={client.messages}
            onC1Action={handleC1Action}
            isLoading={client.isLoading}
            isEnhancing={client.isEnhancing}
            streamingContent={client.streamingContent}
            streamingMessageId={client.streamingMessageId}
            isStreamingActive={client.isStreamingActive}
            config={{
              agentName: "Ada Voice Assistant",
              agentSubtitle: "Speak naturally, I'm listening",
              logoUrl: "/ada-brain-icon.svg",
              backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              primaryColor: "#667eea",
              accentColor: "#764ba2",
              startCallButtonText: "🎤 Start Voice Chat",
              endCallButtonText: "🔇 End Voice Chat",
              connectingText: "Connecting to voice assistant...",
              enableThreadManager: true,
              threadManagerTitle: "Voice Conversations"
            }}
          />
        </div>
      )}

      {/* Implementation Code */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '32px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '24px' }}>
          Implementation Code
        </h3>
        <pre style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '20px',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#e2e8f0',
          overflow: 'auto',
          lineHeight: '1.6',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
{`import { VoiceBotUI } from '@your-org/genux-sdk';

const MyVoiceApp = () => {
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);

  const handleVoiceToggle = () => {
    // Your voice connection logic here
    if (isVoiceConnected) {
      // Disconnect voice
      setIsVoiceConnected(false);
    } else {
      // Connect voice
      setIsVoiceLoading(true);
      // ... connection logic
      setIsVoiceLoading(false);
      setIsVoiceConnected(true);
    }
  };

  return (
    <VoiceBotUI
      isVoiceConnected={isVoiceConnected}
      isVoiceLoading={isVoiceLoading}
      onToggleVoice={handleVoiceToggle}
      agentName="Your Assistant"
      agentSubtitle="How can I help you today?"
      startCallButtonText="🎤 Start Chat"
      endCallButtonText="🔇 End Chat"
      connectingText="Connecting..."
    />
  );
};`}
        </pre>
      </div>

      {/* Features List */}
      <div style={{
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        width: '100%',
        border: '1px solid rgba(102, 126, 234, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', color: '#667eea', fontSize: '24px' }}>
          🚀 Component Features
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '18px' }}>
              ✨ Clean API
            </h4>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6' }}>
              <li>Simple props interface</li>
              <li>TypeScript support</li>
              <li>Minimal configuration required</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '18px' }}>
              🎨 Customization
            </h4>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6' }}>
              <li>Custom agent branding</li>
              <li>Configurable button text</li>
              <li>Flexible styling options</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '18px' }}>
              ⚡ Performance
            </h4>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6' }}>
              <li>Lightweight bundle</li>
              <li>Smooth 3D animations</li>
              <li>Responsive design</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: '40px',
        fontSize: '14px'
      }}>
        <p>
          Click the animated blob above to toggle voice states and see the component in action!
        </p>
      </div>
    </div>
  );
};

export default StandaloneVoiceBotDemo;