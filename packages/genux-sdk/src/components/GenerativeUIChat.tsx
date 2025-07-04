import React, { useRef, useEffect, useCallback } from 'react';
import { useThreadManager } from '@thesysai/genui-sdk';
import { C1Component } from '@thesysai/genui-sdk';
import { ThemeProvider } from '@crayonai/react-ui';
import CustomChatComposer from './CustomChatComposer';
import CustomChatMessage from './CustomChatMessage';
import { Message, AssistantMessage } from '../types';
import './GenerativeUIChat.css';

interface GenerativeUIChatProps {
    threadManager: ReturnType<typeof useThreadManager>;
    /** List of chat messages provided by GenuxClient */
    messages?: Message[];
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
    isStreamingActive = false,
    messages = []
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    console.log(agentName, logoUrl, searchImage, isVoiceConnectionLoading);
    
    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreamingActive, streamingContent]);

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
    }, [onC1Action, threadManager]);

    return (
        <ThemeProvider theme={{}}>
            <div className="generative-ui-chat">
                {/* Messages Container */}
                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((message, index) => {
                        // Type guard to check if message is AssistantMessage
                        const isAssistantMessage = message.role === 'assistant';
                        const assistantMessage = isAssistantMessage ? message as AssistantMessage : null;
                        
                        return (
                            <CustomChatMessage
                                key={message.id}
                                message={message}
                                isLast={index === messages.length - 1}
                                isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length - 1}
                                hasVoiceOver={Boolean(assistantMessage?.hasVoiceOver)}
                            >
                                {assistantMessage?.c1Content && (
                                    <C1Component
                                        c1Response={assistantMessage.c1Content}
                                        isStreaming={(isLoading ?? false) && message.role === 'assistant' && index === messages.length - 1}
                                        updateMessage={(content: string) => {
                                            console.log('Message update:', content, message.id);
                                        }}
                                        onAction={handleC1ComponentAction}
                                    />
                                )}
                            </CustomChatMessage>
                        );
                    })}
                    
                    {/* Live-streaming bubble (appears while slow-path chunks arrive) */}
                    {isStreamingActive &&
                        streamingMessageId &&
                        streamingContent.trim().length > 0 && (
                        <CustomChatMessage
                            key={`streaming-${streamingMessageId}`}
                            message={{
                                id: `streaming-${streamingMessageId}`,
                                role: 'assistant',
                                c1Content: streamingContent,
                                timestamp: new Date(),
                            } as any}
                            isLast={true}
                            isStreaming={true}
                            hasVoiceOver={false}
                        >
                            <C1Component
                                c1Response={streamingContent}
                                isStreaming={true}
                                updateMessage={() => {}}
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