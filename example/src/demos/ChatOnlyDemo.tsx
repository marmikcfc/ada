import React from 'react';
import { ConfigurableGeUIClient } from '../ConfigurableGeUIClient';

/**
 * Demo 2: Chat-Only Bot Usage
 * 
 * This demonstrates how to create a text-only chat interface without
 * voice features. Perfect for embedded help systems, documentation chat,
 * or customer support interfaces.
 */
const ChatOnlyDemo: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Simulated App Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            H
          </div>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>Help Center</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#334155',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            📚 Documentation
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '6px',
            cursor: 'pointer',
            border: '1px solid #3b82f6'
          }}>
            💬 AI Assistant
          </div>
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: 0.7
          }}>
            🎫 Support Tickets
          </div>
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: 0.7
          }}>
            📞 Contact Us
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: '#334155', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>💡 Tip</h4>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Ask me anything about our platform, features, or troubleshooting steps.
          </p>
        </div>
      </div>

      {/* Main Content Area with Embedded Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          backgroundColor: 'white',
          padding: '20px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '24px' }}>
              AI Assistant
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Get instant help with our intelligent chat assistant
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✓ Online
          </div>
        </header>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          padding: '32px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Implementation Example */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Implementation</h3>
              <pre style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#334155',
                border: '1px solid #e2e8f0',
                overflow: 'auto'
              }}>
{`// True chat-only interface - no voice features
<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/per-connection-messages"
  bubbleEnabled={false}  // Embeds directly in your layout
  disableVoice={true}    // Removes all voice UI and functionality
  options={{
    agentName: "Help Assistant",
    theme: {
      colors: {
        primary: "#3b82f6",
        background: "#ffffff"
      }
    }
  }}
/>`}
              </pre>
            </div>

            {/* Chat Interface */}
            <div style={{ flex: 1 }}>
              <ConfigurableGeUIClient
                clientId="chat-only-help"
                connectionConfig={{
                  client_id: "chat-only-help",
                  mcp_config: {
                    model: "gpt-4o-mini",
                    api_key_env: "OPENAI_API_KEY",
                    servers: []
                  },
                  visualization_provider: {
                    provider_type: "openai", // Framework-aware: Using OpenAI for HTML generation
                    model: "gpt-4o-mini",
                    api_key_env: "OPENAI_API_KEY"
                  },
                  preferences: {
                    ui_framework: "tailwind", // Framework-aware: Clean Tailwind styling for help center
                    theme: "light"
                  }
                }}
                bubbleEnabled={false}
                disableVoice={true}
                options={{
                  agentName: "Help Assistant",
                  agentSubtitle: "I can help you with platform questions, troubleshooting, and more",
                  logoUrl: "/ada-chat-icon.svg",
                  welcomeMessage: "Hi! I'm your help assistant. I can answer questions about our platform, troubleshoot issues, and help you get started. My responses use clean Tailwind CSS styling for a consistent help center experience.",
                  theme: {
                    colors: {
                      primary: "#3b82f6",
                      secondary: "#1e40af",
                      background: "#ffffff",
                      surface: "#f8fafc",
                      text: "#1e293b",
                      textSecondary: "#64748b",
                      border: "#e2e8f0"
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Feature Highlights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚀</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>Instant Responses</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Real-time AI assistance</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>Mobile Friendly</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Responsive design</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>Customizable</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Match your brand</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatOnlyDemo;