import React, { useState, useEffect } from 'react';
import { 
  GenuxCore, 
  VideoOutput, 
  MessageList, 
  Composer,
  useGenuxCore,
  AvatarState
} from 'genux-sdk';
import './App.css';

/**
 * Example 6b: Video Avatar Chat
 * 
 * This demonstrates how to add animated video avatars to your chat interface
 * for a more immersive and engaging user experience.
 * 
 * Features:
 * - Animated 3D avatar that responds to voice and text
 * - Lip-sync with speech output
 * - Facial expressions based on message content
 * - Customizable avatar appearance and behavior
 * - Seamless integration with voice and text chat
 */
function App() {
  // State for avatar customization
  const [selectedAvatar, setSelectedAvatar] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [avatarScale, setAvatarScale] = useState(1.0);
  const [avatarBackground, setAvatarBackground] = useState('#1a2b3c');
  
  // Get core functionality from the hook
  const {
    // State
    messages,
    isLoading,
    streamingContent,
    voiceState,
    
    // Actions
    sendText,
    startVoice,
    stopVoice,
    
    // Avatar-specific state
    avatarState,
    setAvatarState,
  } = useGenuxCore({
    webrtcURL: '/api/webrtc',
    websocketURL: '/api/ws',
    enableVideo: true, // Enable video avatar capabilities
    avatarOptions: {
      model: selectedAvatar,
      enableLipSync: true,
      enableExpressions: true,
      idleAnimations: true,
    }
  });
  
  // Avatar models available for selection
  const avatarModels = [
    { id: 'default', name: 'Default Assistant' },
    { id: 'professional', name: 'Business Professional' },
    { id: 'friendly', name: 'Friendly Guide' },
    { id: 'robot', name: 'Robot Helper' },
    { id: 'custom', name: 'Custom (URL)' }
  ];
  
  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (voiceState === 'connected') {
      stopVoice();
      // Set avatar to idle state when voice stops
      setAvatarState('idle');
    } else {
      startVoice();
      // Set avatar to listening state when voice starts
      setAvatarState('listening');
    }
  };
  
  // Update avatar state based on conversation activity
  useEffect(() => {
    if (isLoading) {
      setAvatarState('thinking');
    } else if (streamingContent) {
      setAvatarState('speaking');
    } else if (voiceState === 'connected') {
      setAvatarState('listening');
    } else {
      setAvatarState('idle');
    }
  }, [isLoading, streamingContent, voiceState, setAvatarState]);
  
  // Get avatar URL based on selection
  const getAvatarUrl = () => {
    switch (selectedAvatar) {
      case 'professional':
        return '/avatars/professional.glb';
      case 'friendly':
        return '/avatars/friendly.glb';
      case 'robot':
        return '/avatars/robot.glb';
      case 'custom':
        return document.getElementById('custom-avatar-url')?.value || '/avatars/default.glb';
      default:
        return '/avatars/default.glb';
    }
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Video Avatar Chat</h1>
        <p>
          This example shows how to add animated video avatars to your chat interface
          for a more immersive and engaging user experience.
        </p>
        
        {/* Avatar settings toggle */}
        <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? 'Hide Avatar Settings' : 'Show Avatar Settings'}
        </button>
      </header>
      
      <main className="app-content">
        {/* Avatar settings panel */}
        {showSettings && (
          <div className="avatar-settings">
            <h2>Avatar Settings</h2>
            
            <div className="setting-group">
              <label>Avatar Model:</label>
              <select 
                value={selectedAvatar}
                onChange={(e) => setSelectedAvatar(e.target.value)}
                className="avatar-select"
              >
                {avatarModels.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              
              {selectedAvatar === 'custom' && (
                <input
                  id="custom-avatar-url"
                  type="text"
                  placeholder="Enter URL to .glb file"
                  className="custom-avatar-input"
                />
              )}
            </div>
            
            <div className="setting-group">
              <label>Avatar Size:</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={avatarScale}
                onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
                className="avatar-scale"
              />
              <span>{avatarScale.toFixed(1)}x</span>
            </div>
            
            <div className="setting-group">
              <label>Background Color:</label>
              <input
                type="color"
                value={avatarBackground}
                onChange={(e) => setAvatarBackground(e.target.value)}
                className="avatar-background"
              />
            </div>
            
            <div className="setting-group">
              <label>Current State:</label>
              <div className="avatar-state-display">
                {avatarState === 'idle' && <span className="state idle">Idle</span>}
                {avatarState === 'listening' && <span className="state listening">Listening</span>}
                {avatarState === 'thinking' && <span className="state thinking">Thinking</span>}
                {avatarState === 'speaking' && <span className="state speaking">Speaking</span>}
              </div>
            </div>
          </div>
        )}
        
        <div className="chat-with-avatar">
          {/* Video avatar display */}
          <div 
            className="avatar-container"
            style={{ 
              backgroundColor: avatarBackground,
              transform: `scale(${avatarScale})`
            }}
          >
            <VideoOutput
              avatarUrl={getAvatarUrl()}
              state={avatarState}
              audioStream={voiceState === 'connected' ? undefined : undefined} // Will be populated with actual audio stream
              expressionsEnabled={true}
              lipSyncEnabled={true}
              idleAnimationsEnabled={true}
              className="video-avatar"
            />
          </div>
          
          {/* Chat interface */}
          <div className="chat-interface">
            <div className="messages-container">
              <MessageList 
                messages={messages}
                isLoading={isLoading}
                streamingContent={streamingContent}
                className="message-list"
              />
            </div>
            
            <div className="composer-container">
              <Composer
                onSendText={sendText}
                onToggleVoice={handleVoiceToggle}
                isVoiceActive={voiceState === 'connected'}
                isLoading={isLoading}
                className="composer"
                placeholder="Type or speak to the avatar..."
              />
            </div>
          </div>
        </div>
        
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { 
  GenuxCore, 
  VideoOutput, 
  MessageList, 
  Composer 
} from 'genux-sdk';

// 1. Enable video capabilities in GenuxCore
const {
  messages,
  isLoading,
  avatarState,
  sendText,
  startVoice,
  stopVoice,
  voiceState
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
  enableVideo: true,
  avatarOptions: {
    model: 'default',
    enableLipSync: true,
    enableExpressions: true,
    idleAnimations: true,
  }
});

