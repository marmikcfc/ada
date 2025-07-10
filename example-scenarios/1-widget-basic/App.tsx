import React from 'react';
import { GenuxChatWidget } from 'genux-sdk';
import './App.css';

/**
 * Example 1: Widget Basic Integration
 * 
 * This demonstrates the simplest possible integration of Genux SDK
 * with just a single component import and minimal configuration.
 * 
 * Features:
 * - Floating chat bubble in bottom-right corner
 * - Expands to full chat window on click
 * - Voice and text input supported out-of-the-box
 * - C1Component rendering for rich responses
 */
function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Basic Widget Example</h1>
        <p>
          Click the chat bubble in the bottom-right corner to start a conversation.
          You can type or use voice input.
        </p>
      </header>
      
      <main className="app-content">
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { GenuxChatWidget } from 'genux-sdk';

// That's it! Just add this component anywhere in your app
<GenuxChatWidget 
  webrtcURL="/api/webrtc" 
  websocketURL="/api/ws"
/>`}
          </pre>
        </div>
      </main>

      {/* This is the actual widget integration */}
      <GenuxChatWidget 
        webrtcURL="/api/webrtc"
        websocketURL="/api/ws"
      />
    </div>
  );
}

export default App;
