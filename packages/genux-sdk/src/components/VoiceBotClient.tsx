import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  useThreadManager, 
  useThreadListManager,
} from '@thesysai/genui-sdk';
import VoiceBotFullscreenLayout from './VoiceBotFullscreenLayout';
import '@crayonai/react-ui/styles/index.css';

export interface VoiceBotClientConfig {
  agentName?: string;
  agentSubtitle?: string;
  logoUrl?: string;
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  threadManagerTitle?: string;
  enableThreadManager?: boolean;
  startCallButtonText?: string;
  endCallButtonText?: string;
  connectingText?: string;
  webrtcURL?: string;
  websocketURL?: string;
}

interface VoiceBotClientProps {
  config?: VoiceBotClientConfig;
  onClose?: () => void;
}

const VoiceBotClient: React.FC<VoiceBotClientProps> = ({ config = {}, onClose }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const threadManagerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Use refs for immediate accumulation of streaming content
  const streamingContentRef = useRef<string>('');
  const streamingMessageIdRef = useRef<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);
  const [streamTick, setStreamTick] = useState<number>(0);
  
  const wsConnectionIdRef = useRef<string>(`ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [wsConnectionState, setWsConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Voice/WebRTC state
  const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  // Pause state and local stream reference
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Thread list management with stable callbacks
  const threadListManager = useThreadListManager({
    fetchThreadList: useCallback(() => Promise.resolve([]), []),
    deleteThread: useCallback((threadId) => {
      console.log('Deleting thread:', threadId);
      return Promise.resolve();
    }, []),
    updateThread: useCallback((thread) => {
      console.log('Updating thread:', thread);
      return Promise.resolve(thread);
    }, []),
    onSwitchToNew: useCallback(() => {
      console.log('Starting new voice conversation');
    }, []),
    onSelectThread: useCallback((threadId) => {
      console.log('Selected thread:', threadId);
    }, []),
    createThread: useCallback((message) => {
      console.log('Creating new thread for message:', message);
      return Promise.resolve({
        threadId: crypto.randomUUID(),
        title: 'Voice Chat Session',
        createdAt: new Date(),
        messages: []
      });
    }, [])
  });

  // Thread management with stable callbacks
  const threadManager = useThreadManager({
    threadListManager,
    loadThread: useCallback((threadId) => {
      console.log('Loading thread:', threadId);
      return Promise.resolve([]); 
    }, []),
    onUpdateMessage: useCallback(({ message }) => {
      console.log('Message updated:', message);
    }, []),
    apiUrl: '/api/chat',
  });

  // Store threadManager in ref to avoid recreating WebSocket
  useEffect(() => {
    threadManagerRef.current = threadManager;
  }, [threadManager]);

  // Voice connection functions
  const connectVoice = useCallback(async () => {
    setVoiceStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      localStreamRef.current = stream;
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const transcriptChannel = pc.createDataChannel('transcript');
      transcriptChannel.onopen = () => {
        console.log('WebRTC transcript channel opened');
      };
      transcriptChannel.onmessage = (event) => {
        console.log('WebRTC transcript message received via data channel:', event.data);
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          console.error('Error parsing transcript JSON:', err);
          return;
        }
        if (msg.type === 'user-stopped-speaking') {
          setIsVoiceLoading(true);
        } else if (msg.type === 'bot-started-speaking') {
          setIsVoiceLoading(false);
        }

        if (msg.type === 'user_transcription') {
          const transcriptionText = msg.text || msg.content;
          console.log('Frontend (interim transcript log):', transcriptionText);
        }
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log('Received remote audio stream');
        setAudioStream(event.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(config.webrtcURL || '/api/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
        }),
      });

      const answer = await response.json();
      
      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: answer.sdp,
        type: answer.type,
      }));

      setVoiceStatus('connected');
      
      const successMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: formatAssistantMessage('🎤 **Voice connection established!** You can now speak to interact with the assistant.')
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(successMessage);
      }

    } catch (error) {
      console.error('Error connecting voice:', error);
      setVoiceStatus('disconnected');
      
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: createErrorMessage('Failed to connect voice: ' + (error instanceof Error ? error.message : String(error)))
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(errorMessage);
      }
    }
  }, [config.webrtcURL]);

  const disconnectVoice = useCallback(() => {
    // Ensure tracks are re-enabled next time
    setIsVoicePaused(false);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setVoiceStatus('disconnected');
    setAudioStream(null);
    const disconnectMessage = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      message: [{
        type: 'template' as const,
        name: 'c1',
        templateProps: {
          content: formatAssistantMessage('🔇 Voice connection disconnected.')
        }
      }]
    };
    if (threadManagerRef.current) {
      threadManagerRef.current.appendMessages(disconnectMessage);
    }
  }, []);

  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
    }
  }, [audioStream]);

  const formatAssistantMessage = useCallback((content: any) => {
    console.log('Formatting assistant message:', content);
    
    if (typeof content === 'string') {
      return `<content>${JSON.stringify({
        component: "Card",
        props: {
          variant: "card",
          children: [{
            component: "TextContent",
            props: {
              textMarkdown: content
            }
          }]
        }
      })}</content>`;
    }
    
    if (content && typeof content === 'object' && content.component) {
      return `<content>${JSON.stringify(content)}</content>`;
    }
    
    if (typeof content === 'object') {
      return `<content>${JSON.stringify({
        component: "Card",
        props: {
          variant: "card",
          children: [{
            component: "TextContent",
            props: {
              textMarkdown: "```json\n" + JSON.stringify(content, null, 2) + "\n```"
            }
          }]
        }
      })}</content>`;
    }
    
    return `<content>${JSON.stringify({
      component: "TextContent",
      props: {
        textMarkdown: String(content)
      }
    })}</content>`;
  }, []);

  const parseAndFormatUserMessage = useCallback((message: string) => {
    const contentMatch = message.match(/<content>(.*?)<\/content>/);
    const contextMatch = message.match(/<context>(.*?)<\/context>/);
    
    if (contentMatch && contextMatch) {
      try {
        const actionName = contentMatch[1];
        const contextData = contextMatch[1];
        
        console.log('Detected C1 action format. Action:', actionName, 'Context:', contextData);
        
        let parsedContext;
        try {
          const unescapedContext = contextData.replace(/\\\"/g, '"');
          parsedContext = JSON.parse(unescapedContext);
        } catch (e) {
          console.log('Could not parse context as JSON, using as string');
          parsedContext = contextData;
        }
        
        return {
          isC1Format: true,
          message: [{
            type: 'template' as const,
            name: 'c1',
            templateProps: {
              content: `<content>${JSON.stringify({
                component: "Card",
                props: {
                  variant: "card",
                  children: [{
                    component: "TextContent",
                    props: {
                      textMarkdown: actionName
                    }
                  }, {
                    component: "TextContent",
                    props: {
                      textMarkdown: parsedContext
                    }
                  }]
                }
              })}</content>`
            }
          }]
        };
      } catch (error) {
        console.error('Error parsing XML message:', error);
      }
    }
    
    return {
      isC1Format: false,
      message: message
    };
  }, []);

  const createErrorMessage = useCallback((errorText: string) => {
    return `<content>${JSON.stringify({
      component: "Callout",
      props: {
        variant: "warning",
        title: "Connection Status",
        description: errorText
      }
    })}</content>`;
  }, []);

  const safelyCloseWebSocket = useCallback((ws: WebSocket | null) => {
    if (!ws) return;
    
    try {
      const connectionId = wsConnectionIdRef.current;
      console.log(`[WS:${connectionId}] Closing WebSocket connection...`);
      
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.log(`[WS:${connectionId}] WebSocket already closing/closed (state: ${ws.readyState})`);
        return;
      }
      
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`[WS:${connectionId}] WebSocket is connecting, setting up onopen handler to close immediately`);
        const originalOnOpen = ws.onopen;
        ws.onopen = (event) => {
          if (originalOnOpen) {
            originalOnOpen.call(ws, event);
          }
          console.log(`[WS:${connectionId}] WebSocket connected, now closing immediately`);
          ws.close();
        };
        return;
      }
      
      console.log(`[WS:${connectionId}] Closing open WebSocket connection`);
      ws.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const connectionId = wsConnectionIdRef.current;
    console.log(`[WS:${connectionId}] Setting up WebSocket connection for C1Chat...`);
    
    safelyCloseWebSocket(wsRef.current);
    wsRef.current = null;
    setWsConnectionState('connecting');
    
    const backendPort = '8000';
    const hostname = window.location.hostname;
    const wsUrl = config.websocketURL || (window.location.protocol === 'https:'
      ? `wss://${hostname}:${backendPort}/ws/messages`
      : `ws://${hostname}:${backendPort}/ws/messages`);

    console.log(`[WS:${connectionId}] Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS:${connectionId}] WebSocket connected for C1Chat`);
      setWsConnectionState('connected');
      
      const welcomeMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: formatAssistantMessage('🎙️ **Chat Interface Ready!** \n\nYou can now use the chat input below to send messages to the AI assistant. Voice features are available via the "Connect Voice" button.')
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(welcomeMessage);
      }
    };

    ws.onmessage = (event) => {
      console.log(`[WS:${connectionId}] WebSocket message received:`, event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connection_ack') {
          console.log(`[WS:${connectionId}] WebSocket connection acknowledged:`, data.message);
          
        } else if (data.type === 'immediate_voice_response') {
          console.log(`[WS:${connectionId}] Received immediate voice response message:`, data);

          let messageContent;

          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            messageContent = data.content;
            console.log(`[WS:${connectionId}] Using pre-formatted Thesys content from immediate voice response:`, messageContent);
          } else {
            messageContent = formatAssistantMessage(data.content || 'Voice response received');
            console.log(`[WS:${connectionId}] Formatting raw immediate voice response content:`, data.content);
          }

          const immediateVoiceMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant' as const,
            isVoiceOverOnly: data.isVoiceOverOnly || false,
            message: [{
              type: 'template' as const,
              name: 'c1',
              templateProps: {
                content: messageContent
              }
            }]
          };

          if (threadManagerRef.current) {
            try {
              threadManagerRef.current.appendMessages(immediateVoiceMessage);
            } catch (error) {
              console.error(`[WS:${connectionId}] Error calling appendMessages for immediate voice message:`, error);
            }
          }
        
        } else if (data.type === 'voice_response') {
          console.log(`[WS:${connectionId}] Received voice response message:`, data);
          setIsEnhancing(false);
          
          let messageContent;
          
          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            messageContent = data.content;
            console.log(`[WS:${connectionId}] Using pre-formatted Thesys content from voice response:`, messageContent);
          } else {
            messageContent = formatAssistantMessage(data.content || 'Voice response received');
            console.log(`[WS:${connectionId}] Formatting raw voice response content:`, data.content);
          }
          
          const voiceMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant' as const,
            isVoiceOverOnly: data.isVoiceOverOnly || false,
            message: [{
              type: 'template' as const,
              name: 'c1',
              templateProps: {
                content: messageContent
              }
            }]
          };
          
          console.log(`[WS:${connectionId}] Prepared voice message for threadManager:`, voiceMessage);
          
          if (threadManagerRef.current) {
            console.log(`[WS:${connectionId}] About to call appendMessages with voice message`);
            try {
              threadManagerRef.current.appendMessages(voiceMessage);
              console.log(`[WS:${connectionId}] Successfully called appendMessages for voice message`);
            } catch (error) {
              console.error(`[WS:${connectionId}] Error calling appendMessages:`, error);
            }
          } else {
            console.error(`[WS:${connectionId}] threadManagerRef.current is null when trying to append voice message`);
          }
          
        } else if (data.type === 'text_chat_response') {
          console.log(`[WS:${connectionId}] Received text chat response message:`, data);

          setIsLoading(false);
          
          let messageContent;
          
          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            messageContent = data.content;
            console.log(`[WS:${connectionId}] Using pre-formatted Thesys content from text chat response:`, messageContent);
          } else {
            messageContent = formatAssistantMessage(data.content || 'Text response received');
            console.log(`[WS:${connectionId}] Formatting raw text chat response content:`, data.content);
          }
          
          const textChatMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant' as const,
            message: [{
              type: 'template' as const,
              name: 'c1',
              templateProps: {
                content: messageContent
              }
            }]
          };
          
          console.log(`[WS:${connectionId}] Prepared text chat message for threadManager:`, textChatMessage);
          
          if (threadManagerRef.current) {
            console.log(`[WS:${connectionId}] About to call appendMessages with text chat message`);
            try {
              threadManagerRef.current.appendMessages(textChatMessage);
              console.log(`[WS:${connectionId}] Successfully called appendMessages for text chat message`);
            } catch (error) {
              console.error(`[WS:${connectionId}] Error calling appendMessages:`, error);
            }
          } else {
            console.error(`[WS:${connectionId}] threadManagerRef.current is null when trying to append text chat message`);
          }
          
        } else if (data.type === 'user_transcription') {
          console.log(`[WS:${connectionId}] Received user transcription message:`, data);
          
          const transcriptionText = data.text || data.content;

          if (!transcriptionText) {
            console.warn(`[WS:${connectionId}] User transcription received but the text is empty or not a string:`, data);
            return;
          }

          if (!threadManagerRef.current) return;

          const isXmlFormat = transcriptionText.includes('<content>') && transcriptionText.includes('<context>');
          
          if (isXmlFormat) {
            console.log(`[WS:${connectionId}] Skipping XML format user message to avoid duplication:`, transcriptionText);
            return;
          }
          
          const parsedMessage = parseAndFormatUserMessage(transcriptionText);
          
          const userMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'user' as const,
            ...(parsedMessage.isC1Format 
              ? { message: parsedMessage.message }
              : { message: parsedMessage.message, type: 'prompt' as const })
          };

          threadManagerRef.current.appendMessages(userMessage);
          
        } else if (data.type === 'c1_token') {
          const msgId = data.id;
          if (typeof msgId === 'string') {
            console.log(`[WS:${connectionId}] Processing c1_token for message ID: ${msgId}`);
            
            if (streamingMessageIdRef.current !== msgId) {
              console.log(`[WS:${connectionId}] First c1_token chunk for message ${msgId}`);
              
              streamingMessageIdRef.current = msgId;
              streamingContentRef.current = data.content || '';
              
              setIsStreamingActive(true);
              setStreamTick(t => t + 1);
            } else {
              console.log(`[WS:${connectionId}] Accumulating content for streaming message ${msgId}`);
              streamingContentRef.current += (data.content || '');
              setStreamTick(t => t + 1);
            }
          }
        } else if (data.type === 'chat_done') {
          const msgId = data.id;
          if (typeof msgId === 'string' && streamingMessageIdRef.current === msgId) {
            console.log(`[WS:${connectionId}] Received chat_done for message ${msgId}`);
            
            const fullContent = streamingContentRef.current;
            const formattedContent = fullContent.includes('<content>') ? 
              fullContent : 
              formatAssistantMessage(fullContent);
            
            const finalMessage = {
              id: msgId,
              role: 'assistant' as const,
              message: [{
                type: 'template' as const,
                name: 'c1',
                templateProps: {
                  content: formattedContent
                }
              }]
            };
            
            if (threadManagerRef.current) {
              setTimeout(() => {
                try {
                  threadManagerRef.current.appendMessages(finalMessage);
                  console.log(
                    `[WS:${connectionId}] Added final message to threadManager (delayed)`,
                  );
                } catch (err) {
                  console.error(
                    `[WS:${connectionId}] Failed to append final message:`,
                    err,
                  );
                }
              }, 100);
            }
            
            streamingMessageIdRef.current = null;
            streamingContentRef.current = '';
            setIsStreamingActive(false);
            
            setIsEnhancing(false);
            setIsLoading(false);
          }
        } else if (data.type === 'enhancement_started') {
          console.log(`[WS:${connectionId}] Enhancement in progress – showing indicator`);
          setIsEnhancing(true);
          
        } else if (data.type === 'voice_message') {
          console.log(`[WS:${connectionId}] Received voice-related message:`, data);
          
          let messageContent = formatAssistantMessage(data.content || data.message || 'Voice message received');
          
          const voiceMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant' as const,
            message: [{
              type: 'template' as const,
              name: 'c1',
              templateProps: {
                content: messageContent
              }
            }]
          };
          
          if (threadManagerRef.current) {
            threadManagerRef.current.appendMessages(voiceMessage);
          }
          
        } else {
          console.log(`[WS:${connectionId}] Received unknown message type:`, data.type, data);
        }
      } catch (error) {
        console.error(`[WS:${connectionId}] Error processing WebSocket message:`, error);
        
        const errorMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          message: [{
            type: 'template' as const,
            name: 'c1',
            templateProps: {
              content: createErrorMessage('Failed to process message: ' + (error instanceof Error ? error.message : String(error)))
            }
          }]
        };
        
        if (threadManagerRef.current) {
          threadManagerRef.current.appendMessages(errorMessage);
        }
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS:${connectionId}] WebSocket error:`, error);
      setWsConnectionState('error');
      
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: createErrorMessage('❌ WebSocket connection error')
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(errorMessage);
      }
    };

    ws.onclose = (event) => {
      console.log(`[WS:${connectionId}] WebSocket disconnected:`, event);
      setWsConnectionState('disconnected');
      
      const closeMessage = `❌ WebSocket closed: code=${event.code}, reason=${event.reason || 'N/A'}, clean=${event.wasClean}`;
      
      const disconnectMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: createErrorMessage(closeMessage)
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(disconnectMessage);
      }
    };

    return () => {
      console.log(`[WS:${connectionId}] Component unmounting, cleaning up WebSocket connection...`);
      const ws = wsRef.current;
      
      safelyCloseWebSocket(ws);
      
      wsRef.current = null;
      setWsConnectionState('disconnected');
    };
  }, [safelyCloseWebSocket, formatAssistantMessage, createErrorMessage, parseAndFormatUserMessage, config.websocketURL]);

  const handleC1ComponentAction = useCallback(async (action: { llmFriendlyMessage: string, humanFriendlyMessage: string, [key: string]: any }) => {
    console.log('Action from C1Component received in VoiceBotClient:', action);
    
    try {
      setIsLoading(true);
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      ws.send(JSON.stringify({
        type: 'thesys_bridge',
        prompt: { content: action.llmFriendlyMessage },
        threadId: threadListManager.selectedThreadId,
        responseId: crypto.randomUUID(),
      }));

      console.log('C1Component action sent via WebSocket');
      
    } catch (error) {
      console.error('Error sending C1Component action:', error);
      
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: createErrorMessage('Failed to send action: ' + (error instanceof Error ? error.message : String(error)))
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(errorMessage);
      }
      
      setIsLoading(false);
    }
  }, [threadListManager.selectedThreadId, createErrorMessage]);

  const handleSendTextMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    console.log('=== SENDING TEXT MESSAGE ===');
    console.log('Message:', message);
    console.log('Thread ID:', threadListManager.selectedThreadId);
    
    try {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      ws.send(JSON.stringify({
        type: 'chat',
        message: message,
        thread_id: threadListManager.selectedThreadId,
      }));

      console.log('Text message sent via WebSocket');
      
    } catch (error) {
      console.error('=== ERROR SENDING TEXT MESSAGE ===');
      console.error('Error:', error);
      
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        message: [{
          type: 'template' as const,
          name: 'c1',
          templateProps: {
            content: createErrorMessage('Failed to send message: ' + (error instanceof Error ? error.message : String(error)))
          }
        }]
      };
      
      if (threadManagerRef.current) {
        threadManagerRef.current.appendMessages(errorMessage);
      }
    }
  }, [threadListManager.selectedThreadId, createErrorMessage]);

  return (
    <>
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      <VoiceBotFullscreenLayout
        isVoiceConnected={voiceStatus === 'connected'}
        isVoiceLoading={voiceStatus === 'connecting'}
        onToggleVoice={() => {
          if (voiceStatus === 'connected') {
            disconnectVoice();
          } else if (voiceStatus === 'disconnected') {
            connectVoice();
          }
        }}
        
        onSendMessage={handleSendTextMessage}
        onC1Action={handleC1ComponentAction}
        isLoading={isLoading}
        isEnhancing={isEnhancing}
        streamingContent={streamingContentRef.current}
        streamingMessageId={streamingMessageIdRef.current}
        isStreamingActive={isStreamingActive}
        onClose={onClose}
        
        config={{
          agentName: config.agentName || "Eleven",
          agentSubtitle: config.agentSubtitle || "How can I help you today?",
          logoUrl: config.logoUrl || "/favicon.ico",
          backgroundColor: config.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          primaryColor: config.primaryColor || "#667eea",
          accentColor: config.accentColor || "#5a67d8",
          threadManagerTitle: config.threadManagerTitle || "Conversations",
          enableThreadManager: config.enableThreadManager ?? true,
          startCallButtonText: config.startCallButtonText || "Start a call",
          endCallButtonText: config.endCallButtonText || "End call",
          connectingText: config.connectingText || "Connecting...",
        }}
      />
    </>
  );
};

export default VoiceBotClient; 