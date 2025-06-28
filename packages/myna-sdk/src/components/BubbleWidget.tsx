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
  /** Handler for when the fullscreen button is clicked */
  onFullScreenClick?: () => void;
  /** Whether to show the fullscreen button */
  allowFullScreen?: boolean;
  /** Custom theme */
  theme?: any;
  /** Additional CSS styles */
  style?: CSSProperties;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A floating bubble widget that reveals chat and mic controls on hover in a circular pattern
 * 
 * Positioned at right-center of the viewport, attached to the right border.
 * On hover, shows controls arranged in a circular pattern around the main bubble.
 */
const BubbleWidget: React.FC<BubbleWidgetProps> = ({
  onChatClick,
  onMicToggle,
  isMicActive,
  onFullScreenClick,
  allowFullScreen = false,
  theme,
  style,
  className = '',
}) => {
  // State to track hover
  const [isHovered, setIsHovered] = useState(false);
  
  // Merge custom theme with default theme
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  // Base styles for the bubble container - now positioned relatively for circular layout
  const containerStyles: CSSProperties = {
    position: 'fixed',
    top: '50%',
    right: '0px', // Even further from edge to ensure space for all buttons
    transform: 'translateY(-50%)',
    width: '100px', // Compact container
    height: '100px', // Compact container
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    zIndex: 9999,
    ...style,
  };
  
  // Styles for the main bubble
  const bubbleStyles: CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: '0px', // Attach to right edge of container
    transform: 'translateY(-50%)',
    width: '50px',
    height: '50px',
    borderRadius: '50%', // Full circular for better appearance
    backgroundColor: cssVars['--myna-color-primary'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    color: '#ffffff',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 2,
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
    order: 2, // Middle position
  };
  
  // Base styles for the control buttons
  const controlButtonStyles: CSSProperties = {
    position: 'absolute',
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
    padding: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1,
  };
  
  // Chat button positioned above the main bubble
  const chatControlStyles: CSSProperties = {
    ...controlButtonStyles,
    top: '5px', // Close to top of container
    right: '5px', // Aligned with bubble
    transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.8)',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    marginTop: '-25px',
    order: 1,
  };
  
  // Fullscreen button positioned to the left of the main bubble
  const fullscreenControlStyles: CSSProperties = {
    ...controlButtonStyles,
    top: '50%',
    right: '55px', // Position to left of bubble within container bounds
    transform: isHovered 
      ? 'translateY(-50%) translateX(0) scale(1)' 
      : 'translateY(-50%) translateX(10px) scale(0.8)',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    display: allowFullScreen ? 'flex' : 'none',
  };
  
  // Mic button positioned below the main bubble
  const micControlStyles: CSSProperties = {
    ...controlButtonStyles,
    bottom: '5px', // Close to bottom of container
    right: '5px', // Aligned with bubble
    transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.8)',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    backgroundColor: isMicActive ? cssVars['--myna-color-primary'] : cssVars['--myna-color-surface'],
    color: isMicActive ? '#ffffff' : cssVars['--myna-color-text'],
    marginBottom: '-25px',
  };
  
  // Hover styles for the control buttons
  const hoverStyles = `
    .control-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
      transform: scale(1.1) !important;
    }
    
    .bubble:hover {
      transform: translateY(-50%) scale(1.05) !important;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .mic-active:hover {
      background-color: ${cssVars['--myna-color-primary']} !important;
      opacity: 0.9;
    }
    
    .fullscreen-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
      transform: translateY(-50%) translateX(0) scale(1.1) !important;
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
  
  // Fullscreen icon SVG
  const fullscreenIcon = (
    <svg 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
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
        {/* Chat button - positioned above the main bubble */}
        <button 
          className="control-button"
          style={chatControlStyles}
          onClick={onChatClick}
          aria-label="Open chat"
        >
          {chatIcon}
        </button>
        
        {/* Fullscreen button - positioned to the left of the main bubble */}
        {allowFullScreen && onFullScreenClick && (
          <button 
            className="control-button fullscreen-button"
            style={fullscreenControlStyles}
            onClick={onFullScreenClick}
            aria-label="Open fullscreen"
          >
            {fullscreenIcon}
          </button>
        )}
        
        {/* Main bubble - positioned at the right edge */}
        <div 
          className="bubble"
          style={bubbleStyles}
          onClick={onChatClick}
          aria-label="Chat assistant"
        >
          {bubbleIcon}
        </div>
        
        {/* Mic button - positioned below the main bubble */}
        <button 
          className={`control-button ${isMicActive ? 'mic-active' : ''}`}
          style={micControlStyles}
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
