import React from 'react';
import AnimatedBlob from './AnimatedBlob';

interface VoiceBotUIProps {
  // Voice state
  isVoiceConnected?: boolean;
  isVoiceLoading?: boolean;
  onToggleVoice?: () => void;
  
  // Agent branding
  agentName?: string;
  agentSubtitle?: string;
  
  // Button customization
  startCallButtonText?: string;
  endCallButtonText?: string;
  connectingText?: string;
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
}

const VoiceBotUI: React.FC<VoiceBotUIProps> = ({
  isVoiceConnected = false,
  isVoiceLoading = false,
  onToggleVoice,
  agentName = "Ada",
  agentSubtitle = "How can I help you today?",
  startCallButtonText = "Start a call",
  endCallButtonText = "End call",
  connectingText = "Connecting...",
  className = "",
  style = {}
}) => {
  return (
    <div className={`voice-bot-ui ${className}`} style={style}>
      <AnimatedBlob
        isVoiceConnected={isVoiceConnected}
        isVoiceLoading={isVoiceLoading}
        onToggleVoice={onToggleVoice}
        className="fullscreen-blob"
        startCallButtonText={startCallButtonText}
        endCallButtonText={endCallButtonText}
        connectingText={connectingText}
      />
      
      {/* Agent name display */}
      <div className="agent-branding" style={{ marginTop: '48px' }}>
        <h1 className="agent-name">{agentName}</h1>
        <p className="agent-subtitle">{agentSubtitle}</p>
      </div>
    </div>
  );
};

export default VoiceBotUI;