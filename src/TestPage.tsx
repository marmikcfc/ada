import React, { useState } from 'react';
import './App.css';
// Import directly from the source files until the package is properly built
import Myna from "../packages/myna-sdk/src/components/Myna";

/**
 * TestPage component to demonstrate both modes of the Myna SDK:
 * - bubbleEnabled=true: Floating chat widget with slide-in panel
 * - bubbleEnabled=false: Full-screen chat interface
 */
const TestPage: React.FC = () => {
  // State to toggle between modes
  const [bubbleEnabled, setBubbleEnabled] = useState(true);
  
  // WebSocket URL construction (same as in App.tsx)
  const getWebSocketURL = (): string => {
    const { protocol, hostname } = window.location;
    const wsProtocol = protocol === "https:" ? "wss" : "ws";
    return `${wsProtocol}://${hostname}:8000/ws/messages`;
  };

  return (
    <div className="test-page">
      {/* Header with mode toggle - Fixed positioning with high z-index */}
      <header style={headerStyle}>
        <h1>Myna SDK Test Page</h1>
        <div style={toggleContainerStyle}>
          <span style={{ marginRight: '12px' }}>
            Mode: <strong>{bubbleEnabled ? 'Floating Widget' : 'Full Screen'}</strong>
          </span>
          <label className="toggle-switch" style={toggleSwitchStyle}>
            <input
              type="checkbox"
              checked={bubbleEnabled}
              onChange={() => setBubbleEnabled(!bubbleEnabled)}
            />
            <span className="toggle-slider" style={toggleSliderStyle}></span>
          </label>
        </div>
      </header>

      {/* Demo content area */}
      <div style={contentStyle}>
        <h2>Demo Content</h2>
        <p>
          This page demonstrates the Myna SDK in {bubbleEnabled ? 'floating widget' : 'full screen'} mode.
          {bubbleEnabled && ' Look for the chat button in the bottom-right corner.'}
        </p>
        <div style={cardContainerStyle}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={cardStyle}>
              <h3>Sample Card {i + 1}</h3>
              <p>This is placeholder content to demonstrate how the chat interface interacts with page content.</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px' }}>
          <h3>Current Settings:</h3>
          <ul>
            <li><strong>bubbleEnabled:</strong> {bubbleEnabled.toString()}</li>
            <li><strong>webrtcURL:</strong> /api/offer</li>
            <li><strong>websocketURL:</strong> {getWebSocketURL()}</li>
          </ul>
        </div>
      </div>

      {/* Myna component */}
      <Myna
        webrtcURL="/api/offer"
        websocketURL={getWebSocketURL()}
        bubbleEnabled={bubbleEnabled}
        showThreadManager={true}
        options={{
          agentName: "Myna Test Assistant",
          logoUrl: "/favicon.ico",
        }}
      />

      {/* Styles */}
      <style>{`
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
          background-color: #2563eb;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }
      `}</style>
    </div>
  );
};

// Styles defined here to maintain consistency
const headerStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  height: '64px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 15000, // Higher than Myna components (ChatWindow: 10000, BubbleWidget: 9999)
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const toggleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
};

const toggleSwitchStyle = {
  position: 'relative' as const,
  display: 'inline-block',
  width: '60px',
  height: '34px',
};

const toggleSliderStyle = {
  position: 'absolute' as const,
  cursor: 'pointer',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#ccc',
  transition: '.4s',
  borderRadius: '34px',
};

const contentStyle = {
  marginTop: '80px', // Account for fixed header height + spacing
  padding: '24px',
  minHeight: 'calc(100vh - 80px)',
};

const cardContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
  marginTop: '24px',
};

const cardStyle = {
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
};

export default TestPage;
