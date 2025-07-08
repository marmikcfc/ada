import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GenuxProps, ChatButtonProps } from '../types';
import { useGenuxClient } from '../hooks/useGenuxClient';
import BubbleWidget from './core/BubbleWidget';
import { MinimizableChatWindow, MinimizableChatWindowProps } from './composite/MinimizableChatWindow';
import ChatButton from './ChatButton';
import FullscreenModal from './FullscreenModal';
import VoiceBotFullscreenLayout from './composite/VoiceBotFullscreenLayout';
import { createTheme } from '../theming/defaultTheme';
/* ------------------------------------------------------------------ *
 *  Style Imports
 *  -----------------------------------------------------------------
 *  1. Official Crayon UI styles (table, typography, layout, etc.)
 *  2. Existing custom Genux overrides (must come after to ensure
 *     custom rules can override the base styles if needed)
 * ------------------------------------------------------------------ */
import "@crayonai/react-ui/styles/index.css";
import "./thesys-css.css";
/**
 * Main Genux component - the entry point for the SDK
 * 
 * Renders different interfaces based on configuration:
 * - bubbleEnabled=true: Floating chat widget with optional fullscreen modal
 * - bubbleEnabled=false: Immersive fullscreen voice experience (VoiceBotFullscreenLayout)
 * - voiceFirstMode=true: Force immersive voice experience regardless of bubbleEnabled
 * - disableVoice=true + bubbleEnabled=false: Falls back to fullscreen chat interface
 * 
 * Manages overall state using the useGenuxClient hook and supports complete component overrides.
 */
