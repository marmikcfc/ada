import React, { useState } from 'react';
import { Genux } from '../components/Genux';
import { Message } from '../types';

/**
 * Demo showcasing flexible content rendering with C1, HTML, and React content
 */
export const FlexibleContentDemo = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can render content in multiple formats. Here are some examples:',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'assistant',
      c1Content: `<content>
        <h2>C1Component Example</h2>
        <p>This is a C1Component with rich formatting:</p>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tables</td>
              <td>✅ Supported</td>
            </tr>
            <tr>
              <td>Charts</td>
              <td>✅ Supported</td>
            </tr>
            <tr>
              <td>Forms</td>
              <td>✅ Supported</td>
            </tr>
          </tbody>
        </table>
      </content>`,
      timestamp: new Date(),
    },
    {
      id: '3',
      role: 'assistant',
      htmlContent: `
        <div style="padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;">
          <h3>HTML Content Example</h3>
          <p>This is directly rendered HTML with custom styling!</p>
          <button style="background: white; color: #667eea; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
            Click me!
          </button>
        </div>
      `,
      contentType: 'html',
      timestamp: new Date(),
    },
    {
      id: '4',
      role: 'assistant',
      reactContent: (
        <div style={{ 
          padding: '16px', 
          background: '#f3f4f6', 
          borderRadius: '12px',
          border: '2px dashed #9ca3af'
        }}>
          <h3>React Component Example</h3>
          <p>This is a React component with interactive features:</p>
          <button 
            onClick={() => alert('Hello from React!')}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Interactive Button
          </button>
        </div>
      ),
      contentType: 'react',
      timestamp: new Date(),
    },
    {
      id: '5',
      role: 'assistant',
      content: 'I can also auto-detect content types. Here\'s some HTML that will be automatically detected:',
      timestamp: new Date(),
    },
    {
      id: '6',
      role: 'assistant',
      content: `<div style="padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
        <strong>Auto-detected HTML!</strong> The renderer automatically detected this as HTML content.
      </div>`,
      timestamp: new Date(),
    },
  ]);

  // Mock WebSocket URL (won't actually connect in demo)
  const mockWebrtcURL = '/api/offer';
  const mockWebsocketURL = 'wss://example.com/ws/messages';

  return (
    <div style={{ height: '100vh', background: '#f9fafb' }}>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Flexible Content Rendering Demo
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          This demo showcases the ability to render C1Components, HTML, and React components in chat messages.
        </p>
        
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'semibold', marginBottom: '12px' }}>
            Key Features:
          </h2>
          <ul style={{ listStyle: 'disc', paddingLeft: '24px', color: '#4b5563' }}>
            <li>C1Component rendering with full TheSys AI support</li>
            <li>Safe HTML rendering with DOMPurify sanitization</li>
            <li>Direct React component rendering</li>
            <li>Automatic content type detection</li>
            <li>Backward compatibility with existing C1 content</li>
          </ul>
        </div>

        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'semibold', marginBottom: '12px' }}>
            Backend Response Examples:
          </h2>
          
          <pre style={{ 
            background: '#1f2937', 
            color: '#e5e7eb', 
            padding: '16px', 
            borderRadius: '8px',
            overflow: 'auto',
            marginBottom: '16px'
          }}>
{`// C1Component (existing format)
{
  "type": "text_chat_response",
  "content": "<content><h1>C1 Content</h1></content>",
  "id": "msg-123"
}

// HTML content
{
  "type": "text_chat_response",
  "htmlContent": "<div>Custom HTML</div>",
  "contentType": "html",
  "id": "msg-124"
}

// Mixed content (auto-detected)
{
  "type": "text_chat_response",
  "content": "<div>This will be auto-detected as HTML</div>",
  "id": "msg-125"
}`}
          </pre>
        </div>
      </div>

      {/* Genux component with mock data */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <Genux
          webrtcURL={mockWebrtcURL}
          websocketURL={mockWebsocketURL}
          bubbleEnabled={true}
          disableVoice={true}
          options={{
            agentName: 'Flexible Content Assistant',
            // Override to use our demo messages
            components: {
              ChatWindow: (props: any) => {
                const ChatWindow = props.ChatWindow || (() => null);
                return <ChatWindow {...props} messages={messages} />;
              }
            }
          }}
        />
      </div>
    </div>
  );
};