import React, { useState } from 'react';
import { Genux, createTheme } from '../src';

/**
 * Example: Floating Chat Widget
 * 
 * This example demonstrates how to use the Genux SDK to create a floating
 * chat widget that can be embedded in any website. The widget appears as
 * a button in the bottom-right corner of the page and expands into a
 * full chat interface when clicked.
 */
const FloatingWidgetExample: React.FC = () => {
  // Optional: Track if the widget has been opened at least once
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

  // Optional: Track when the chat is opened
  const handleChatOpen = () => {
    setHasInteracted(true);
    console.log('Chat opened');
    // You could trigger analytics events here
  };

  return (
    <div>
      {/* 
        The Genux component with minimal required props:
        - webrtcURL: Endpoint for WebRTC negotiation
        - websocketURL: Endpoint for WebSocket communication
        
        With bubbleEnabled=true (default), it renders as a floating button
        that expands into a chat window when clicked.
      */}
      <Genux
        webrtcURL="https://your-backend.com/api/offer"
        websocketURL="wss://your-backend.com/ws/messages"
        bubbleEnabled={true}
        options={{
          // Custom theme
          theme: customTheme,
          
          // Agent information
          agentName: "Customer Support",
          logoUrl: "https://your-company.com/logo.png",
          
          // Optional: Configure MCP endpoints for additional tools
          mcpEndpoints: [
            {
              name: "knowledge-base",
              url: "https://your-backend.com/mcp/kb",
            }
          ],
          
          // Optional: Override visualization provider
          visualization: {
            provider: 'default', // 'default', 'custom', or 'none'
          },
        }}
        // Optional: Event handlers can be attached via props
        onOpen={handleChatOpen}
      />

      {/* Optional: Show a welcome message when the user hasn't interacted yet */}
      {!hasInteracted && (
        <div 
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            padding: '12px 20px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            maxWidth: '250px',
            animation: 'fadeIn 0.5s ease-out',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px' }}>
            👋 Need help? Chat with our AI assistant!
          </p>
        </div>
      )}

      {/* Optional: Add global styles for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FloatingWidgetExample;
