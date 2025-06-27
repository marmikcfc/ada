import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MynaProps, ComponentOverrides, ChatButtonProps, ChatWindowProps } from '../types';
import { useMynaClient } from '../hooks/useMynaClient';
import BubbleWidget from './BubbleWidget';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';
import { createTheme } from '../theming/defaultTheme';

/**
 * Main Myna component - the entry point for the SDK
 * 
 * Renders either a floating chat button or a detailed chat interface
 * based on the bubbleEnabled prop, and manages the overall state using
 * the useMynaClient hook. Supports complete component overrides.
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
  
  // Get component overrides from options
  const componentOverrides = options.components || {};
  
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

  // Handle mic toggle from bubble widget
  const handleMicToggle = () => {
    handleToggleVoice();
  };
  
  // Component resolution - use override if provided, otherwise use default
  const ChatButtonComponent = componentOverrides.ChatButton || ChatButton;
  const ChatWindowComponent = componentOverrides.ChatWindow || ChatWindow;
  
  // Props for the chat button (bubble or regular)
  const chatButtonProps: ChatButtonProps = {
    onClick: handleChatButtonClick,
    isOpen: isChatOpen,
    theme,
  };
  
  // Props for the chat window
  const chatWindowProps: ChatWindowProps = {
    /* Floating mode when bubbleEnabled === true */
    isFloating: bubbleEnabled,
    /* Only provide close handler when operating as floating widget */
    onClose: bubbleEnabled ? handleChatClose : undefined,
    messages: client.messages,
    isLoading: client.isLoading,
    isVoiceLoading: client.isVoiceLoading,
    isEnhancing: client.isEnhancing,
    onSendMessage: client.sendText,
    onToggleVoice: handleToggleVoice,
    isVoiceConnected: client.voiceState === 'connected',
    streamingContent: client.streamingContent,
    streamingMessageId: client.streamingMessageId,
    isStreamingActive: client.isStreamingActive,
    theme,
    showThreadManager,
  };
  
  return (
    <>
      {/* Hidden audio element for voice output */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Chat button - shown only when bubbleEnabled is true and chat is not open */}
      {bubbleEnabled && !isChatOpen && (
        // Use either the default BubbleWidget or custom ChatButton override
        componentOverrides.ChatButton ? (
          <ChatButtonComponent {...chatButtonProps} />
        ) : (
          <BubbleWidget
            onChatClick={handleChatButtonClick}
            onMicToggle={handleMicToggle}
            isMicActive={client.voiceState === 'connected'}
            theme={theme}
          />
        )
      )}
      
      {/* Chat window - shown when chat is open or bubbleEnabled is false */}
      {(isChatOpen || !bubbleEnabled) && (
        <ChatWindowComponent
          {...chatWindowProps}
          // Extended props for ChatWindow
          agentName={options.agentName || "AI Assistant"}
          logoUrl={options.logoUrl}
          threadManagerOptions={{
            enablePersistence: options.threadManager?.enablePersistence ?? true,
            storageKey: options.threadManager?.storageKey ?? 'myna-chat-threads',
            maxThreads: options.threadManager?.maxThreads ?? 50,
            autoGenerateTitles: options.threadManager?.autoGenerateTitles ?? true,
            showCreateButton: options.threadManager?.showCreateButton ?? true,
            allowThreadDeletion: options.threadManager?.allowThreadDeletion ?? true,
            initiallyCollapsed: options.threadManager?.initiallyCollapsed ?? false,
          }}
          // Pass component overrides to ChatWindow for sub-components
          componentOverrides={componentOverrides}
        />
      )}
    </>
  );
};

export default Myna;
