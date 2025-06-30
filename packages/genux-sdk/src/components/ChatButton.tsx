import React, { CSSProperties } from 'react';
import { ChatButtonProps } from '../types';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';

/**
 * Extended props for the ChatButton component
 */
export interface ExtendedChatButtonProps extends ChatButtonProps {
  /** Custom position for the button (default: 'bottom-right') */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom size for the button (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Custom icon component */
  icon?: React.ReactNode;
  /** Additional CSS styles */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Button text (shown when size is 'lg') */
  text?: string;
}

/**
 * A floating chat button component that opens the chat interface
 */
const ChatButton: React.FC<ExtendedChatButtonProps> = ({
  onClick,
  isOpen,
  theme,
  position = 'bottom-right',
  size = 'md',
  icon,
  style,
  className = '',
  ariaLabel = 'Open chat',
  text = 'Chat with us',
}) => {
  // Merge custom theme with default theme
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  // Determine position styles
  const positionStyles: CSSProperties = {
    position: 'fixed',
    ...(position === 'bottom-right' && { bottom: '24px', right: '24px' }),
    ...(position === 'bottom-left' && { bottom: '24px', left: '24px' }),
    ...(position === 'top-right' && { top: '24px', right: '24px' }),
    ...(position === 'top-left' && { top: '24px', left: '24px' }),
  };
  
  // Determine size styles
  const sizeMap = {
    sm: { width: '40px', height: '40px', fontSize: '16px' },
    md: { width: '50px', height: '50px', fontSize: '20px' },
    lg: { width: 'auto', height: '50px', fontSize: '16px', padding: '0 20px' },
  };
  
  const sizeStyles = sizeMap[size];
  
  // Default chat icon if none provided
  const defaultIcon = (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
  
  // Combined styles
  const buttonStyles: CSSProperties = {
    ...positionStyles,
    ...sizeStyles,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cssVars['--genux-radius-full'],
    backgroundColor: cssVars['--genux-color-primary'],
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 9999,
    ...style,
  };
  
  // Hover and active styles applied via CSS
  const hoverActiveStyles = `
    .genux-chat-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .genux-chat-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
  `;
  
  return (
    <>
      <style>{hoverActiveStyles}</style>
      <button
        className={`genux-chat-button ${className}`}
        style={buttonStyles}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        type="button"
      >
        {size === 'lg' ? (
          <>
            {icon || defaultIcon}
            <span style={{ marginLeft: '8px' }}>{text}</span>
          </>
        ) : (
          icon || defaultIcon
        )}
      </button>
    </>
  );
};

export default ChatButton;
