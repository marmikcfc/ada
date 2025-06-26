import React, { useState, CSSProperties } from 'react';
import { createTheme, themeToCssVars } from '../theming/defaultTheme';

/**
 * Props interface for the BubbleWidget component
 */
export interface BubbleWidgetProps {
  /** Handler for when the chat button is clicked */
  onChatClick: () => void;
  /** Handler for when the mic button is clicked */
  onMicToggle: () => void;
  /** Whether the mic is currently active */
  isMicActive: boolean;
  /** Custom theme */
  theme?: any;
  /** Additional CSS styles */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A floating bubble widget that reveals chat and mic controls on hover
 * 
 * Positioned at right-center of the viewport, attached to the right border.
 * On hover, shows vertical controls above and below the main bubble.
 */
const BubbleWidget: React.FC<BubbleWidgetProps> = ({
  onChatClick,
  onMicToggle,
  isMicActive,
  theme,
  style,
  className = '',
}) => {
  // State to track hover
  const [isHovered, setIsHovered] = useState(false);
  
  // Merge custom theme with default theme
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  // Base styles for the bubble container
  const containerStyles: CSSProperties = {
    position: 'fixed',
    top: '50%',
    right: '0px', // Attach to right border
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 9999,
    ...style,
  };
  
  // Styles for the main bubble
  const bubbleStyles: CSSProperties = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: cssVars['--myna-color-primary'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    color: '#ffffff',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 2,
    // Add slight border radius only on the left side for edge attachment
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
    order: 2, // Middle position
  };
  
  // Styles for the control buttons
  const controlButtonStyles: CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: cssVars['--myna-color-surface'],
    color: cssVars['--myna-color-text'],
    transition: 'transform 0.3s ease, opacity 0.3s ease, background-color 0.2s ease',
    border: 'none',
    padding: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    // Add slight border radius only on the left side for edge attachment
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
  };
  
  // Top control (Chat) styles
  const topControlStyles: CSSProperties = {
    ...controlButtonStyles,
    transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    marginBottom: '8px',
    order: 1, // Top position
  };
  
  // Bottom control (Mic) styles
  const bottomControlStyles: CSSProperties = {
    ...controlButtonStyles,
    transform: isHovered ? 'translateY(0)' : 'translateY(-100%)',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    marginTop: '8px',
    order: 3, // Bottom position
    backgroundColor: isMicActive ? cssVars['--myna-color-primary'] : cssVars['--myna-color-surface'],
    color: isMicActive ? '#ffffff' : cssVars['--myna-color-text'],
  };
  
  // Hover styles for the control buttons
  const hoverStyles = `
    .control-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .mic-active:hover {
      background-color: ${cssVars['--myna-color-primary']} !important;
      opacity: 0.9;
    }
  `;
  
  // Chat icon SVG
  const chatIcon = (
    <svg 
      width="20" 
      height="20" 
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
  
  // Mic icon SVG
  const micIcon = (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  );
  
  // Main bubble icon - Using a more distinctive assistant/help icon
  const bubbleIcon = (
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
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
    </svg>
  );
  
  return (
    <>
      <style>{hoverStyles}</style>
      <div 
        className={`myna-bubble-widget ${className}`}
        style={containerStyles}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top control (Chat) */}
        <button 
          className="control-button"
          style={topControlStyles}
          onClick={onChatClick}
          aria-label="Open chat"
        >
          {chatIcon}
        </button>
        
        {/* Main bubble */}
        <div 
          className="bubble"
          style={bubbleStyles}
          onClick={onChatClick}
          aria-label="Chat assistant"
        >
          {bubbleIcon}
        </div>
        
        {/* Bottom control (Mic) */}
        <button 
          className={`control-button ${isMicActive ? 'mic-active' : ''}`}
          style={bottomControlStyles}
          onClick={onMicToggle}
          aria-label={isMicActive ? "Stop recording" : "Start recording"}
        >
          {micIcon}
        </button>
      </div>
    </>
  );
};

export default BubbleWidget;
