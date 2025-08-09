import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GeUIProps, ChatButtonProps, Thread } from '../types';
import { useGeUIClient } from '../hooks/useGeUIClient';
import { ThreadProvider } from '../contexts/ThreadContext';
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
 *  2. Existing custom GeUI overrides (must come after to ensure
 *     custom rules can override the base styles if needed)
 * ------------------------------------------------------------------ */
//import "@crayonai/react-ui/styles/index.css";
//import "./thesys-css.css";

/**
 * Main GeUI component - the entry point for the SDK
 * 
 * Renders different interfaces based on configuration:
 * - bubbleEnabled=true: Floating chat widget with optional fullscreen modal
 * - bubbleEnabled=false: Immersive fullscreen voice experience (VoiceBotFullscreenLayout)
 * - voiceFirstMode=true: Force immersive voice experience regardless of bubbleEnabled
 * - disableVoice=true + bubbleEnabled=false: Falls back to fullscreen chat interface
 * 
 * Manages overall state using the useGeUIClient hook and supports complete component overrides.
 */
const GeUI: React.FC<GeUIProps> = ({
  webrtcURL,
  websocketURL,
  bubbleEnabled = true,
  allowFullScreen = false,
  disableVoice = false,
  enableThreadManagement = false,
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
      uiFramework: options.uiFramework,
      onFormSubmit: options.onFormSubmit,
      onButtonClick: options.onButtonClick,
      onInputChange: options.onInputChange,
      onLinkClick: options.onLinkClick,
      onWebSocketConnect: options.onWebSocketConnect,
      // Enable threads if thread management is requested
      enableThreads: enableThreadManagement,
      threadOptions: enableThreadManagement ? {
        enablePersistence: options.threadManager?.enablePersistence ?? true,
        storageKey: options.threadManager?.storageKey,
        maxThreads: options.threadManager?.maxThreads,
        autoGenerateTitles: options.threadManager?.autoGenerateTitles,
        generateTitle: options.threadManager?.generateTitle,
      } : undefined,
    }),
    [webrtcURL, websocketURL, options.mcpEndpoints, options.uiFramework, options.onFormSubmit, options.onButtonClick, options.onInputChange, options.onLinkClick, options.onWebSocketConnect, disableVoice, enableThreadManagement, options.threadManager]
  );

  // Use enhanced client with optional thread management
  const client = useGeUIClient(clientOptions);
  
  // Type assertion to help TypeScript understand the client type based on enableThreadManagement
  const typedClient = client as typeof enableThreadManagement extends true 
    ? import('../hooks/useGeUIClient').ThreadedGeUIClient 
    : import('../hooks/useGeUIClient').BaseGeUIClient;
  
  // Apply audio stream to audio element when available
  useEffect(() => {
    if (audioRef.current && typedClient.audioStream && !disableVoice) {
      audioRef.current.srcObject = typedClient.audioStream;
    }
  }, [typedClient.audioStream, disableVoice]);
  
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
    
    if (typedClient.voiceState === 'connected') {
      typedClient.stopVoice();
    } else if (typedClient.voiceState === 'disconnected') {
      typedClient.startVoice();
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
    agentName: options.agentName || "Ada",
    isLoading: client.isLoading,
    isEnhancing: client.isEnhancing,
    showVoiceButton: !disableVoice,
    onVoiceToggle: disableVoice ? undefined : handleToggleVoice,
    isVoiceActive: disableVoice ? false : client.voiceState === 'connected',
    streamingContent: client.streamingContent,
    streamingContentType: client.streamingContentType,
    streamingMessageId: client.streamingMessageId,
    isStreamingActive: client.isStreamingActive,
    showMinimizeButton: bubbleEnabled, // Only show minimize button in floating mode
    onMinimizeChange: (isMinimized: boolean) => {
      if (isMinimized && bubbleEnabled) {
        handleChatClose();
      }
    },
    onC1Action: (action: any) => {
      // Handle C1 actions - can add custom logic here if needed
      console.log('C1Action from chat window:', action);
    },
    sendC1Action: typedClient.sendC1Action,
    theme,
    crayonTheme: options.crayonTheme,
  };
  
  // Prepare thread context value if thread management is enabled
  // When enableThreads is true, the client will have thread methods
  const hasThreadSupport = enableThreadManagement;
  const threadedClient = typedClient as any; // Type cast for thread properties
  const threadContextValue = hasThreadSupport ? {
    // Thread state
    threads: threadedClient.threads || [],
    activeThreadId: threadedClient.activeThreadId || null,
    currentThread: threadedClient.activeThread || null,
    isCreatingThread: false, // ThreadInterface doesn't have this specific state
    isLoadingThreads: threadedClient.isLoadingThreads || false,
    isSwitchingThread: threadedClient.isSwitchingThread || false,
    threadError: null, // ThreadInterface doesn't expose errors directly
    
    // Client state
    messages: typedClient.messages,
    connectionState: typedClient.connectionState,
    voiceState: typedClient.voiceState,
    isLoading: typedClient.isLoading,
    isEnhancing: typedClient.isEnhancing,
    streamingContent: typedClient.streamingContent,
    streamingContentType: typedClient.streamingContentType,
    streamingMessageId: typedClient.streamingMessageId,
    isStreamingActive: typedClient.isStreamingActive,
    
    // Thread actions
    createThread: async (initialMessage?: string) => {
      const thread = await threadedClient.createThread(initialMessage);
      return thread.id;
    },
    switchThread: threadedClient.switchThread || (() => {}),
    deleteThread: threadedClient.deleteThread || (() => {}),
    renameThread: threadedClient.renameThread || (() => {}),
    clearAllThreads: threadedClient.clearAllThreads || (() => {}),
    refreshThreads: () => {}, // ThreadInterface doesn't have refresh
    
    // Client actions
    sendText: typedClient.sendText,
    sendC1Action: typedClient.sendC1Action,
    startVoice: async () => {
      typedClient.startVoice();
    },
    stopVoice: typedClient.stopVoice,
    clearMessages: typedClient.clearMessages,
    
    // Utility methods
    getThread: (id: string) => (threadedClient.threads || []).find((t: Thread) => t.id === id),
    isReadyForVoice: typedClient.isReadyForVoice,
  } : null;

  const content = (
    <>
      {/* Hidden audio element for voice output - only render if voice is enabled */}
      {!disableVoice && <audio ref={audioRef} autoPlay style={{ display: 'none' }} />}
      
      {/* bubbleEnabled=false - shows ChatWindow in fullscreen directly */}
      {!bubbleEnabled ? (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}>
          <ChatWindowComponent 
            {...(chatWindowProps as any)}
            showMinimizeButton={false}
            style={{
              height: '100%',
              border: 'none',
              borderRadius: '0',
              boxShadow: 'none'
            }}
          />
        </div>
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
      
      {/* Chat window - shown when chat is open (bubble mode only) */}
      {(isChatOpen && bubbleEnabled) && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '400px',
          height: '600px',
          zIndex: 10000,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
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
            isVoiceConnected={typedClient.voiceState === 'connected'}
            isVoiceLoading={typedClient.voiceState === 'connecting'}
            onToggleVoice={handleToggleVoice}
            onSendMessage={typedClient.sendText}
            messages={typedClient.messages}
            onC1Action={(action: any) => {
              // Handle C1 actions - for now just send the human-friendly message
              if (action.humanFriendlyMessage) {
                typedClient.sendText(action.humanFriendlyMessage);
              }
            }}
            sendC1Action={typedClient.sendC1Action}
            isLoading={typedClient.isLoading}
            isEnhancing={typedClient.isEnhancing}
            streamingContent={typedClient.streamingContent}
            streamingMessageId={typedClient.streamingMessageId}
            isStreamingActive={typedClient.isStreamingActive}
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
            crayonTheme={options.crayonTheme}
          />
        </FullscreenModal>
      )}
        </>
      )}
    </>
  );

  // Wrap with ThreadProvider if thread management is enabled
  if (hasThreadSupport && threadContextValue) {
    return (
      <ThreadProvider value={threadContextValue}>
        {content}
      </ThreadProvider>
    );
  }

  return content;
};

export default GeUI;