// 2. Add VideoOutput component to your UI
return (
  <div className="my-chat-layout">
    {/* Avatar display */}
    <VideoOutput
      avatarUrl="/path/to/avatar.glb"
      state={avatarState}
      expressionsEnabled={true}
      lipSyncEnabled={true}
    />
    
    {/* Chat interface */}
    <MessageList 
      messages={messages}
      isLoading={isLoading}
    />
    
    <Composer
      onSendText={sendText}
      onToggleVoice={() => 
        voiceState === 'connected' ? stopVoice() : startVoice()
      }
      isVoiceActive={voiceState === 'connected'}
    />
  </div>
);`}
          </pre>
        </div>
        
        <div className="info-card">
          <h2>Avatar States & Customization</h2>
          <table className="avatar-states-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Description</th>
                <th>When Used</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>idle</code></td>
                <td>Subtle idle animations</td>
                <td>Default state, waiting for user input</td>
              </tr>
              <tr>
                <td><code>listening</code></td>
                <td>Attentive posture, active listening</td>
                <td>When voice input is active</td>
              </tr>
              <tr>
                <td><code>thinking</code></td>
                <td>Thoughtful expression</td>
                <td>During AI processing</td>
              </tr>
              <tr>
                <td><code>speaking</code></td>
                <td>Animated speech with lip-sync</td>
                <td>When delivering responses</td>
              </tr>
            </tbody>
          </table>
          
          <h3>Customization Options</h3>
          <ul className="customization-list">
            <li><strong>Avatar Model:</strong> Use any glTF/GLB 3D model with facial blendshapes</li>
            <li><strong>Expressions:</strong> Joy, surprise, confusion, concentration</li>
            <li><strong>Voice Sync:</strong> Automatic lip synchronization with speech</li>
            <li><strong>Positioning:</strong> Flexible layout options (side-by-side, picture-in-picture)</li>
            <li><strong>Background:</strong> Transparent, solid color, or scene</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
