import React, { CSSProperties } from 'react';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface VoiceBotProps {
  isConnected: boolean;
  isConnecting: boolean;
  onToggle: () => void;
  // Visual customization
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  theme?: any;
  // Custom content
  children?: React.ReactNode;
  showStatus?: boolean;
  statusText?: string;
}

/**
 * Reusable voice bot component with animation support
 */
export const VoiceBot: React.FC<VoiceBotProps> = ({
  isConnected,
  isConnecting,
  onToggle,
  size = 'medium',
  animated = true,
  className = '',
  style,
  theme,
  children,
  showStatus = true,
  statusText,
}) => {
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 80,
  };
  
  const buttonSize = sizeMap[size];
  
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: cssVars['--geui-spacing-sm'],
    ...style,
  };
  
  const buttonStyles: CSSProperties = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    backgroundColor: isConnected 
      ? '#dc2626' 
      : isConnecting 
        ? '#f59e0b' 
        : cssVars['--geui-color-primary'],
    color: '#ffffff',
    fontSize: `${buttonSize * 0.3}px`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  };
  
  const pulseStyles: CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    animation: animated && (isConnected || isConnecting) 
      ? 'voicePulse 2s infinite ease-out' 
      : 'none',
  };
  
  const statusStyles: CSSProperties = {
    fontSize: cssVars['--geui-font-size-sm'],
    color: cssVars['--geui-color-textSecondary'],
    fontWeight: '500',
  };
  
  const getStatusText = () => {
    if (statusText) return statusText;
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Voice active';
    return 'Start voice';
  };
  
  const iconScale = buttonSize * 0.4;
  
  return (
    <div className={`geui-voice-bot ${className}`} style={containerStyles}>
      <button
        onClick={onToggle}
        disabled={isConnecting}
        style={buttonStyles}
        className={`voice-bot-button ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
        title={isConnected ? 'Stop voice' : 'Start voice'}
      >
        {/* Pulse animation */}
        {animated && <div style={pulseStyles} />}
        
        {/* Icon or custom content */}
        {children || (
          <svg 
            width={iconScale} 
            height={iconScale} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {isConnected ? (
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
      
      {showStatus && (
        <span style={statusStyles}>
          {getStatusText()}
        </span>
      )}
      
      <style>{`
        @keyframes voicePulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        
        .voice-bot-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .voice-bot-button:active {
          transform: scale(0.95);
        }
        
        .voice-bot-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};