const Genux: React.FC<GenuxProps> = ({
  webrtcURL,
  websocketURL,
  bubbleEnabled = true,
  allowFullScreen = false,
  disableVoice = false,
  options = {}
}) => {
  // State for chat window visibility
  const [isChatOpen, setIsChatOpen] = useState(!bubbleEnabled);
  
  // State for fullscreen modal
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  
  // Audio element for voice playback
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Initialize client with connection settings
  const clientOptions = useMemo(
    () => ({
      webrtcURL: disableVoice ? undefined : webrtcURL,
      websocketURL,
      mcpEndpoints: options.mcpEndpoints,
      autoConnect: true,
      initialThreadId: undefined,
    }),
    [webrtcURL, websocketURL, options.mcpEndpoints, disableVoice]
  );

  const client = useGenuxClient(clientOptions);
  
  // Apply audio stream to audio element when available
  useEffect(() => {
    if (audioRef.current && client.audioStream && !disableVoice) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream, disableVoice]);
  
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
    if (disableVoice) return;
    
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

  // Handle fullscreen toggle
  const handleFullscreenOpen = () => {
    setIsFullscreenOpen(true);
  };

  const handleFullscreenClose = () => {
    setIsFullscreenOpen(false);
  };
  
  // Component resolution - use override if provided, otherwise use default
  const ChatButtonComponent = componentOverrides.ChatButton || ChatButton;
  const ChatWindowComponent = componentOverrides.ChatWindow || MinimizableChatWindow;
  
  // Props for the chat button (bubble or regular)
  const chatButtonProps: ChatButtonProps = {
    onClick: handleChatButtonClick,
    isOpen: isChatOpen,
    theme,
  };
  
  // Props for the MinimizableChatWindow
  const chatWindowProps: MinimizableChatWindowProps = {
    messages: client.messages,
    onSendMessage: client.sendText,
    agentName: options.agentName || "AI Assistant",
    isLoading: client.isLoading,
    showVoiceButton: !disableVoice,
    onVoiceToggle: disableVoice ? undefined : handleToggleVoice,
    isVoiceActive: disableVoice ? false : client.voiceState === 'connected',
    streamingContent: client.streamingContent,
    streamingMessageId: client.streamingMessageId,
    isStreamingActive: client.isStreamingActive,
    showMinimizeButton: bubbleEnabled, // Only show minimize button in floating mode
    onMinimizeChange: (isMinimized: boolean) => {
      if (isMinimized && bubbleEnabled) {
        handleChatClose();
      }
    },
    theme,
  };
  
  return (
    <>
      {/* Hidden audio element for voice output - only render if voice is enabled */}
      {!disableVoice && <audio ref={audioRef} autoPlay style={{ display: 'none' }} />}
      
      {/* bubbleEnabled=false - shows VoiceBotFullscreenLayout directly */}
      {!bubbleEnabled && !disableVoice ? (
        <VoiceBotFullscreenLayout
          isVoiceConnected={client.voiceState === 'connected'}
          isVoiceLoading={client.voiceState === 'connecting'}
          onToggleVoice={handleToggleVoice}
          onSendMessage={client.sendText}
          messages={client.messages}
          onC1Action={(action: any) => {
            // Handle C1 actions - for now just send the human-friendly message
            if (action.humanFriendlyMessage) {
              client.sendText(action.humanFriendlyMessage);
            }
          }}
          isLoading={client.isLoading}
          isEnhancing={client.isEnhancing}
          streamingContent={client.streamingContent}
          streamingMessageId={client.streamingMessageId}
          isStreamingActive={client.isStreamingActive}
          config={{
            agentName: options.agentName || "Ada",
            agentSubtitle: options.agentSubtitle || "How can I help you today?",
            logoUrl: options.logoUrl || "/favicon.ico",
            backgroundColor: options.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            primaryColor: options.primaryColor || "#667eea",
            accentColor: options.accentColor || "#5a67d8",
            threadManagerTitle: options.threadManagerTitle || "Conversations",
            enableThreadManager: options.enableThreadManager ?? true,
            startCallButtonText: options.startCallButtonText || "Start a call",
            endCallButtonText: options.endCallButtonText || "End call",
            connectingText: options.connectingText || "Connecting...",
            webrtcURL,
            websocketURL,
          }}
          componentOverrides={options.fullscreenComponents}
          layoutConfig={options.fullscreenLayout}
        />
      ) : (
        <>
          {/* Chat button - shown only when bubbleEnabled is true and chat is not open */}
          {bubbleEnabled && !isChatOpen && (
        // Use either custom ChatButton override or new FloatingWidget
        componentOverrides.ChatButton ? (
          <ChatButtonComponent {...chatButtonProps} />
        ) : (
          <BubbleWidget
            onChatClick={handleChatButtonClick}
            onMicToggle={handleMicToggle}
            isMicActive={client.voiceState === 'connected'}
            onFullScreenClick={allowFullScreen && !disableVoice ? handleFullscreenOpen : undefined}
            allowFullScreen={allowFullScreen && !disableVoice}
            showVoiceButton={!disableVoice}
            theme={theme}
          />
        )
      )}
      
      {/* Chat window - shown when chat is open (bubble mode) OR when voice is disabled but bubbleEnabled=false */}
      {((isChatOpen && bubbleEnabled) || (!bubbleEnabled && disableVoice)) && (
        <div style={{
          position: bubbleEnabled ? 'fixed' : 'relative',
          bottom: bubbleEnabled ? '20px' : 'auto',
          right: bubbleEnabled ? '20px' : 'auto',
          width: bubbleEnabled ? '400px' : '100%',
          height: bubbleEnabled ? '600px' : '100vh',
          zIndex: bubbleEnabled ? 10000 : 'auto',
          boxShadow: bubbleEnabled ? '0 8px 32px rgba(0, 0, 0, 0.2)' : 'none',
          borderRadius: bubbleEnabled ? '12px' : '0',
          overflow: 'hidden',
        }}>
          <ChatWindowComponent {...(chatWindowProps as any)} />
        </div>
      )}
      
      {/* Fullscreen modal with VoiceBotClient-style experience - only render if voice is enabled */}
      {!disableVoice && (
        <FullscreenModal
          isOpen={isFullscreenOpen}
          onClose={handleFullscreenClose}
        >
          <VoiceBotFullscreenLayout
            isVoiceConnected={client.voiceState === 'connected'}
            isVoiceLoading={client.voiceState === 'connecting'}
            onToggleVoice={handleToggleVoice}
            onSendMessage={client.sendText}
            messages={client.messages}
            onC1Action={(action: any) => {
              // Handle C1 actions - for now just send the human-friendly message
              if (action.humanFriendlyMessage) {
                client.sendText(action.humanFriendlyMessage);
              }
            }}
            isLoading={client.isLoading}
            isEnhancing={client.isEnhancing}
            streamingContent={client.streamingContent}
            streamingMessageId={client.streamingMessageId}
            isStreamingActive={client.isStreamingActive}
            config={{
              agentName: options.agentName || "Ada",
              agentSubtitle: options.agentSubtitle || "How can I help you today?",
              logoUrl: options.logoUrl || "/favicon.ico",
              backgroundColor: options.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              primaryColor: options.primaryColor || "#667eea",
              accentColor: options.accentColor || "#5a67d8",
              threadManagerTitle: options.threadManagerTitle || "Conversations",
              enableThreadManager: options.enableThreadManager ?? true,
              startCallButtonText: options.startCallButtonText || "Start a call",
              endCallButtonText: options.endCallButtonText || "End call",
              connectingText: options.connectingText || "Connecting...",
              webrtcURL,
              websocketURL,
            }}
            onClose={handleFullscreenClose}
          />
        </FullscreenModal>
      )}
        </>
      )}
    </>
  );
};

export default Genux;
