import React, { useState } from 'react';
import SaaSOnboardingDemo from './demos/SaaSOnboardingDemo';
import ChatOnlyDemo from './demos/ChatOnlyDemo';
import StandaloneVoiceBotDemo from './demos/StandaloneVoiceBotDemo';
import CustomFullscreenDemo from './demos/CustomFullscreenDemo';
import VoiceOnlyDemo from './demos/VoiceOnlyDemo';
import ThemeShowcaseDemo from './demos/ThemeShowcaseDemo';
import UIFrameworkDemo from './demos/UIFrameworkDemo';
import ConfigurableDemo from './demos/ConfigurableDemo';

/**
 * Demo Router Component
 * 
 * Provides navigation between the 8 demo use cases to showcase
 * the GenUX SDK's capabilities for different scenarios.
 */

type DemoType = 'saas' | 'chat' | 'standalone' | 'customfullscreen' | 'voiceonly' | 'themes' | 'uiframework' | 'configurable';

interface Demo {
  id: DemoType;
  title: string;
  description: string;
  icon: string;
  status: 'supported' | 'partial';
  component: React.ComponentType;
}

const demos: Demo[] = [
  {
    id: 'saas',
    title: 'SaaS Onboarding Widget',
    description: 'Simple floating widget for customer support and onboarding',
    icon: '🚀',
    status: 'supported',
    component: SaaSOnboardingDemo
  },
  {
    id: 'chat',
    title: 'Chat-Only Interface',
    description: 'Embedded text chat without voice features',
    icon: '💬',
    status: 'supported',
    component: ChatOnlyDemo
  },
  {
    id: 'standalone',
    title: 'Customized VoiceBot UI',
    description: 'Modular VoiceBotUI component with real backend connections',
    icon: '🎯',
    status: 'supported',
    component: StandaloneVoiceBotDemo
  },
  {
    id: 'customfullscreen',
    title: 'Custom Fullscreen Components',
    description: 'Complete component overrides for ThreadList, VoiceBot, and ChatWindow',
    icon: '🎨',
    status: 'supported',
    component: CustomFullscreenDemo
  },
  {
    id: 'voiceonly',
    title: 'Voice-Only Interface',
    description: 'Pure voice interaction without any chat UI - voice-first experience',
    icon: '🎙️',
    status: 'supported',
    component: VoiceOnlyDemo
  },
  {
    id: 'themes',
    title: 'Theme Showcase',
    description: 'Comprehensive theme system with light, dark, and custom themes',
    icon: '🌈',
    status: 'supported',
    component: ThemeShowcaseDemo
  },
  {
    id: 'uiframework',
    title: 'UI Framework Support',
    description: 'Backend-generated HTML with framework-specific optimization and interaction handling',
    icon: '🔧',
    status: 'supported',
    component: UIFrameworkDemo
  },
  {
    id: 'configurable',
    title: 'Configurable Multi-Tenant',
    description: 'Scalable multi-tenant architecture with framework selection, AI models, and MCP tools per connection',
    icon: '🏢',
    status: 'supported',
    component: ConfigurableDemo
  }
];

const DemoRouter: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<DemoType | null>(null);

  if (activeDemo) {
    const demo = demos.find(d => d.id === activeDemo);
    if (demo) {
      const DemoComponent = demo.component;
      return (
        <div>
          {/* Back Button */}
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 10001
          }}>
            <button
              onClick={() => setActiveDemo(null)}
              style={{
                backgroundColor: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#64748b',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              ← Back to Demos
            </button>
          </div>
          <DemoComponent />
        </div>
      );
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px', color: 'white' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            GeUI SDK Demos
          </h1>
          <p style={{
            fontSize: '24px',
            opacity: 0.9,
            margin: '0 0 20px 0',
            lineHeight: '1.6'
          }}>
            Explore different use cases and implementation patterns
          </p>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'inline-block',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              ✅ Fully Supported  •  ⚠️ Partial Support  •  🔧 Coming Soon
            </span>
          </div>
        </div>

        {/* Demo Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '32px',
          marginBottom: '60px'
        }}>
          {demos.map((demo) => (
            <div
              key={demo.id}
              onClick={() => setActiveDemo(demo.id)}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '32px',
                cursor: 'pointer',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: demo.status === 'supported' ? '#10b981' : '#f59e0b',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {demo.status === 'supported' ? '✅ Supported' : '⚠️ Partial'}
              </div>

              {/* Icon */}
              <div style={{
                fontSize: '48px',
                marginBottom: '20px'
              }}>
                {demo.icon}
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0 0 12px 0',
                color: '#1e293b'
              }}>
                {demo.title}
              </h3>

              {/* Description */}
              <p style={{
                fontSize: '16px',
                color: '#64748b',
                margin: '0 0 24px 0',
                lineHeight: '1.6'
              }}>
                {demo.description}
              </p>

              {/* CTA */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#667eea',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                Explore Demo →
              </div>

              {/* Hover gradient */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.3s ease'
              }} />
            </div>
          ))}
        </div>

        {/* Feature Summary */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 24px 0',
            textAlign: 'center'
          }}>
            What You Can Build Today
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
              <h4 style={{ margin: '0 0 8px 0' }}>5-Minute Setup</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Add conversational AI to any app with minimal configuration
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</div>
              <h4 style={{ margin: '0 0 8px 0' }}>Full Customization</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Override any component to match your brand perfectly
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗣️</div>
              <h4 style={{ margin: '0 0 8px 0' }}>Voice & Text</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Support both text chat and voice conversations
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📱</div>
              <h4 style={{ margin: '0 0 8px 0' }}>Responsive Design</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Works beautifully on desktop, tablet, and mobile
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (hover: hover) {
          .demo-card:hover .hover-gradient {
            transform: scaleX(1) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DemoRouter;