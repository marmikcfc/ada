import React, { useState, useRef, KeyboardEvent, CSSProperties } from 'react';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  theme?: any;
  // Voice button props
  showVoiceButton?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  voiceButtonIcon?: React.ReactNode;
}

/**
 * Reusable message composer component with optional voice button
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  disabled = false,
  loading = false,
  placeholder = 'Type your message...',
  className = '',
  style,
  theme,
  showVoiceButton = false,
  onVoiceToggle,
  isVoiceActive = false,
  voiceButtonIcon,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);

  const handleSend = () => {
    if (message.trim() && !disabled && !loading && !isVoiceActive) {
      onSendMessage(message.trim());
      setMessage('');
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const containerStyles: CSSProperties = {
    borderTop: `1px solid ${cssVars['--geui-color-border']}`,
    padding: cssVars['--geui-spacing-md'],
    backgroundColor: cssVars['--geui-color-surface'],
    ...style,
  };

  const innerContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: cssVars['--geui-color-background'],
    borderRadius: cssVars['--geui-radius-lg'],
    border: `1px solid ${cssVars['--geui-color-border']}`,
    overflow: 'hidden',
  };

  const textareaStyles: CSSProperties = {
    flex: 1,
    border: 'none',
    padding: `${cssVars['--geui-spacing-md']} ${cssVars['--geui-spacing-lg']} ${cssVars['--geui-spacing-md']} ${cssVars['--geui-spacing-md']}`,
    resize: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: cssVars['--geui-font-size-md'],
    fontFamily: cssVars['--geui-font-family'],
    color: cssVars['--geui-color-text'],
    minHeight: '24px',
    maxHeight: '120px',
    lineHeight: '1.5',
  };

  const buttonStyles: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: cssVars['--geui-spacing-sm'],
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease',
  };

  const isDisabled = disabled || loading || isVoiceActive;
  const canSend = message.trim() && !isDisabled;

  return (
    <div className={`geui-message-composer ${className}`} style={containerStyles}>
      <div style={innerContainerStyles}>
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={1}
          style={textareaStyles}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', marginRight: cssVars['--geui-spacing-sm'] }}>
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            title="Send"
            style={{
              ...buttonStyles,
              opacity: canSend ? 1 : 0.5,
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? (
              <span style={{ fontSize: cssVars['--geui-font-size-sm'] }}>...</span>
            ) : (
              <svg 
                width="28" 
                height="28" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={canSend ? cssVars['--geui-color-primary'] : '#adb5bd'}
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="16 12 12 8 8 12"></polyline>
                <line x1="12" y1="16" x2="12" y2="8"></line>
              </svg>
            )}
          </button>
          
          {/* Voice Button */}
          {showVoiceButton && onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              disabled={disabled || loading}
              title={isVoiceActive ? 'Stop voice' : 'Start voice'}
              style={{
                ...buttonStyles,
                marginLeft: cssVars['--geui-spacing-sm'],
                opacity: disabled || loading ? 0.5 : 1,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {voiceButtonIcon || (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={isVoiceActive ? '#dc2626' : '#28a745'}
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  {isVoiceActive ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </>
                  )}
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};