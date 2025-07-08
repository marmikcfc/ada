import React, { useState } from 'react';
import { BubbleWidget, createTheme } from '../src';

/**
 * Example: Floating Chat Widget using BubbleWidget
 * 
 * This example demonstrates how to use the BubbleWidget component to create a 
 * floating chat widget that can be embedded in any website. The widget appears 
 * as a circular button arrangement in the right-center of the page and provides
 * chat, voice, and fullscreen capabilities.
 */
const FloatingWidgetExample: React.FC = () => {
  // State management for the widget
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Optional: Create a custom theme
  const customTheme = createTheme({
    colors: {
      primary: '#6366f1', // Indigo-500
      secondary: '#a855f7', // Purple-500
    },
    borderRadius: {
      lg: '1rem', // Larger rounded corners
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  });

  // Handle chat button click
  const handleChatClick = () => {
    setIsChatOpen(!isChatOpen);
    setIsFullScreenOpen(false);
    setHasInteracted(true);
    console.log('Chat toggled:', !isChatOpen);
  };

  // Handle mic toggle
  const handleMicToggle = () => {
    setIsMicActive(!isMicActive);
    setHasInteracted(true);
    console.log('Mic toggled:', !isMicActive);
    // Here you would integrate with your voice recognition system
  };

  // Handle fullscreen click
  const handleFullScreenClick = () => {
    setIsFullScreenOpen(!isFullScreenOpen);
    setIsChatOpen(false);
    setHasInteracted(true);
    console.log('Fullscreen toggled:', !isFullScreenOpen);
  };

  return (
    <div style={{ height: '100vh', position: 'relative', backgroundColor: '#f5f5f5' }}>
      {/* Main page content */}
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>BubbleWidget Example</h1>
        <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '20px' }}>
          This page demonstrates the BubbleWidget component. Look for the floating widget
          on the right side of the screen. Hover over it to see the chat, mic, and fullscreen
          buttons appear in a circular arrangement.
        </p>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '15px' }}>Features:</h2>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li><strong>Chat Button:</strong> Opens/closes the chat interface</li>
            <li><strong>Mic Button:</strong> Toggles voice recording (visual feedback when active)</li>
            <li><strong>Fullscreen Button:</strong> Opens fullscreen mode</li>
            <li><strong>Hover Animation:</strong> Buttons appear with smooth transitions</li>
            <li><strong>Right-Center Positioning:</strong> Attached to the right edge of the viewport</li>
          </ul>
        </div>

        {/* Status indicators */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Widget Status:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Chat:</strong> {isChatOpen ? '🟢 Open' : '🔴 Closed'}
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Mic:</strong> {isMicActive ? '🎤 Active' : '🔇 Inactive'}
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Fullscreen:</strong> {isFullScreenOpen ? '📺 Open' : '📱 Closed'}
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Interacted:</strong> {hasInteracted ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        </div>
      </div>

      {/* BubbleWidget - Main floating widget */}
      <BubbleWidget
        onChatClick={handleChatClick}
        onMicToggle={handleMicToggle}
        isMicActive={isMicActive}
        onFullScreenClick={handleFullScreenClick}
        allowFullScreen={true}
        theme={customTheme}
      />

      {/* Chat Window (when open) */}
      {isChatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '16px',
            backgroundColor: '#6366f1',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>AI Assistant</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Chat content */}
          <div style={{
            flex: 1,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <p>Chat interface would be implemented here.</p>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>
                This is a placeholder demonstrating the BubbleWidget integration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen overlay (when open) */}
      {isFullScreenOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 20000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌟</div>
            <h2 style={{ marginBottom: '10px' }}>Fullscreen Mode</h2>
            <p style={{ marginBottom: '30px', opacity: 0.8 }}>
              Fullscreen chat interface would be implemented here.
            </p>
            <button
              onClick={() => setIsFullScreenOpen(false)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Close Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Welcome message for first-time visitors */}
      {!hasInteracted && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '80px',
          padding: '16px 20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxWidth: '280px',
          zIndex: 9999,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', marginRight: '8px' }}>👋</span>
            <strong style={{ fontSize: '14px', color: '#333' }}>Try the widget!</strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
            Hover over the floating button to see the menu, then try the chat, mic, or fullscreen options.
          </p>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingWidgetExample;