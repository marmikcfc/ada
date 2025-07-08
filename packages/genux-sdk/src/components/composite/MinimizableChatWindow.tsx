import React, { useState } from 'react';
import { ChatWindow, ChatWindowProps } from './ChatWindow';

export interface MinimizableChatWindowProps extends Omit<ChatWindowProps, 'isMinimized' | 'onMinimize' | 'onRestore' | 'showMinimizeButton'> {
  /** Initial minimized state */
  initialMinimized?: boolean;
  /** Callback when minimize state changes */
  onMinimizeChange?: (isMinimized: boolean) => void;
  /** Height when minimized */
  minimizedHeight?: string | number;
  /** Whether to show the minimize button */
  showMinimizeButton?: boolean;
}

/**
 * ChatWindow with built-in minimize state management
 */
export const MinimizableChatWindow: React.FC<MinimizableChatWindowProps> = ({
  initialMinimized = false,
  onMinimizeChange,
  minimizedHeight = '60px',
  showMinimizeButton = true,
  ...chatWindowProps
}) => {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  
  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimizeChange?.(true);
  };
  
  const handleRestore = () => {
    setIsMinimized(false);
    onMinimizeChange?.(false);
  };
  
  return (
    <ChatWindow
      {...chatWindowProps}
      isMinimized={isMinimized}
      onMinimize={handleMinimize}
      onRestore={handleRestore}
      showMinimizeButton={showMinimizeButton}
      minimizedHeight={minimizedHeight}
    />
  );
};