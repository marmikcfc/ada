import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';

/**
 * Demo: Voice-First Mode
 * 
 * This demonstrates the new voiceFirstMode prop that shows the 
 * VoiceBotFullscreenLayout directly without any floating widgets or modals.
 * Perfect for voice-first applications and immersive experiences.
 */
const VoiceFirstModeDemo: React.FC = () => {
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
        voiceFirstMode={true}  // This is the key prop!
        options={{
          agentName: "Ada Voice Assistant",
          agentSubtitle: "Speak naturally, I'm here to help",
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
  );
};

export default VoiceFirstModeDemo;