import React, { useState, useRef, KeyboardEvent, CSSProperties } from 'react';
import { ChatComposerProps, ComponentOverrides, VoiceButtonProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';

/**
 * Extended props for the CustomChatComposer component
 */
export interface ExtendedChatComposerProps extends ChatComposerProps {
  /** Additional CSS styles */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
  /** Whether voice is currently active (recording) */
  isVoiceActive?: boolean;
  /** Handler for starting voice chat */
  onStartVoiceChat?: () => void;
  /** Handler for stopping voice chat */
  onStopVoiceChat?: () => void;
  /** Component overrides for sub-components */
  componentOverrides?: Partial<ComponentOverrides>;
}

/**
 * A component for composing and sending chat messages with voice capabilities
 */
const CustomChatComposer: React.FC<ExtendedChatComposerProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false,
  onToggleVoiceConnection,
  isVoiceConnected = false,
  style,
  className = '',
  isVoiceActive = false,
  onStartVoiceChat,
  onStopVoiceChat,
  componentOverrides,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use default theme (could be overridden via context in the future)
  const theme = createTheme();
  const cssVars = themeToCssVars(theme);

  const handleSend = () => {
    if (message.trim() && !disabled && !isLoading) {
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

  // Container styles
  const composerContainerStyles: CSSProperties = {
    borderTop: `1px solid ${cssVars['--myna-color-border']}`,
    padding: cssVars['--myna-spacing-md'],
    backgroundColor: cssVars['--myna-color-surface'],
    ...style,
  };

  // Inner container styles
  const innerContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: cssVars['--myna-color-background'],
    borderRadius: cssVars['--myna-radius-lg'],
    border: `1px solid ${cssVars['--myna-color-border']}`,
    overflow: 'hidden',
  };

  // Textarea styles
  const textareaStyles: CSSProperties = {
    flex: 1,
    border: 'none',
    padding: `${cssVars['--myna-spacing-md']} ${cssVars['--myna-spacing-lg']} ${cssVars['--myna-spacing-md']} ${cssVars['--myna-spacing-md']}`,
    resize: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: cssVars['--myna-font-size-md'],
    fontFamily: cssVars['--myna-font-family'],
    color: cssVars['--myna-color-text'],
    minHeight: '24px',
    maxHeight: '120px',
    lineHeight: '1.5',
  };

  // Actions container styles
  const actionsContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginLeft: cssVars['--myna-spacing-sm'],
    marginRight: cssVars['--myna-spacing-sm'],
  };

  // Send button styles
  const sendButtonStyles: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: cssVars['--myna-spacing-sm'],
    cursor: (disabled || !message.trim() || isVoiceActive || isLoading) ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: (disabled || !message.trim() || isVoiceActive || isLoading) ? 0.5 : 1,
    transition: 'opacity 0.2s ease',
  };

  // Voice button styles
  const voiceButtonStyles: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: cssVars['--myna-spacing-sm'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: cssVars['--myna-spacing-sm'],
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.2s ease',
  };

  // Default VoiceButton component
  const DefaultVoiceButton: React.FC<VoiceButtonProps> = ({ onClick, isConnected, isConnecting }) => (
  <button
    className={`myna-connect-voice-button ${isConnected ? 'myna-connected' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={isConnected ? 'Disconnect Voice' : 'Connect Voice'}
    style={voiceButtonStyles}
  >
    {isConnected ? (
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#dc2626" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    ) : (
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#28a745" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    )}
  </button>
);

// Component resolution - use override if provided, otherwise use default
const VoiceButtonComponent = componentOverrides?.VoiceButton || DefaultVoiceButton;

  return (
    <div className={`myna-chat-composer ${className}`} style={composerContainerStyles}>
      <div className="myna-composer-container" style={innerContainerStyles}>
        <textarea
          ref={textareaRef}
          className="myna-composer-input"
          placeholder="Type your message..."
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isVoiceActive || isLoading}
          rows={1}
          style={textareaStyles}
        />
        <div className="myna-composer-actions" style={actionsContainerStyles}>
          {/* Send Button */}
          <button
            className={`myna-send-button ${(disabled || !message.trim() || isVoiceActive || isLoading) ? 'myna-disabled' : ''}`}
            onClick={handleSend}
            disabled={disabled || !message.trim() || isVoiceActive || isLoading}
            title="Send"
            style={sendButtonStyles}
          >
            {isLoading ? (
              'Loading...'
            ) : (
              <svg 
                width="28" 
                height="28" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={disabled || !message.trim() || isVoiceActive ? '#adb5bd' : cssVars['--myna-color-primary']}
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ 
                  filter: disabled || !message.trim() || isVoiceActive ? 'none' : 'drop-shadow(0 2px 8px rgba(37,99,235,0.15))', 
                  transition: 'transform 0.15s, box-shadow 0.15s' 
                }}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="16 12 12 8 8 12"></polyline>
                <line x1="12" y1="16" x2="12" y2="8"></line>
              </svg>
            )}
          </button>
          {/* Voice Connect Button */}
          {onToggleVoiceConnection && (
            <VoiceButtonComponent
              onClick={handleToggleVoiceConnectionClick}
              isConnected={isVoiceConnected}
              isConnecting={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomChatComposer;
