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
    timestamp: Date;
}

interface GenerativeUIChatProps {
    threadManager: ReturnType<typeof useThreadManager>;
    agentName?: string;
    logoUrl?: string;
    onSendMessage?: (message: string) => void;
    // Callback for C1Component actions
    onC1Action?: (action: any) => void;
    // Function to search for images (required by C1Component)
    searchImage?: (query: string) => Promise<{ url: string; thumbnailUrl?: string }>;
    
    // Props for the new voice connection button in composer
    onToggleVoiceConnection?: () => void;
    isVoiceConnected?: boolean;
    isVoiceConnectionLoading?: boolean; // To show a loading state on the button
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
    isVoiceConnectionLoading
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

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
                // Check if this is a C1Component message
                const isC1Message = msg.message?.[0]?.type === 'template' && 
                                   msg.message?.[0]?.name === 'c1';
                
                return {
                    id: msg.id,
                    role: msg.role,
                    content: isC1Message ? undefined : (msg.content || msg.message),
                    c1Content: isC1Message ? msg.message[0].templateProps.content : undefined,
                    timestamp: new Date(msg.createdAt || Date.now()) // Use createdAt if available
                };
            });
            setMessages(convertedMessages);
            setIsLoading(threadManager.isRunning || false);
        }
    }, [threadManager?.messages, threadManager?.isRunning]);

    const handleSendMessage = useCallback((text: string) => {
        if (!text.trim()) return;
        const userMessagePayload = {
            role: 'user' as const,
            type: 'prompt' as const,
            message: text
        };
        if (onSendMessage) {
            onSendMessage(text);
             // Optionally, update UI immediately or wait for parent
            const immediateUserMessage: Message = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: text,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, immediateUserMessage]);
            setIsLoading(true);
        } else if (threadManager?.processMessage) {
            threadManager.processMessage(userMessagePayload);
            // threadManager should update messages, triggering useEffect
        }
    }, [onSendMessage, threadManager]);

    const handleC1ComponentAction = useCallback((action: any) => {
        if (onC1Action) {
            onC1Action(action);
        }
        if (action.llmFriendlyMessage) {
             // Process C1 action as a new user message via threadManager or callback
            const userMessagePayload = {
                role: 'user' as const,
                type: 'prompt' as const,
                message: action.llmFriendlyMessage
            };
            if (threadManager?.processMessage) {
                threadManager.processMessage(userMessagePayload);
            }
        }
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
                {/* Chat Header */}
                <div className="chat-header">
                    {logoUrl && <img src={logoUrl} alt={agentName} className="agent-logo" />}
                    <h2 className="agent-name">{agentName}</h2>
                </div>

                {/* Messages Container */}
                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((message, index) => (
                        <CustomChatMessage
                            key={message.id}
                            message={message}
                            isLast={index === messages.length - 1}
                            isStreaming={isLoading && message.role === 'assistant' && index === messages.length -1}
                        >
                            {/* Render C1Component for messages that have c1Content */}
                            {message.c1Content && (
                                <C1Component
                                    c1Response={message.c1Content}
                                    isStreaming={isLoading && message.role === 'assistant' && index === messages.length -1}
                                    updateMessage={(content: string) => handleC1UpdateMessage(content, message.id)}
                                    onAction={handleC1ComponentAction}
                                />
                            )}
                        </CustomChatMessage>
                    ))}
                    
                    {/* Loading indicator */}
                    {isLoading && messages[messages.length -1]?.role === 'user' && (
                        <div className="loading-indicator">
                            <span className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <CustomChatComposer
                    onSendMessage={handleSendMessage}
                    disabled={isLoading || isVoiceConnectionLoading}
                    onToggleVoiceConnection={onToggleVoiceConnection}
                    isVoiceConnected={isVoiceConnected}
                />
            </div>
        </ThemeProvider>
    );
};

export default GenerativeUIChat; 