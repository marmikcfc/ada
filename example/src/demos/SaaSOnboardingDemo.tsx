import React from 'react';
import GeUI from '../../../packages/geui-sdk/src/components/GeUI';

/**
 * Demo 1: Simple Widget Import for SaaS Onboarding
 * 
 * This demonstrates the minimal setup required for SaaS apps to add
 * conversational AI in under 5 minutes. Perfect for customer onboarding,
 * support, and user guidance.
 */
const SaaSOnboardingDemo: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Simulated SaaS App Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#667eea',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              S
            </div>
            <h1 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>SaaS Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              Settings
            </button>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px'
            }}>
              JD
            </div>
          </div>
        </header>

        {/* Simulated SaaS App Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Welcome to Your Dashboard!</h3>
            <p style={{ color: '#64748b', lineHeight: '1.6' }}>
              Get started with our platform. Click the chat bubble in the bottom-right to get help with:
            </p>
            <ul style={{ color: '#64748b', paddingLeft: '20px' }}>
              <li>Setting up your first project</li>
              <li>Configuring integrations</li>
              <li>Understanding analytics</li>
              <li>Managing your team</li>
            </ul>
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ fontSize: '20px' }}>💡</div>
              <div style={{ fontSize: '14px', color: '#1e40af' }}>
                <strong>Pro tip:</strong> Click the fullscreen button (⛶) in the chat widget for an immersive voice support experience!
              </div>
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Quick Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>47</div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>Active Users</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>$12.5k</div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Code Example */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Implementation Code</h3>
          <pre style={{
            backgroundColor: '#f1f5f9',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '14px',
            color: '#334155'
          }}>
{`// Complete SaaS onboarding widget with fullscreen support
import GeUI from 'geui-sdk';

<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  bubbleEnabled={true}
  allowFullScreen={true}  // Enables immersive support mode
  options={{
    agentName: "Support Assistant",
    agentSubtitle: "I'm here to help you get started!",
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    threadManagerTitle: "Support History",
    enableThreadManager: true,
    startCallButtonText: "🎤 Talk to Support",
    theme: {
      colors: { primary: "#667eea" }
    }
  }}
/>`}
          </pre>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '16px'
          }}>
            <div style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #16a34a',
              borderRadius: '6px',
              padding: '12px'
            }}>
              <div style={{ fontWeight: '600', color: '#15803d', fontSize: '14px', marginBottom: '4px' }}>
                💬 Chat Mode
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Click the bubble to open instant chat support
              </div>
            </div>
            <div style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #2563eb',
              borderRadius: '6px',
              padding: '12px'
            }}>
              <div style={{ fontWeight: '600', color: '#1d4ed8', fontSize: '14px', marginBottom: '4px' }}>
                🎤 Voice Mode
              </div>
              <div style={{ fontSize: '12px', color: '#1e40af' }}>
                Click fullscreen for immersive voice support
              </div>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '12px 0 0 0' }}>
            Now your users have both instant chat support and immersive voice assistance!
          </p>
        </div>
      </div>

      {/* The actual Genux widget - minimal configuration */}
      <GeUI
        webrtcURL="/api/offer"
        websocketURL="/ws/messages"
        bubbleEnabled={true}
        allowFullScreen={true}
        options={{
          agentName: "Support Assistant",
          agentSubtitle: "I'm here to help you get started!",
          logoUrl: "/ada-brain-icon.svg",
          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          primaryColor: "#667eea",
          accentColor: "#764ba2",
          threadManagerTitle: "Support History",
          enableThreadManager: true,
          startCallButtonText: "🎤 Talk to Support",
          endCallButtonText: "🔇 End Call",
          connectingText: "Connecting to support...",
          theme: {
            colors: {
              primary: "#667eea",
              secondary: "#764ba2"
            }
          }
        }}
      />
    </div>
  );
};

export default SaaSOnboardingDemo;