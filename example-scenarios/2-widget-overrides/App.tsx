import React from 'react';
import { 
  GenuxChatWidget, 
  DefaultChatButton, 
  DefaultChatMessage,
  ThemeTokens,
  ChatButtonProps,
  ChatMessageProps
} from 'genux-sdk';
import './App.css';

/**
 * Example 2: Widget with Custom Overrides
 * 
 * This demonstrates how to customize the Genux widget with your own branding
 * while keeping all the core functionality intact.
 * 
 * Customizations shown:
 * - Custom chat button with brand colors and logo
 * - Theme token overrides for consistent brand styling
 * - Custom message bubble styling
 */
function App() {
  // 1. Create a custom chat button component
  const BrandedChatButton: React.FC<ChatButtonProps> = (props) => {
    // Extend the default button but customize its appearance
    return (
      <DefaultChatButton 
        {...props}
        className="branded-chat-button"
      >
        {/* Custom button content */}
        <div className="branded-button-content">
          <img 
            src="/your-company-logo.svg" 
            alt="Company Logo" 
            className="brand-logo"
          />
          {!props.isOpen && <span>Chat with us</span>}
          {props.isOpen && <span>×</span>}
        </div>
      </DefaultChatButton>
    );
  };

  // 2. Create a custom message bubble
  const BrandedMessageBubble: React.FC<ChatMessageProps> = (props) => {
    return (
      <DefaultChatMessage
        {...props}
        className={`branded-message ${props.message.role === 'assistant' ? 'assistant-message' : 'user-message'}`}
      />
    );
  };

  // 3. Define custom theme tokens to match your brand
  const brandTheme: Partial<ThemeTokens> = {
    colors: {
      primary: '#4A6CF7',      // Your brand's primary color
      secondary: '#6E56CF',    // Your brand's secondary color
      accent: '#F76B15',       // Accent color for highlights
      background: '#FFFFFF',   // Background color
      surface: '#F9FAFB',      // Surface color for cards/containers
      text: {
        primary: '#1A2B3C',    // Primary text color
        secondary: '#4B5563',  // Secondary text color
        onPrimary: '#FFFFFF',  // Text color on primary background
      },
      border: '#E5E7EB',       // Border color
    },
    typography: {
      fontFamily: '"Poppins", "Inter", sans-serif',
      fontSize: {
        small: '0.875rem',
        base: '1rem',
        large: '1.125rem',
        xlarge: '1.25rem',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    borderRadius: {
      small: '0.25rem',
      medium: '0.5rem',
      large: '1rem',
      full: '9999px',
    },
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Branded Widget Example</h1>
        <p>
          This example shows how to customize the appearance of the widget
          with your own branding while keeping all functionality.
        </p>
      </header>
      
      <main className="app-content">
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { 
  GenuxChatWidget, 
  DefaultChatButton, 
  DefaultChatMessage,
  ThemeTokens 
} from 'genux-sdk';

// 1. Create custom components
const BrandedChatButton = (props) => (
  <DefaultChatButton {...props} className="branded-button">
    <img src="/logo.svg" alt="Logo" />
    {!props.isOpen && <span>Chat with us</span>}
  </DefaultChatButton>
);

// 2. Define your brand theme
const brandTheme = {
  colors: {
    primary: '#4A6CF7',
    // ... more theme tokens
  }
};

// 3. Use the widget with customizations
<GenuxChatWidget 
  webrtcURL="/api/webrtc" 
  websocketURL="/api/ws"
  options={{
    theme: brandTheme,
    components: {
      ChatButton: BrandedChatButton,
      ChatMessage: BrandedMessageBubble
    }
  }}
/>`}
          </pre>
        </div>
      </main>

      {/* This is the actual widget integration with customizations */}
      <GenuxChatWidget 
        webrtcURL="/api/webrtc"
        websocketURL="/api/ws"
        options={{
          theme: brandTheme,
          components: {
            ChatButton: BrandedChatButton,
            ChatMessage: BrandedMessageBubble
          }
        }}
      />
    </div>
  );
}

export default App;
