import React, { useState, useRef, KeyboardEvent } from 'react';
import './CustomChatComposer.css';
import { Mic, MicOff, ArrowUpCircle } from 'lucide-react';

interface CustomChatComposerProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    onStartVoiceChat?: () => void;
    onStopVoiceChat?: () => void;
    isVoiceActive?: boolean;
    onToggleVoiceConnection?: () => void;
    isVoiceConnected?: boolean;
}

const CustomChatComposer: React.FC<CustomChatComposerProps> = ({
    onSendMessage,
    disabled = false,
    onStartVoiceChat,
    onStopVoiceChat,
    isVoiceActive = false,
    onToggleVoiceConnection,
    isVoiceConnected = false
}) => {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleToggleVoiceConnectionClick = () => {
        if (onToggleVoiceConnection) {
            onToggleVoiceConnection();
        }
    };

    return (
        <div className="chat-composer">
            <div className="composer-container">
                <textarea
                    ref={textareaRef}
                    className="composer-input"
                    placeholder="Type your message..."
                    value={message}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isVoiceActive}
                    rows={1}
                />
                <div className="composer-actions">
                    {/* Send Button */}
                    <button
                        className={`send-button${disabled || !message.trim() || isVoiceActive ? ' disabled' : ''}`}
                        onClick={handleSend}
                        disabled={disabled || !message.trim() || isVoiceActive}
                        title="Send"
                    >
                        <ArrowUpCircle 
                            size={28}
                            strokeWidth={2.5}
                            color={disabled || !message.trim() || isVoiceActive ? '#adb5bd' : '#2563eb'}
                            style={{ filter: disabled || !message.trim() || isVoiceActive ? 'none' : 'drop-shadow(0 2px 8px rgba(37,99,235,0.15))', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        />
                    </button>
                    {/* Voice Connect Button (now to the right of send) */}
                    {onToggleVoiceConnection && (
                        <button
                            className={`connect-voice-button ${isVoiceConnected ? 'connected' : ''}`}
                            onClick={handleToggleVoiceConnectionClick}
                            disabled={disabled}
                            title={isVoiceConnected ? 'Disconnect Voice' : 'Connect Voice'}
                        >
                            {isVoiceConnected ? (
                                <MicOff style={{ color: '#dc2626' }} />
                            ) : (
                                <Mic style={{ color: '#28a745' }} />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomChatComposer; 