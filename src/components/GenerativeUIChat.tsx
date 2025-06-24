import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useThreadManager } from '@crayonai/react-core';
import { C1Component } from '@thesysai/genui-sdk';
import '@thesysai/genui-sdk/dist/index.css';
import { ThemeProvider } from '@crayonai/react-ui';
import CustomChatComposer from './CustomChatComposer';
import CustomChatMessage from './CustomChatMessage';
import './GenerativeUIChat.css';
// VoiceIcon might be used in the header if you still want an indicator there
// import VoiceIcon from './VoiceIcon'; 

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content?: string;
    // For C1Component messages
    c1Content?: string;
    /** True when backend flagged the assistant bubble as having additional
     *  audio (voice-over) that is *not* included in the visible content. */
    hasVoiceOver?: boolean;
    timestamp: Date;
}

interface GenerativeUIChatProps {
    threadManager: ReturnType<typeof useThreadManager>;
    agentName?: string;
    logoUrl?: string;
    onSendMessage?: (message: string) => void;
    onC1Action?: (action: any) => void;
    searchImage?: (query: string) => Promise<{ url: string; thumbnailUrl?: string }>;
    onToggleVoiceConnection?: () => void;
    isVoiceConnected?: boolean;
    isVoiceConnectionLoading?: boolean;
    isLoading?: boolean;
    isVoiceLoading?: boolean;
    /** True while slow-path visual enhancement is generating UI. */
    isEnhancing?: boolean;
    /** Current streaming raw C1Component XML (accumulated). */
    streamingContent?: string;
    /** Message-ID for the content being streamed. */
    streamingMessageId?: string | null;
    /** Flag: a stream is in progress (slow-path visual). */
    isStreamingActive?: boolean;
}

const GenerativeUIChat: React.FC<GenerativeUIChatProps> = ({
    threadManager,
    agentName = "AI Assistant",
    logoUrl,
    onSendMessage,
    onC1Action,
    searchImage,
    onToggleVoiceConnection,
    isVoiceConnected,
    isVoiceConnectionLoading,
    isLoading,
    isVoiceLoading,
    isEnhancing,
    streamingContent = '',
    streamingMessageId = null,
    isStreamingActive = false
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    console.log(agentName, logoUrl, searchImage, isVoiceConnectionLoading);
    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Sync with threadManager messages
    useEffect(() => {
        if (threadManager?.messages) {
            const convertedMessages: Message[] = threadManager.messages.map((msg: any) => {
                const isC1Message = msg.message?.[0]?.type === 'template' && 
                                   msg.message?.[0]?.name === 'c1';
                return {
                    id: msg.id,
                    role: msg.role,
                    content: isC1Message ? undefined : (msg.content || msg.message),
                    c1Content: isC1Message ? msg.message[0].templateProps.content : undefined,
                    // Voice-over flag comes from backend through isVoiceOverOnly
                    hasVoiceOver: Boolean(msg.isVoiceOverOnly),
                    timestamp: new Date(msg.createdAt || Date.now())
                };
            });
            setMessages(convertedMessages);
        }
    }, [threadManager?.messages]);

    const handleSendMessage = useCallback((text: string) => {
        if (!text.trim()) return;
        const userMessagePayload = {
            role: 'user' as const,
            type: 'prompt' as const,
            message: text
        };
        if (onSendMessage) {
            // Let backend / WebSocket deliver the user message via threadManager
            onSendMessage(text);
        } else if (threadManager?.processMessage) {
            threadManager.processMessage(userMessagePayload);
        }
    }, [onSendMessage, threadManager]);

    const handleC1ComponentAction = useCallback((action: any) => {
        if (onC1Action) {
            onC1Action(action);
        }
        // Show a clean user bubble with the human-readable action name
        if (action?.humanFriendlyMessage && threadManager?.appendMessages) {
            threadManager.appendMessages({
                id: crypto.randomUUID(),
                role: 'user' as const,
                message: action.humanFriendlyMessage,
                type: 'prompt' as const
            });
        }
        // Do NOT send llmFriendlyMessage through processMessage – it will be
        // forwarded to the backend via onC1Action and WebSocket inside
        // VoiceBotClient to avoid duplicating raw data in the UI.
    }, [onC1Action, threadManager]);

    const handleC1UpdateMessage = useCallback((updatedContent: string, messageId: string) => {
        // This function might need to be handled via threadManager if C1Component updates should persist
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, c1Content: updatedContent }
                : msg
        ));
    }, []);

    return (
        <ThemeProvider theme={{}}>
            <div className="generative-ui-chat">
                {/* Messages Container */}
                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((message, index) => (
                        <CustomChatMessage
                            key={message.id}
                            message={message}
                            isLast={index === messages.length - 1}
                            isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length -1}
                            hasVoiceOver={message.hasVoiceOver}
                        >
                            {/* Render C1Component for messages that have c1Content */}
                            {message.c1Content && (
                                <C1Component
                                    c1Response={message.c1Content}
                                    isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length -1}
                                    updateMessage={(content: string) => handleC1UpdateMessage(content, message.id)}
                                    onAction={handleC1ComponentAction}
                                />
                            )}
                        </CustomChatMessage>
                    ))}
                    
                    {/* Live-streaming bubble (appears while slow-path chunks arrive) */}
                    {isStreamingActive &&
                        streamingMessageId &&
                        streamingContent.trim().length > 0 && (
                        <CustomChatMessage
                            /* Prefix with `streaming-` so it never
                               collides with a real ThreadManager ID */
                            key={`streaming-${streamingMessageId}`}
                            message={{
                                id: `streaming-${streamingMessageId}`,
                                role: 'assistant',
                                c1Content: streamingContent,
                                timestamp: new Date(),
                            }}
                            isLast={true}
                            isStreaming={true}
                            hasVoiceOver={false}
                        >
                            <C1Component
                                c1Response={streamingContent}
                                isStreaming={true}
                                // No updateMessage handler here – buffer handled in VoiceBotClient
                                onAction={handleC1ComponentAction}
                            />
                        </CustomChatMessage>
                    )}

                    {/* Loading indicator */}
                    {(isEnhancing ?? false) || (isLoading ?? false) || (isVoiceLoading ?? false) ? (
                        <div className="loading-indicator">
                            <span className="loading-text">
                                {isEnhancing
                                    ? 'Generating enhanced display…'
                                    : (isLoading
                                        ? 'Assistant is thinking...'
                                        : 'Assistant is preparing to speak...')}
                            </span>
                            <span className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </div>
                    ) : null}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <CustomChatComposer
                    onSendMessage={handleSendMessage}
                    disabled={(isLoading ?? false) || (isVoiceLoading ?? false)}
                    isLoading={(isLoading ?? false) || (isVoiceLoading ?? false)}
                    onToggleVoiceConnection={onToggleVoiceConnection}
                    isVoiceConnected={isVoiceConnected}
                />
            </div>
        </ThemeProvider>
    );
};

export default GenerativeUIChat; 