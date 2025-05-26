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
  
  // Voice/WebRTC state
  const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

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
    apiUrl: '/api/websocket-bridge',
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
    setIsRecording(false);
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

  useEffect(() => {
    console.log('Setting up WebSocket connection for C1Chat...');
    const wsUrl = window.location.protocol === 'https:'
      ? 'wss://' + window.location.host + '/ws/messages'
      : 'ws://' + window.location.host + '/ws/messages';

    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for C1Chat');
      
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
      console.log('WebSocket message received:', event.data);
      
      try {
        // Try to parse as JSON first
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // If not JSON, treat as plain text
          data = {
            type: 'assistant_message',
            content: event.data
          };
        }
        
        // Handle different message types
        if (data.type === 'connection_ack') {
          // Handle connection acknowledgment
          console.log('WebSocket connection acknowledged:', data.message);
          
        } else if (data.type === 'voice_response') {
          // Handle voice response messages from the visualization processor
          console.log('Received voice response message:', data);
          
          let messageContent;
          
          // Check if content is already in Thesys format (from visualization processor)
          if (typeof data.content === 'string' && data.content.includes('<content>')) {
            // Content is already in Thesys XML format, use as-is
            messageContent = data.content;
            console.log('Using pre-formatted Thesys content from voice response:', messageContent);
          } else {
            // Content needs formatting
            messageContent = formatAssistantMessage(data.content || 'Voice response received');
            console.log('Formatting raw voice response content:', data.content);
          }
          
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
          
        } else if (data.type === 'user_transcription') {
          // Handle user voice transcription messages
          console.log('Received user transcription message:', data);
          
          // Assuming the transcription text is in 'data.text' or 'data.content'.
          // Please verify and adjust this field (e.g., data.transcription) if necessary
          // by inspecting the 'data' object logged above.
          const transcriptionText = data.text || data.content;

          if (transcriptionText && typeof transcriptionText === 'string' && threadManagerRef.current) {
            const userMessage = {
              id: data.id || crypto.randomUUID(), // Use server-provided ID or generate a new one
              role: 'user' as const,
              message: transcriptionText,
              type: 'prompt' as const, // Explicitly set type for clarity with SDK internals
            };
            threadManagerRef.current.appendMessages(userMessage);
          } else if (!transcriptionText) {
            console.warn('User transcription received but the text is empty or not a string:', data);
          }
          
        } else if (data.type === 'voice_message') {
          // Handle other voice-related messages (for future voice integration)
          console.log('Received voice-related message:', data);
          
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
          console.log('Received unknown message type:', data.type, data);
          // For debugging purposes, we can still display unknown messages
          // but in production, you might want to just log them
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
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
      console.error('WebSocket error:', error);
      
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
      console.log('WebSocket disconnected:', event);
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
      console.log('Cleaning up WebSocket connection...');
      if (wsRef.current && 
          wsRef.current.readyState !== WebSocket.CLOSED && 
          wsRef.current.readyState !== WebSocket.CLOSING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, []); // Empty dependency array - only run once

  // Handler for actions coming from C1Component via GenerativeUIChat
  const handleC1ComponentAction = useCallback((action: { llmFriendlyMessage: string, humanFriendlyMessage: string, [key: string]: any }) => {
    console.log('Action from C1Component received in VoiceBotClient:', action);
    // Example: Send the action's llmFriendlyMessage via WebSocket
    // You might need to format this into your backend's expected message structure
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Assuming your backend expects a message of type 'user_action' or similar
      // and the payload is the llmFriendlyMessage or the whole action object.
      // This is an EXAMPLE, adjust to your backend's needs.
      const actionMessageForBackend = {
        type: 'user_action_from_dynamic_ui', // Or whatever your backend expects
        payload: action.llmFriendlyMessage, // Or action object itself
        // You might want to include threadId or other context here
      };
      wsRef.current.send(JSON.stringify(actionMessageForBackend));

      // Optionally, add a user message to the chat to reflect the action taken
      // This depends on whether the action itself should be visible as a user prompt
      if (action.humanFriendlyMessage && threadManagerRef.current) {
          const userActionMessage = {
              id: crypto.randomUUID(),
              role: 'user' as const,
              content: action.humanFriendlyMessage, 
          };
          threadManagerRef.current.appendMessages(userActionMessage);
      }

    } else {
      console.warn('WebSocket not open, cannot send C1Component action.');
      // Potentially queue the action or notify the user
    }
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Remove Voice Controls Overlay from here */}
      {/* Hidden audio element for voice output */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      <GenerativeUIChat
        threadManager={threadManager} // from @thesysai/genui-sdk
        agentName="Voice Assistant"
        logoUrl="/favicon.ico" // Ensure this path is correct in your public folder
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
      />
    </div>
  );
};

export default VoiceBotClient; 