import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  useThreadManager, 
  useThreadListManager,
} from '@thesysai/genui-sdk'; // C1Component is used internally by ChatMessageRenderer
import GenerativeUIChat from './GenerativeUIChat'; // Import the new component
import '@crayonai/react-ui/styles/index.css';

const VoiceBotClient: React.FC = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const threadManagerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Use refs for immediate accumulation of streaming content
  const streamingContentRef = useRef<string>('');
  const streamingMessageIdRef = useRef<string | null>(null);
  // Keep a state variable to trigger re-renders in GenerativeUIChat
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);
  // Lightweight counter to force re-render on each incoming chunk
  const [streamTick, setStreamTick] = useState<number>(0);
  
  const wsConnectionIdRef = useRef<string>(`ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [wsConnectionState, setWsConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Voice/WebRTC state
  const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Voice-specific loading (between user-stopped-speaking → bot-started-speaking)
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  // NEW: UI-enhancement loading indicator (slow-path visualization)
  const [isEnhancing, setIsEnhancing] = useState(false);

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
        messages: [] // Initially empty, messages are appended by threadManager
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
    // apiUrl is not strictly needed if WebSocket handles all outbound messages, 
    // but CrayonChat might use it for its own input if not overridden.
    // For Phase 1, let's keep it as it might interact with how CrayonChat's default input works.
    apiUrl: '/api/chat',
    // We are not using processMessage here as WebSocket messages are handled separately
    // and C1Component actions will be routed via onC1ComponentAction prop.
  });

  // Store threadManager in ref to avoid recreating WebSocket
  useEffect(() => {
    threadManagerRef.current = threadManager;
  }, [threadManager]);

  // Voice connection functions
  const connectVoice = useCallback(async () => {
    setVoiceStatus('connecting');
    try {
      // Get user media for WebRTC
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      // Create WebRTC connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Create data channel for interim transcripts
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
        // loading state toggles
        if (msg.type === 'user-stopped-speaking') {
          setIsVoiceLoading(true);
        } else if (msg.type === 'bot-started-speaking') {
          setIsVoiceLoading(false);
        }

        if (msg.type === 'user_transcription') {
          const transcriptionText = msg.text || msg.content;
          console.log('Frontend (interim transcript log):', transcriptionText);
          // no UI update yet – only logging interim transcripts
        }
      };

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote audio stream');
        setAudioStream(event.streams[0]);
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to backend
      const response = await fetch('/api/offer', {
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
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: answer.sdp,
        type: answer.type,
      }));

      setVoiceStatus('connected');
      
      // Add success message to chat
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
  }, []);

  const disconnectVoice = useCallback(() => {
    setVoiceStatus('disconnected');
    setAudioStream(null);
    // Consider closing WebRTC connection more formally if needed
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

  // Audio stream effect
  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
    }
  }, [audioStream]);

  const formatAssistantMessage = useCallback((content: any) => {
    console.log('Formatting assistant message:', content);
    
    // Handle different content types
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
    
    // If content is already a Thesys component
    if (content && typeof content === 'object' && content.component) {
      return `<content>${JSON.stringify(content)}</content>`;
    }
    
    // For other objects, stringify them
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
    
    // Fallback for any other type
    return `<content>${JSON.stringify({
      component: "TextContent",
      props: {
        textMarkdown: String(content)
      }
    })}</content>`;
  }, []);

  // Helper function to parse and format user messages that might be in XML format
  const parseAndFormatUserMessage = useCallback((message: string) => {
    // Check if the message matches the pattern <content>action</content><context>data</context>
    const contentMatch = message.match(/<content>(.*?)<\/content>/);
    const contextMatch = message.match(/<context>(.*?)<\/context>/);
    
    if (contentMatch && contextMatch) {
      try {
        // Extract the action name and context data
        const actionName = contentMatch[1];
        const contextData = contextMatch[1];
        
        console.log('Detected C1 action format. Action:', actionName, 'Context:', contextData);
        
        // Parse the context data if possible
        let parsedContext;
        try {
          // The context is often a JSON string with escaped quotes
          // First unescape it
          const unescapedContext = contextData.replace(/\\\"/g, '"');
          parsedContext = JSON.parse(unescapedContext);
        } catch (e) {
          console.log('Could not parse context as JSON, using as string');
          parsedContext = contextData;
        }
        
        // Format as a C1Component with clean display
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
    
    // If not in XML format or parsing failed, return as plain text
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

  // Function to safely close WebSocket
  const safelyCloseWebSocket = useCallback((ws: WebSocket | null) => {
    if (!ws) return;
    
    try {
      const connectionId = wsConnectionIdRef.current;
      console.log(`[WS:${connectionId}] Closing WebSocket connection...`);
      
      // Check if it's already closed or closing
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.log(`[WS:${connectionId}] WebSocket already closing/closed (state: ${ws.readyState})`);
        return;
      }
      
      // For CONNECTING state, we need to wait for connection to establish before closing
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`[WS:${connectionId}] WebSocket is connecting, setting up onopen handler to close immediately`);
        const originalOnOpen = ws.onopen;
        ws.onopen = (event) => {
          // Call original handler if exists
          if (originalOnOpen) {
            originalOnOpen.call(ws, event);
          }
          console.log(`[WS:${connectionId}] WebSocket connected, now closing immediately`);
          ws.close();
        };
        return;
      }
      
      // For OPEN state, just close it
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
    
    // Close any existing connection first
    safelyCloseWebSocket(wsRef.current);
    wsRef.current = null;
    setWsConnectionState('connecting');
    
    // Always connect to the backend running on port 8000. We keep the same
    // protocol (ws/wss) and hostname, but override the port so the frontend
    // (e.g. Vite dev server on 1420) does not attempt to serve the WS route.
    const backendPort = '8000';
    const hostname = window.location.hostname;
    const wsUrl = window.location.protocol === 'https:'
      ? `wss://${hostname}:${backendPort}/ws/messages`
      : `ws://${hostname}:${backendPort}/ws/messages`;

    console.log(`[WS:${connectionId}] Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS:${connectionId}] WebSocket connected for C1Chat`);
      setWsConnectionState('connected');
      
      // Send a welcome message through Thesys
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
        
        // Handle different message types
        if (data.type === 'connection_ack') {
          // Handle connection acknowledgment
          console.log(`[WS:${connectionId}] WebSocket connection acknowledged:`, data.message);
          
        } else if (data.type === 'immediate_voice_response') {
          // Fast-path message that arrives before enhancement
          console.log(`[WS:${connectionId}] Received immediate voice response message:`, data);

          let messageContent;

          // Payload should already be Thesys XML, but be defensive
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
            // Pass the isVoiceOverOnly flag to indicate there was voice-over audio
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
          // Handle voice response messages from the visualization processor
          console.log(`[WS:${connectionId}] Received voice response message:`, data);
          // Slow-path finished – stop enhancement indicator
          setIsEnhancing(false);
          
          let messageContent;
          
          // Check if content is already in Thesys format (from visualization processor)
          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            // Content is already in Thesys XML format, use as-is
            messageContent = data.content;
            console.log(`[WS:${connectionId}] Using pre-formatted Thesys content from voice response:`, messageContent);
          } else {
            // Content needs formatting
            messageContent = formatAssistantMessage(data.content || 'Voice response received');
            console.log(`[WS:${connectionId}] Formatting raw voice response content:`, data.content);
          }
          
          const voiceMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'assistant' as const,
            // Pass the isVoiceOverOnly flag to indicate there was voice-over audio
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
          console.log(`[WS:${connectionId}] threadManagerRef.current:`, threadManagerRef.current);
          
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
          // Handle text chat response messages from the visualization processor
          console.log(`[WS:${connectionId}] Received text chat response message:`, data);

          // Text response is now fully received – stop the loading indicator
          setIsLoading(false);
          
          let messageContent;
          
          // Check if content is already in Thesys format (from visualization processor)
          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            // Content is already in Thesys XML format, use as-is
            messageContent = data.content;
            console.log(`[WS:${connectionId}] Using pre-formatted Thesys content from text chat response:`, messageContent);
          } else {
            // Content needs formatting
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
          // Handle user voice transcription messages
          console.log(`[WS:${connectionId}] Received user transcription message:`, data);
          
          // Get the transcription text
          const transcriptionText = data.text || data.content;

          if (!transcriptionText) {
            console.warn(`[WS:${connectionId}] User transcription received but the text is empty or not a string:`, data);
            return;
          }

          if (!threadManagerRef.current) return;

          // Check if message is in XML format (contains <content> and <context> tags)
          const isXmlFormat = transcriptionText.includes('<content>') && transcriptionText.includes('<context>');
          
          // Skip displaying XML format messages since they're already shown by handleC1ComponentAction
          if (isXmlFormat) {
            console.log(`[WS:${connectionId}] Skipping XML format user message to avoid duplication:`, transcriptionText);
            return;
          }
          
          // For non-XML messages, parse and display normally
          const parsedMessage = parseAndFormatUserMessage(transcriptionText);
          
          // Create the appropriate message format based on parsing result
          const userMessage = {
            id: data.id || crypto.randomUUID(),
            role: 'user' as const,
            ...(parsedMessage.isC1Format 
              ? { message: parsedMessage.message } // Use the C1Component format
              : { message: parsedMessage.message, type: 'prompt' as const }) // Use plain text format
          };

          threadManagerRef.current.appendMessages(userMessage);
          
        } else if (data.type === 'c1_token') {
          /* -----------------------------------------------------------
           *  Streaming C1Component chunks handler
           * --------------------------------------------------------- */
          const msgId = data.id;
          if (typeof msgId === 'string') {
            console.log(`[WS:${connectionId}] Processing c1_token for message ID: ${msgId}`);
            
            // Check if this is the first chunk for this message ID
            if (streamingMessageIdRef.current !== msgId) {
              console.log(`[WS:${connectionId}] First c1_token chunk for message ${msgId}`);
              
              // Initialize streaming state with refs (immediate updates)
              streamingMessageIdRef.current = msgId;
              streamingContentRef.current = data.content || '';
              
              // Set streaming active flag to trigger UI update
              setIsStreamingActive(true);
              // Trigger first render with initial chunk
              setStreamTick(t => t + 1);
            } else {
              // Accumulate content for subsequent chunks
              console.log(`[WS:${connectionId}] Accumulating content for streaming message ${msgId}`);
              streamingContentRef.current += (data.content || '');
              // Force re-render so UI reflects new chunk
              setStreamTick(t => t + 1);
            }
          }
        } else if (data.type === 'chat_done') {
          /* -----------------------------------------------------------
           *  End-of-stream marker
           * --------------------------------------------------------- */
          const msgId = data.id;
          if (typeof msgId === 'string' && streamingMessageIdRef.current === msgId) {
            console.log(`[WS:${connectionId}] Received chat_done for message ${msgId}`);
            
            // Format the final content
            const fullContent = streamingContentRef.current;
            const formattedContent = fullContent.includes('<content>') ? 
              fullContent : 
              formatAssistantMessage(fullContent);
            
            // Create the final message with accumulated content
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
            
            // Add final message to threadManager **after a tiny delay**
            // – lets the streaming bubble un-mount first, preventing duplicate keys.
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
              }, 100); // 0.1 s is visually imperceptible but avoids React warnings
            }
            
            // Reset streaming state
            streamingMessageIdRef.current = null;
            streamingContentRef.current = '';
            setIsStreamingActive(false);
            
            // Streaming finished – remove any loading indicators
            setIsEnhancing(false);
            setIsLoading(false);
          }
        } else if (data.type === 'enhancement_started') {
          // Slow path (visualisation) signalled it is working on UI
          console.log(`[WS:${connectionId}] Enhancement in progress – showing indicator`);
          setIsEnhancing(true);
          
        } else if (data.type === 'voice_message') {
          // Handle other voice-related messages (for future voice integration)
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
          // For debugging purposes, we can still display unknown messages
          // but in production, you might want to just log them
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

    // Cleanup function
    return () => {
      console.log(`[WS:${connectionId}] Component unmounting, cleaning up WebSocket connection...`);
      const ws = wsRef.current;
      
      // Use the safe close method that handles all WebSocket states
      safelyCloseWebSocket(ws);
      
      // Clear the reference
      wsRef.current = null;
      setWsConnectionState('disconnected');
    };
  }, [safelyCloseWebSocket, formatAssistantMessage, createErrorMessage, parseAndFormatUserMessage]); // Dependencies include the stable callbacks

  // Handler for actions coming from C1Component via GenerativeUIChat
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
      
      // Show error message in chat
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
      
      // Reset loading state
      setIsLoading(false);
    }
  }, [threadListManager.selectedThreadId, createErrorMessage]);

  // Handler for text messages sent via chat input
  const handleSendTextMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    console.log('=== SENDING TEXT MESSAGE ===');
    console.log('Message:', message);
    console.log('Thread ID:', threadListManager.selectedThreadId);
    console.log('Endpoint: /api/chat-enhanced');
    
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
      
      // Show error message in chat
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
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Remove Voice Controls Overlay from here */}
      {/* Hidden audio element for voice output */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      <GenerativeUIChat
        threadManager={threadManager} // from @thesysai/genui-sdk
        agentName="Voice Assistant"
        logoUrl="/favicon.ico" // Ensure this path is correct in your public folder
        onSendMessage={handleSendTextMessage} // Add text message handler
        onC1Action={handleC1ComponentAction} // Pass the handler
        // Pass voice connect/disconnect logic and state to GenerativeUIChat
        onToggleVoiceConnection={() => {
          if (voiceStatus === 'connected') {
            disconnectVoice();
          } else if (voiceStatus === 'disconnected') {
            connectVoice();
          }
        }}
        isVoiceConnected={voiceStatus === 'connected'}
        isVoiceConnectionLoading={voiceStatus === 'connecting'}
        isLoading={isLoading}
        isVoiceLoading={isVoiceLoading}
        isEnhancing={isEnhancing}
        // Pass streaming state to GenerativeUIChat
        streamingContent={streamingContentRef.current}
        streamingMessageId={streamingMessageIdRef.current}
        isStreamingActive={isStreamingActive}
      />
    </div>
  );
};

export default VoiceBotClient;
