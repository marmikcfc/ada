import React, { useState } from 'react';
import { 
  GeUI,
  lightTheme, 
  darkTheme, 
  defaultTheme,
  comprehensiveLightTheme,
  comprehensiveDarkTheme,
  comprehensiveDefaultTheme,
  crayonLightTheme,
  crayonDarkTheme,
  crayonDefaultTheme,
  createTheme,
  toCrayonTheme
} from '../../../packages/geui-sdk/src';
import './demo-styles.css';

/**
 * Theme Showcase Demo
 * 
 * Demonstrates the comprehensive theme system with:
 * 1. Pre-configured light, dark, and default themes
 * 2. Custom theme creation
 * 3. Live theme switching
 * 4. Dual theme architecture (GenUX + Crayon)
 */

interface ThemeOption {
  name: string;
  genuxTheme: any;
  crayonTheme: any;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    name: 'Comprehensive Light',
    genuxTheme: comprehensiveLightTheme,
    crayonTheme: toCrayonTheme(comprehensiveLightTheme),
    description: 'Complete light theme with all 200+ design tokens'
  },
  {
    name: 'Comprehensive Dark',
    genuxTheme: comprehensiveDarkTheme,
    crayonTheme: toCrayonTheme(comprehensiveDarkTheme),
    description: 'Complete dark theme optimized for low-light use'
  },
  {
    name: 'Comprehensive Default',
    genuxTheme: comprehensiveDefaultTheme,
    crayonTheme: toCrayonTheme(comprehensiveDefaultTheme),
    description: 'Complete GenUX brand theme with gradient colors'
  },
  {
    name: 'Legacy Light',
    genuxTheme: lightTheme,
    crayonTheme: crayonLightTheme,
    description: 'Original light theme (backwards compatibility)'
  },
  {
    name: 'Legacy Dark',
    genuxTheme: darkTheme,
    crayonTheme: crayonDarkTheme,
    description: 'Original dark theme (backwards compatibility)'
  },
  {
    name: 'Legacy Default',
    genuxTheme: defaultTheme,
    crayonTheme: crayonDefaultTheme,
    description: 'Original default theme (backwards compatibility)'
  }
];

// Custom brand themes
const customThemes: ThemeOption[] = [
  {
    name: 'Ocean Theme',
    genuxTheme: createTheme({
      colors: {
        primary: '#0891b2',      // Cyan-600
        secondary: '#06b6d4',    // Cyan-500
        background: '#f0fdfa',   // Cyan-50
        surface: '#ffffff',
        text: '#134e4a',         // Teal-900
        textSecondary: '#0f766e', // Teal-700
        border: '#99f6e4',       // Teal-200
        error: '#dc2626',
        success: '#059669',
        warning: '#f59e0b',
        info: '#0284c7',
      }
    }),
    crayonTheme: null, // Will be generated
    description: 'Cool, calming ocean-inspired theme'
  },
  {
    name: 'Sunset Theme',
    genuxTheme: createTheme({
      colors: {
        primary: '#dc2626',      // Red-600
        secondary: '#f97316',    // Orange-500
        background: '#fff7ed',   // Orange-50
        surface: '#ffffff',
        text: '#7c2d12',         // Orange-900
        textSecondary: '#c2410c', // Orange-700
        border: '#fed7aa',       // Orange-200
        error: '#b91c1c',
        success: '#15803d',
        warning: '#a16207',
        info: '#1e40af',
      }
    }),
    crayonTheme: null, // Will be generated
    description: 'Warm, vibrant sunset-inspired theme'
  },
  {
    name: 'Forest Theme',
    genuxTheme: createTheme({
      colors: {
        primary: '#059669',      // Emerald-600
        secondary: '#10b981',    // Emerald-500
        background: '#f0fdf4',   // Emerald-50
        surface: '#ffffff',
        text: '#064e3b',         // Emerald-900
        textSecondary: '#047857', // Emerald-700
        border: '#a7f3d0',       // Emerald-200
        error: '#dc2626',
        success: '#059669',
        warning: '#d97706',
        info: '#2563eb',
      }
    }),
    crayonTheme: null, // Will be generated
    description: 'Natural, refreshing forest-inspired theme'
  }
];

// Generate Crayon themes for custom themes
customThemes.forEach(theme => {
  theme.crayonTheme = toCrayonTheme(theme.genuxTheme);
});

