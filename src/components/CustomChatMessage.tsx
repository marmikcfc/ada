import React from 'react';
import './CustomChatMessage.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content?: string;
    c1Content?: string;
    timestamp: Date;
}

interface CustomChatMessageProps {
    message: Message;
    isLast: boolean;
    isStreaming: boolean;
    children?: React.ReactNode; // For C1Component
}

const CustomChatMessage: React.FC<CustomChatMessageProps> = ({
    message,
    isLast,
    isStreaming,
    children
}) => {
    const isUser = message.role === 'user';

    return (
        <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
            <div className="message-avatar">
                {isUser ? (
                    <div className="user-avatar">U</div>
                ) : (
                    <div className="assistant-avatar">AI</div>
                )}
            </div>
            <div className="message-content">
                {/* Render regular text content */}
                {message.content && (
                    <div className="message-text">
                        {message.content}
                    </div>
                )}
                
                {/* Render C1Component content (passed as children) */}
                {children && (
                    <div className="message-c1-content">
                        {children}
                    </div>
                )}
                
                {/* Show streaming indicator if this is the last message and it's streaming */}
                {isLast && isStreaming && !message.content && !children && (
                    <div className="streaming-indicator">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                )}
                
                <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default CustomChatMessage; 