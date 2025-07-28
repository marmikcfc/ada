import React from 'react';
import { ConfigurableGeUIClient } from '../ConfigurableGeUIClient';

/**
 * Demo: Voice-First Mode
 * 
 * This demonstrates immersive voice-first experience using the per-connection 
 * architecture with bubbleEnabled={false} for direct fullscreen mode.
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
      <ConfigurableGeUIClient
        clientId="voice-first-assistant"
        connectionConfig={{
          client_id: "voice-first-assistant",
          mcp_config: {
            model: "gpt-4o-mini",
            api_key_env: "OPENAI_API_KEY",
            servers: []
          },
          visualization_provider: {
            provider_type: "thesys",
            model: "c1-nightly",
            api_key_env: "THESYS_API_KEY"
          },
          preferences: {
            ui_framework: "c1", // Framework-aware: Rich C1 components for voice interactions
            theme: "default"
          }
        }}
        bubbleEnabled={false}  // Direct fullscreen experience (replaces voiceFirstMode)
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