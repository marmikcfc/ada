import React from 'react';
import './App.css';
// Import directly from the source files until the package is properly built

/**
 * TestPage component to demonstrate the Genux SDK with floating widget + fullscreen modal
 */
const TestPage: React.FC = () => {
 

  return (
    <div className="test-page">
      {/* Header */}
      <header style={headerStyle}>
        <h1>Genux SDK Test Page</h1>
        <div style={headerInfoStyle}>
          <span>Mode: <strong>Floating Widget with Fullscreen</strong></span>
        </div>
      </header>

      {/* Demo content area */}
      <div style={contentStyle}>
        <h2>Demo Content</h2>
        <p>
          This page demonstrates the Genux SDK with a floating widget in the bottom-right corner.
          Click the fullscreen button in the widget to open the full experience!
        </p>
        
        <div style={featuresStyle}>
          <h3>Features Available:</h3>
          <ul>
            <li>🎤 <strong>Voice Chat:</strong> Click the mic button to start voice conversations</li>
            <li>💬 <strong>Text Chat:</strong> Click the chat button for text-based conversations</li>
            <li>🖥️ <strong>Fullscreen Mode:</strong> Click the fullscreen button for the immersive experience</li>
            <li>📱 <strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
          </ul>
        </div>
        
        <div style={cardContainerStyle}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={cardStyle}>
              <h3>Sample Card {i + 1}</h3>
              <p>This is placeholder content to demonstrate how the chat interface interacts with page content.</p>
            </div>
          ))}
        </div>
        
        <div style={settingsStyle}>
          <h3>Current Settings:</h3>
          <div style={settingsGridStyle}>
            <div style={settingItemStyle}>
              <strong>WebRTC URL:</strong>
              <span>/api/offer</span>
            </div>
            <div style={settingItemStyle}>
              <strong>WebSocket URL:</strong>
              <span>/ws/messages</span>
            </div>
            <div style={settingItemStyle}>
              <strong>Agent Name:</strong>
              <span>Ada</span>
            </div>
            <div style={settingItemStyle}>
              <strong>Fullscreen:</strong>
              <span>✅ Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
};

// Updated styles
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
  zIndex: 15000,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const headerInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '14px',
  color: '#6b7280',
};

const contentStyle = {
  marginTop: '80px',
  padding: '24px',
  minHeight: 'calc(100vh - 80px)',
  maxWidth: '1200px',
  margin: '80px auto 0',
};

const featuresStyle = {
  marginTop: '32px',
  padding: '24px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const cardContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
  marginTop: '32px',
};

const cardStyle = {
  padding: '24px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const settingsStyle = {
  marginTop: '32px',
  padding: '24px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const settingsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '16px',
  marginTop: '16px',
};

const settingItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  fontSize: '14px',
};

export default TestPage;