const allThemes = [...themeOptions, ...customThemes];

export default function ThemeShowcaseDemo() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(themeOptions[0]);
  const [showRichContent, setShowRichContent] = useState(true);
  const [useFullscreen, setUseFullscreen] = useState(true);
  const [showThemeControls, setShowThemeControls] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  // Mock messages with rich content to showcase theme
  const mockMessages = showRichContent ? [
    {
      id: '1',
      role: 'assistant' as const,
      timestamp: new Date(),
      content: 'Welcome! I can demonstrate rich content rendering with different themes.',
      c1Content: `<content>
        <card title="Theme Showcase">
          <section title="Current Theme">
            <text>You're viewing the <bold>${selectedTheme.name}</bold></text>
            <text>${selectedTheme.description}</text>
          </section>
          
          <section title="Sample Table">
            <table>
              <tr>
                <th>Feature</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
              <tr>
                <td>Theming</td>
                <td><text color="success">Active</text></td>
                <td>Full theme support</td>
              </tr>
              <tr>
                <td>Dark Mode</td>
                <td><text color="info">Available</text></td>
                <td>Automatic contrast adjustment</td>
              </tr>
              <tr>
                <td>Custom Themes</td>
                <td><text color="warning">Beta</text></td>
                <td>Create your own themes</td>
              </tr>
            </table>
          </section>
          
          <section title="Sample List">
            <list>
              <item>
                <text><bold>Primary Color:</bold> Used for main actions and brand elements</text>
              </item>
              <item>
                <text><bold>Secondary Color:</bold> Used for secondary actions and accents</text>
              </item>
              <item>
                <text><bold>Surface Color:</bold> Used for cards and elevated content</text>
              </item>
            </list>
          </section>
          
          <section title="Code Example">
            <codeblock language="typescript">
// Apply theme to Genux
const myTheme = createTheme({
  colors: {
    primary: '#your-color',
    secondary: '#your-color'
  }
});

<GeUI
  options={{
    theme: myTheme,
    crayonTheme: toCrayonTheme(myTheme)
  }}
/>
            </codeblock>
          </section>
          
          <actions>
            <button primary>Primary Action</button>
            <button>Secondary Action</button>
          </actions>
        </card>
      </content>`
    }
  ] : [
    {
      id: '1',
      role: 'assistant' as const,
      timestamp: new Date(),
      content: `Welcome! You're viewing the ${selectedTheme.name}. ${selectedTheme.description}`,
    }
  ];

  if (isImmersiveMode) {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: selectedTheme.genuxTheme.colors.background 
      }}>
        {/* Enhanced Floating Controls */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10000,
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setIsImmersiveMode(false)}
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            ← Exit Full Experience
          </button>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '8px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <select
              value={selectedTheme.name}
              onChange={(e) => {
                const theme = allThemes.find(t => t.name === e.target.value);
                if (theme) setSelectedTheme(theme);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                minWidth: '200px',
                outline: 'none'
              }}
            >
              {allThemes.map(theme => (
                <option key={theme.name} value={theme.name}>
                  🎨 {theme.name}
                </option>
              ))}
            </select>
            
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: selectedTheme.genuxTheme.colors.primary,
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }} />
          </div>
        </div>

        {/* Theme Info Badge */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          padding: '12px 16px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          maxWidth: '280px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            {selectedTheme.name}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {selectedTheme.description}
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#9ca3af',
            marginTop: '8px',
            fontFamily: 'monospace'
          }}>
            Primary: {selectedTheme.genuxTheme.colors.primary}
          </div>
        </div>

        {/* Full Immersive Experience */}
        <GeUI
          webrtcURL="ws://localhost:8000/api/offer"
          websocketURL="ws://localhost:8000/ws/per-connection-messages"
          bubbleEnabled={false}
          allowFullScreen={false}
          disableVoice={false}
          options={{
            theme: selectedTheme.genuxTheme,
            crayonTheme: selectedTheme.crayonTheme,
            agentName: `${selectedTheme.name} Experience`,
            agentSubtitle: `${selectedTheme.description} • 200+ Design Tokens`,
            enableThreadManager: true,
            threadManagerTitle: "🎨 Theme Conversations",
            startCallButtonText: "Start Voice Experience",
            endCallButtonText: "End Voice Session",
            connectingText: "Connecting to theme experience...",
            fullscreenLayout: {
              showThreadList: true,
              showVoiceBot: true,
              showChatWindow: true,
              columnWidths: "320px 1fr 400px"
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="demo-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Hero Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '40px',
        marginBottom: '32px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '36px',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          🎨 GenUX Theme System
        </h1>
        <p style={{ 
          margin: '0 auto 24px', 
          fontSize: '18px',
          opacity: 0.9,
          maxWidth: '600px'
        }}>
          Experience the complete theme system with <strong>200+ design tokens</strong>, 
          dual architecture, and live switching across 9 stunning themes.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsImmersiveMode(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '16px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚀 Enter Full Experience
          </button>
          
          <button
            onClick={() => setShowThemeControls(!showThemeControls)}
            style={{
              background: 'transparent',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '16px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📚 Learn More
          </button>
        </div>
        
        <div style={{ 
          marginTop: '24px',
          fontSize: '14px',
          opacity: 0.8
        }}>
          <strong>What's New:</strong> Comprehensive themes with complete typography system, 
          immersive 3-column experience, and real-time voice interaction
        </div>
      </div>

      {/* Quick Theme Selector */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Theme:</label>
          <select
            value={selectedTheme.name}
            onChange={(e) => {
              const theme = allThemes.find(t => t.name === e.target.value);
              if (theme) setSelectedTheme(theme);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
              minWidth: '200px'
            }}
          >
            {allThemes.map(theme => (
              <option key={theme.name} value={theme.name}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Mode:</label>
          <select
            value={useFullscreen ? 'fullscreen' : 'windowed'}
            onChange={(e) => setUseFullscreen(e.target.value === 'fullscreen')}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="fullscreen">Fullscreen (3-column)</option>
            <option value="windowed">Windowed (bubble)</option>
          </select>
        </div>

        <button
          onClick={() => setShowThemeControls(!showThemeControls)}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            background: showThemeControls ? '#f3f4f6' : 'white',
            cursor: 'pointer'
          }}
        >
          {showThemeControls ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Theme Grid (when details shown) */}
      {showThemeControls && (
        <div style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>All Available Themes</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {allThemes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => setSelectedTheme(theme)}
                style={{
                  padding: '16px',
                  border: '2px solid',
                  borderColor: selectedTheme.name === theme.name ? theme.genuxTheme.colors.primary : '#e5e7eb',
                  backgroundColor: selectedTheme.name === theme.name ? theme.genuxTheme.colors.primary + '10' : '#ffffff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ 
                  fontWeight: 600,
                  color: selectedTheme.name === theme.name ? theme.genuxTheme.colors.primary : '#1f2937',
                  marginBottom: '8px'
                }}>
                  {theme.name}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '12px'
                }}>
                  {theme.description}
                </div>
                {/* Color preview */}
                <div style={{ 
                  display: 'flex', 
                  gap: '6px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.genuxTheme.colors.primary,
                    border: '1px solid #e5e7eb'
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.genuxTheme.colors.secondary,
                    border: '1px solid #e5e7eb'
                  }} />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: theme.genuxTheme.colors.background,
                    border: '1px solid #e5e7eb'
                  }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme Details */}
      {showThemeControls && (
        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <h4 style={{ marginTop: 0 }}>Theme Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <strong>Primary:</strong> {selectedTheme.genuxTheme.colors.primary}
            </div>
            <div>
              <strong>Secondary:</strong> {selectedTheme.genuxTheme.colors.secondary}
            </div>
            <div>
              <strong>Background:</strong> {selectedTheme.genuxTheme.colors.background}
            </div>
            <div>
              <strong>Text:</strong> {selectedTheme.genuxTheme.colors.text}
            </div>
          </div>
        </div>
      )}

      {/* Live Theme Experience */}
      <div style={{ 
        background: `linear-gradient(135deg, ${selectedTheme.genuxTheme.colors.background} 0%, ${selectedTheme.genuxTheme.colors.backgroundSecondary} 100%)`,
        padding: '24px',
        borderRadius: '20px',
        marginBottom: '32px',
        border: `2px solid ${selectedTheme.genuxTheme.colors.border}`,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '24px', 
              fontWeight: '700',
              color: selectedTheme.genuxTheme.colors.text
            }}>
              🎨 Live Theme Experience
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: selectedTheme.genuxTheme.colors.textSecondary 
            }}>
              Interactive demo with real voice and chat capabilities
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              padding: '8px 16px',
              background: selectedTheme.genuxTheme.colors.primary,
              color: 'white',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: `0 4px 12px ${selectedTheme.genuxTheme.colors.primary}40`
            }}>
              {selectedTheme.name}
            </div>
            
            <button
              onClick={() => setIsImmersiveMode(true)}
              style={{
                background: selectedTheme.genuxTheme.colors.secondary,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: `0 4px 12px ${selectedTheme.genuxTheme.colors.secondary}40`,
                transition: 'all 0.2s ease'
              }}
            >
              🚀 Go Fullscreen
            </button>
          </div>
        </div>
        
        {useFullscreen ? (
          // Enhanced Fullscreen Mode Preview
          <div style={{ 
            height: '75vh',
            minHeight: '600px',
            border: `3px solid ${selectedTheme.genuxTheme.colors.primary}`,
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: `0 25px 50px -12px ${selectedTheme.genuxTheme.colors.primary}40`,
            background: selectedTheme.genuxTheme.colors.background,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Preview Label */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 1000,
              background: selectedTheme.genuxTheme.colors.primary,
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              3-Column Fullscreen Mode
            </div>
            
            {/* Wrapper to contain the fullscreen layout */}
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%'
            }}>
              <GeUI
                webrtcURL="ws://localhost:8000/api/offer"
                websocketURL="ws://localhost:8000/ws/per-connection-messages"
                bubbleEnabled={false}
                allowFullScreen={false}
                disableVoice={false}
                options={{
                  theme: selectedTheme.genuxTheme,
                  crayonTheme: selectedTheme.crayonTheme,
                  agentName: `${selectedTheme.name} Experience`,
                  agentSubtitle: `${selectedTheme.description} • Full Theme System`,
                  enableThreadManager: true,
                  threadManagerTitle: "🎨 Theme Conversations",
                  fullscreenLayout: {
                    showThreadList: true,
                    showVoiceBot: true,
                    showChatWindow: true,
                    columnWidths: "300px 1fr 380px"
                  },
                  containerMode: true
                }}
              />
            </div>
          </div>
        ) : (
          // Enhanced Windowed Mode Preview
          <div style={{ 
            height: '560px',
            border: `3px solid ${selectedTheme.genuxTheme.colors.border}`,
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            background: selectedTheme.genuxTheme.colors.background,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Preview Label */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: selectedTheme.genuxTheme.colors.secondary,
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              Windowed Chat Mode
            </div>
            
            <GeUI
              webrtcURL="ws://localhost:8000/api/offer"
              websocketURL="ws://localhost:8000/ws/per-connection-messages"
              bubbleEnabled={true}
              allowFullScreen={true}
              disableVoice={false}
              options={{
                theme: selectedTheme.genuxTheme,
                crayonTheme: selectedTheme.crayonTheme,
                agentName: `${selectedTheme.name} Chat`,
                enableThreadManager: false
              }}
            />
          </div>
        )}
        
        {/* Quick Actions */}
        <div style={{ 
          marginTop: '20px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            fontSize: '14px',
            color: selectedTheme.genuxTheme.colors.textSecondary,
            textAlign: 'center'
          }}>
            <strong>Try:</strong> Switch themes above to see instant changes • Click "Start a call" for voice experience • Use thread manager for conversations
          </div>
        </div>
      </div>

      {/* Code Example */}
      {showThemeControls && (
        <div className="demo-code">
          <h3>Implementation</h3>
          <pre style={{ 
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            <code>{`import { 
  Genux, 
  ${selectedTheme.name.includes('Custom') ? 'createTheme, toCrayonTheme' : 
    selectedTheme.name.includes('Comprehensive') ? 
      selectedTheme.name.toLowerCase().replace(' ', '') + ', toCrayonTheme' :
      selectedTheme.name.toLowerCase().replace(' ', '') + ', crayon' + selectedTheme.name.replace(' ', '')}
} from '@your-org/geui-sdk';

${selectedTheme.name.includes('Custom') ? `// Create custom theme
const customTheme = createTheme({
  colors: {
    primary: '${selectedTheme.genuxTheme.colors.primary}',
    secondary: '${selectedTheme.genuxTheme.colors.secondary}',
    background: '${selectedTheme.genuxTheme.colors.background}',
    // ... other colors
  }
});

const customCrayonTheme = toCrayonTheme(customTheme);

<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/per-connection-messages"
  ${useFullscreen ? 'bubbleEnabled={false}' : 'bubbleEnabled={true}'}
  options={{
    theme: customTheme,
    crayonTheme: customCrayonTheme,
    agentName: "${selectedTheme.name} Demo"
  }}
/>` : selectedTheme.name.includes('Comprehensive') ? `// Use comprehensive theme with full token coverage
<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/per-connection-messages"
  ${useFullscreen ? 'bubbleEnabled={false}' : 'bubbleEnabled={true}'}
  options={{
    theme: ${selectedTheme.name.toLowerCase().replace(' ', '')},
    crayonTheme: toCrayonTheme(${selectedTheme.name.toLowerCase().replace(' ', '')}),
    agentName: "${selectedTheme.name} Demo",
    ${useFullscreen ? `fullscreenLayout: {
      showThreadList: true,
      showVoiceBot: true,
      showChatWindow: true,
      columnWidths: "280px 1fr 400px"
    }` : 'enableThreadManager: false'}
  }}
/>` : `// Use legacy theme (backwards compatibility)
<GeUI
  webrtcURL="/api/offer"
  websocketURL="/ws/per-connection-messages"
  ${useFullscreen ? 'bubbleEnabled={false}' : 'bubbleEnabled={true}'}
  options={{
    theme: ${selectedTheme.name.toLowerCase().replace(' ', '')},
    crayonTheme: crayon${selectedTheme.name.replace(' ', '')},
    agentName: "${selectedTheme.name} Demo"
  }}
/>`}`}</code>
          </pre>
        </div>
      )}

      {/* Notes */}
      {showThemeControls && (
        <div className="demo-notes">
          <h3>Comprehensive Theme System Features</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <h4>🎨 Theme Coverage</h4>
              <ul>
                <li><strong>200+ Design Tokens:</strong> Complete coverage of all UI elements</li>
                <li><strong>47 Color Tokens:</strong> Primary/secondary with states, backgrounds, text, borders</li>
                <li><strong>Typography System:</strong> 6 heading levels, 3 body sizes, 3 label sizes, code styles</li>
                <li><strong>Spacing Scale:</strong> 10 tokens from 0px to 64px</li>
                <li><strong>Border Radius:</strong> 11 options from none to full circle</li>
                <li><strong>Shadows & Effects:</strong> 6 shadow levels plus transitions</li>
              </ul>
            </div>
            
            <div>
              <h4>🏗️ Architecture</h4>
              <ul>
                <li><strong>Dual Theme System:</strong> GenUX + Crayon themes work together</li>
                <li><strong>Comprehensive Themes:</strong> New themes with complete token coverage</li>
                <li><strong>Legacy Support:</strong> Original themes maintained for backwards compatibility</li>
                <li><strong>Custom Creation:</strong> Use createTheme() for brand-specific themes</li>
                <li><strong>Auto Conversion:</strong> toCrayonTheme() maps all tokens automatically</li>
              </ul>
            </div>
            
            <div>
              <h4>🎯 Content Support</h4>
              <ul>
                <li><strong>Tables:</strong> Headers, cells, borders, hover states</li>
                <li><strong>Forms:</strong> Inputs, buttons, focus states, validation</li>
                <li><strong>Code:</strong> Syntax highlighting, monospace fonts</li>
                <li><strong>Lists:</strong> Bullets, numbers, nested lists</li>
                <li><strong>Cards:</strong> Surfaces, elevation, shadows</li>
                <li><strong>States:</strong> Error, success, warning, info variants</li>
              </ul>
            </div>
          </div>
          
          <div style={{ 
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0c4a6e' }}>💡 Theme Comparison</h4>
            <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Comprehensive Themes:</strong> Full 200+ token coverage with complete typography system, comprehensive color palette, and all UI element styles.
              </p>
              <p style={{ margin: '0' }}>
                <strong>Legacy Themes:</strong> Original ~30 token themes maintained for backwards compatibility and lighter bundle size.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}