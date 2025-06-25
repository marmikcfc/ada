import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MynaProps } from '../types';
import { useMynaClient } from '../hooks/useMynaClient';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { createTheme } from '../theming/defaultTheme';

/**
 * Main Myna component - the entry point for the SDK
 * 
 * Renders either a floating chat button or a detailed chat interface
 * based on the bubbleEnabled prop, and manages the overall state using
 * the useMynaClient hook.
 */
const Myna: React.FC<MynaProps> = ({
  webrtcURL,
  websocketURL,
  bubbleEnabled = true,
  showThreadManager = false,
  options = {}
}) => {
  // State for chat window visibility
  const [isChatOpen, setIsChatOpen] = useState(!bubbleEnabled);
  
  // Audio element for voice playback
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Initialize client with connection settings
  const clientOptions = useMemo(
    () => ({
      webrtcURL,
      websocketURL,
      mcpEndpoints: options.mcpEndpoints,
      autoConnect: true,
      initialThreadId: undefined,
    }),
    // re-create **only** when these primitive values change
    [webrtcURL, websocketURL, options.mcpEndpoints]
  );

  const client = useMynaClient(clientOptions);
  
  // Apply audio stream to audio element when available
  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);
  
  // Get theme from options or use default
  const theme = options.theme ? createTheme(options.theme) : undefined;
  
  // Handle chat button click
  const handleChatButtonClick = () => {
    setIsChatOpen(true);
  };
  
  // Handle chat window close
  const handleChatClose = () => {
    setIsChatOpen(false);
  };
  
  // Handle voice connection toggle
  const handleToggleVoice = () => {
    if (client.voiceState === 'connected') {
      client.stopVoice();
    } else if (client.voiceState === 'disconnected') {
      client.startVoice();
    }
  };
  
  return (
    <>
      {/* Hidden audio element for voice output */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Chat button - shown only when bubbleEnabled is true and chat is not open */}
      {bubbleEnabled && !isChatOpen && (
        <ChatButton
          onClick={handleChatButtonClick}
          isOpen={isChatOpen}
          theme={theme}
        />
      )}
      
      {/* Chat window - shown when chat is open or bubbleEnabled is false */}
      {(isChatOpen || !bubbleEnabled) && (
        <ChatWindow
          /* Floating mode when bubbleEnabled === true */
          isFloating={bubbleEnabled}
          /* Only provide close handler when operating as floating widget */
          onClose={bubbleEnabled ? handleChatClose : undefined}
          messages={client.messages}
          isLoading={client.isLoading}
          isVoiceLoading={client.isVoiceLoading}
          isEnhancing={client.isEnhancing}
          onSendMessage={client.sendText}
          onToggleVoice={handleToggleVoice}
          isVoiceConnected={client.voiceState === 'connected'}
          streamingContent={client.streamingContent}
          streamingMessageId={client.streamingMessageId}
          isStreamingActive={client.isStreamingActive}
          theme={theme}
          showThreadManager={showThreadManager}
          agentName={options.agentName || "AI Assistant"}
          logoUrl={options.logoUrl}
        />
      )}
    </>
  );
};

export default Myna;
