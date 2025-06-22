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
    /** Flag indicating this assistant message had extra voice-over that is **not**
     *  shown in the bubble.  When true we show a small speaker glyph so the
     *  user knows there was additional audio context. */
    hasVoiceOver?: boolean;
}

const CustomChatMessage: React.FC<CustomChatMessageProps> = ({
    message,
    isLast,
    isStreaming,
    children,
    hasVoiceOver = false
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
                    {/* Voice-over indicator (assistant only) */}
                    {hasVoiceOver && !isUser && (
                        <span
                            className="voiceover-indicator"
                            title="Additional audio (voice-over) was played"
                            style={{ marginLeft: 4 }}
                        >
                            🔈
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomChatMessage; 