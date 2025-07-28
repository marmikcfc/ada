import React, { CSSProperties } from 'react';
import { createTheme, themeToCssVars } from '../../theming/defaultTheme';

export interface FullscreenLayoutProps {
  // Layout slots
  left?: React.ReactNode;    // Thread list
  center?: React.ReactNode;  // Voice bot / Animated blob
  right?: React.ReactNode;   // Chat window
  // Configuration
  showLeft?: boolean;
  showCenter?: boolean;
  showRight?: boolean;
  leftWidth?: string | number;
  centerWidth?: string | number;
  rightWidth?: string | number;
  // Styling
  className?: string;
  style?: CSSProperties;
  theme?: any;
  backgroundColor?: string;
}

/**
 * Fullscreen 3-column layout component
 */
export const FullscreenLayout: React.FC<FullscreenLayoutProps> = ({
  left,
  center,
  right,
  showLeft = true,
  showCenter = true,
  showRight = true,
  leftWidth = '300px',
  centerWidth = '1fr',
  rightWidth = '400px',
  className = '',
  style,
  theme,
  backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}) => {
  const mergedTheme = createTheme(theme);
  const cssVars = themeToCssVars(mergedTheme);
  
  // Calculate grid template columns based on what's shown
  const getGridColumns = () => {
    const columns = [];
    if (showLeft && left) columns.push(leftWidth);
    if (showCenter && center) columns.push(centerWidth);
    if (showRight && right) columns.push(rightWidth);
    return columns.join(' ');
  };
  
  const containerStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridColumns(),
    height: '100vh',
    width: '100vw',
    background: backgroundColor,
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };
  
  const columnStyles: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
  };
  
  const leftColumnStyles: CSSProperties = {
    ...columnStyles,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
  };
  
  const centerColumnStyles: CSSProperties = {
    ...columnStyles,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: cssVars['--geui-spacing-lg'],
  };
  
  const rightColumnStyles: CSSProperties = {
    ...columnStyles,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
  };
  
  return (
    <div className={`geui-fullscreen-layout ${className}`} style={containerStyles}>
      {/* Left Column - Thread List */}
      {showLeft && left && (
        <div className="geui-fullscreen-left" style={leftColumnStyles}>
          {left}
        </div>
      )}
      
      {/* Center Column - Voice Bot */}
      {showCenter && center && (
        <div className="geui-fullscreen-center" style={centerColumnStyles}>
          {center}
        </div>
      )}
      
      {/* Right Column - Chat */}
      {showRight && right && (
        <div className="geui-fullscreen-right" style={rightColumnStyles}>
          {right}
        </div>
      )}
      
      <style>{`
        .geui-fullscreen-layout {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .geui-fullscreen-layout {
            grid-template-columns: auto 1fr 350px !important;
          }
        }
        
        @media (max-width: 768px) {
          .geui-fullscreen-layout {
            grid-template-columns: 1fr !important;
          }
          
          .geui-fullscreen-left,
          .geui-fullscreen-center {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};