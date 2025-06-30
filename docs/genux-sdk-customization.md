# Genux SDK - Customization Guide

Learn how to customize Genux SDK to match your brand and build unique user experiences.

## Table of Contents

- [Theming Overview](#theming-overview)
- [Custom Themes](#custom-themes)
- [Component Customization](#component-customization)
- [Headless Custom UI](#headless-custom-ui)
- [Advanced Patterns](#advanced-patterns)
- [Real-world Examples](#real-world-examples)

---

## Theming Overview

Genux SDK provides multiple levels of customization:

1. **🎨 Theme Tokens** - Colors, spacing, typography
2. **🧩 Component Overrides** - Replace specific UI components
3. **🔧 Headless Mode** - Build completely custom interfaces

### Theme Token System

The theme system uses design tokens that cascade through all components:

```tsx
interface ThemeTokens {
  colors: { primary, secondary, background, surface, text, ... };
  spacing: { xs, sm, md, lg, xl };
  borderRadius: { sm, md, lg, full };
  typography: { fontFamily, fontSize, fontWeight };
}
```

---

## Custom Themes

### 1. Basic Theme Customization

```tsx
import { Genux, createTheme } from 'genux-sdk';

const brandTheme = createTheme({
  colors: {
    primary: '#6366f1',        // Your brand color
    secondary: '#8b5cf6',      // Accent color
    background: '#f8fafc',     // Light background
    surface: '#ffffff',        // Card/surface color
    text: '#1f2937',          // Primary text
    textSecondary: '#6b7280', // Secondary text
    border: '#e5e7eb',        // Border color
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
});

function App() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      options={{ theme: brandTheme }}
    />
  );
}
```

### 2. Dark Mode Theme

```tsx
import { createTheme } from 'genux-sdk';

const darkTheme = createTheme({
  colors: {
    primary: '#3b82f6',
    secondary: '#9ca3af',
    background: '#111827',     // Dark background
    surface: '#1f2937',       // Dark surface
    text: '#f9fafb',         // Light text
    textSecondary: '#d1d5db', // Light secondary text
    border: '#374151',        // Dark border
  },
});

// Use with theme toggle
function ThemedApp() {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      options={{ theme: isDark ? darkTheme : brandTheme }}
    />
  );
}
```

### 3. Multiple Brand Variants

```tsx
const themes = {
  corporate: createTheme({
    colors: { primary: '#1e40af', secondary: '#3730a3' },
    borderRadius: { lg: '0.375rem' }, // Less rounded
    typography: { fontFamily: '"Helvetica Neue", Arial, sans-serif' },
  }),
  
  playful: createTheme({
    colors: { primary: '#ec4899', secondary: '#f59e0b' },
    borderRadius: { lg: '1.5rem' }, // Very rounded
    typography: { fontFamily: '"Comic Sans MS", cursive' },
  }),
  
  minimal: createTheme({
    colors: { 
      primary: '#000000', 
      secondary: '#666666',
      background: '#ffffff',
      surface: '#fafafa',
    },
    borderRadius: { lg: '0px' }, // No rounded corners
  }),
};

function BrandedApp({ brand }) {
  return (
    <Genux
      // ...
      options={{ theme: themes[brand] }}
    />
  );
}
```

### 4. CSS Variable Integration

Export theme tokens as CSS variables for broader use:

```tsx
import { createTheme, themeToCssVars } from 'genux-sdk';

const theme = createTheme({ /* ... */ });
const cssVars = themeToCssVars(theme);

// Inject into document head
useEffect(() => {
  const style = document.createElement('style');
  style.textContent = `:root {
    ${Object.entries(cssVars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')}
  }`;
  document.head.appendChild(style);
  
  return () => document.head.removeChild(style);
}, [cssVars]);
```

---

## Component Customization

### 1. Component Override System

Replace specific components while keeping the rest of the system:

```tsx
import { Genux, ComponentOverrides } from 'genux-sdk';
import CustomChatButton from './CustomChatButton';
import CustomChatWindow from './CustomChatWindow';

function CustomizedApp() {
  const componentOverrides: Partial<ComponentOverrides> = {
    ChatButton: CustomChatButton,
    ChatWindow: CustomChatWindow,
    ChatMessage: CustomChatMessage,
    ChatComposer: CustomChatComposer,
    VoiceButton: CustomVoiceButton,
  };

  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      options={{
        components: componentOverrides,
      }}
    />
  );
}
```

### 2. Available Component Overrides

The following components can be completely replaced:

| Component | Props Interface | Description |
|-----------|----------------|-------------|
| `ChatButton` | `ChatButtonProps` | The floating chat button (when `bubbleEnabled=true`) |
| `ChatWindow` | `ChatWindowProps` | The main chat interface container |
| `ChatMessage` | `ChatMessageProps` | Individual message bubbles |
| `ChatComposer` | `ChatComposerProps` | Message input area with send button |
| `VoiceButton` | `VoiceButtonProps` | Voice connection toggle button |

### 3. Using Default Components as Base

Import default components to extend or customize them:

```tsx
import { 
  DefaultChatButton, 
  DefaultChatMessage,
  ChatButtonProps,
  ChatMessageProps 
} from 'genux-sdk';

// Extend the default chat button
const EnhancedChatButton: React.FC<ChatButtonProps> = (props) => {
  return (
    <div className="relative">
      <DefaultChatButton {...props} />
      {/* Add notification badge */}
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
        3
      </div>
    </div>
  );
};

// Wrap the default message with custom styling
const StyledChatMessage: React.FC<ChatMessageProps> = (props) => {
  return (
    <div className="message-wrapper">
      <DefaultChatMessage {...props} />
      {/* Add timestamp */}
      <div className="text-xs text-gray-500 mt-1">
        {props.message.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};
```

### 4. Custom Chat Button

```tsx
import React from 'react';
import { ChatButtonProps } from 'genux-sdk';

const CustomChatButton: React.FC<ChatButtonProps> = ({ 
  onClick, 
  isOpen,
  theme 
}) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};

export default CustomChatButton;
```

### 5. Custom Chat Window

```tsx
import React from 'react';
import { ChatWindowProps } from 'genux-sdk';

const CustomChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onClose,
  isLoading,
  onToggleVoice,
  isVoiceConnected,
  ...props
}) => {
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Custom header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
        <h2 className="font-bold">AI Chat Assistant</h2>
        {onClose && (
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ✕
          </button>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      {/* Custom input area */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onSendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <button
            onClick={onToggleVoice}
            className={`px-3 py-2 rounded-lg ${
              isVoiceConnected ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            🎤
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomChatWindow;
```

### 6. Custom Message Renderer

```tsx
import React from 'react';
import { ChatMessageProps } from 'genux-sdk';

const CustomChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isLast, 
  isStreaming 
}) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-2">
          AI
        </div>
      )}
      
      <div className={`max-w-sm px-4 py-2 rounded-2xl ${
        isUser 
          ? 'bg-blue-500 text-white rounded-br-sm' 
          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
      }`}>
        <div>{message.content}</div>
        
        {/* Custom timestamp */}
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
        
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="inline-flex space-x-1 mt-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm ml-2">
          You
        </div>
      )}
    </div>
  );
};

export default CustomChatMessage;
```

### 7. Custom Chat Composer

```tsx
import React, { useState } from 'react';
import { ChatComposerProps } from 'genux-sdk';

const CustomChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  disabled,
  isLoading,
  onToggleVoiceConnection,
  isVoiceConnected
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="border-t p-4 bg-gray-50">
      <div className="flex items-end space-x-3">
        {/* Voice button */}
        {onToggleVoiceConnection && (
          <button
            onClick={onToggleVoiceConnection}
            className={`p-3 rounded-full transition-all ${
              isVoiceConnected 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            disabled={disabled}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            </svg>
          </button>
        )}
        
        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={disabled || isLoading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${
              disabled || !message.trim() || isLoading
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomChatComposer;
```

### 8. Custom Voice Button

```tsx
import React from 'react';
import { VoiceButtonProps } from 'genux-sdk';

const CustomVoiceButton: React.FC<VoiceButtonProps> = ({ 
  onClick, 
  isConnected, 
  isConnecting 
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-all duration-300 ${
        isConnected 
          ? 'bg-red-500 text-white shadow-lg animate-pulse' 
          : isConnecting
            ? 'bg-yellow-500 text-white shadow-lg animate-spin'
            : 'bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110'
      }`}
    >
      {isConnected ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      )}
    </button>
  );
};

export default CustomVoiceButton;
```

### 9. Advanced Override Patterns

#### Conditional Component Selection

```tsx
function AdaptiveGenuxApp() {
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  
  const componentOverrides = useMemo(() => {
    const overrides: Partial<ComponentOverrides> = {};
    
    if (userRole === 'admin') {
      overrides.ChatWindow = AdminChatWindow;
      overrides.ChatComposer = AdminChatComposer;
    } else {
      overrides.ChatWindow = UserChatWindow;
    }
    
    return overrides;
  }, [userRole]);

  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws"
      options={{ components: componentOverrides }}
    />
  );
}
```

#### Theme-Aware Components

```tsx
const ThemedChatMessage: React.FC<ChatMessageProps> = ({ message, theme }) => {
  const isDark = theme?.colors?.background === '#111827';
  
  return (
    <div className={`message ${isDark ? 'dark' : 'light'}`}>
      {message.content}
    </div>
  );
};
```

#### Component Composition

```tsx
const EnhancedChatWindow: React.FC<ChatWindowProps> = (props) => {
  return (
    <div className="enhanced-chat-window">
      {/* Add custom header */}
      <CustomChatHeader />
      
      {/* Use default chat window */}
      <DefaultChatWindow {...props} />
      
      {/* Add custom footer */}
      <CustomChatFooter />
    </div>
  );
};
```

---

## Headless Custom UI

Build completely custom interfaces using the `useGenuxClient` hook:

### 1. Minimal Chat Interface

```tsx
import { useGenuxClient } from 'genux-sdk';

function MinimalChat() {
  const {
    messages,
    sendText,
    connectionState,
    isLoading,
  } = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws/messages',
  });

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendText(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b">
        <h1 className="text-lg font-semibold">Chat Assistant</h1>
        <div className={`text-sm ${
          connectionState === 'connected' ? 'text-green-600' : 'text-red-600'
        }`}>
          Status: {connectionState}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <div className={`max-w-md p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
            disabled={connectionState !== 'connected'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || connectionState !== 'connected'}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. Voice-First Interface

```tsx
import { useGenuxClient } from 'genux-sdk';

function VoiceChat() {
  const {
    messages,
    voiceState,
    startVoice,
    stopVoice,
    audioStream,
    isVoiceLoading,
  } = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws/messages',
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && audioStream) {
      audioRef.current.srcObject = audioStream;
    }
  }, [audioStream]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Voice Visualizer */}
      <div className="mb-8">
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all ${
          voiceState === 'connected' 
            ? 'border-green-400 bg-green-50 animate-pulse' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 text-center">
        <button
          onClick={() => voiceState === 'connected' ? stopVoice() : startVoice()}
          className={`px-6 py-3 rounded-full text-white font-medium transition-all ${
            voiceState === 'connected'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {voiceState === 'connected' ? 'Stop Listening' : 'Start Voice Chat'}
        </button>
        
        <p className="text-gray-600">
          {voiceState === 'connected' && 'Listening...'}
          {isVoiceLoading && 'Processing...'}
          {voiceState === 'disconnected' && 'Press to start voice conversation'}
        </p>
      </div>

      {/* Recent Messages */}
      <div className="mt-8 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Recent Conversation</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {messages.slice(-3).map(msg => (
            <div key={msg.id} className={`p-2 rounded text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3. Dashboard Integration

```tsx
function DashboardWithChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws/messages',
  });

  return (
    <div className="flex h-screen">
      {/* Main Dashboard */}
      <div className="flex-1 p-6 bg-gray-50">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        {/* Dashboard content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Metrics</h2>
            {/* ... */}
          </div>
        </div>
        
        {/* Floating chat toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          💬
        </button>
      </div>

      {/* Slide-out Chat Panel */}
      <div className={`bg-white border-l shadow-lg transition-all ${
        isChatOpen ? 'w-80' : 'w-0 overflow-hidden'
      }`}>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">AI Assistant</h2>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Chat interface using client */}
        <div className="flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {client.messages.map(msg => (
              <div key={msg.id} className="mb-3">
                {/* Custom message rendering */}
              </div>
            ))}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t">
            {/* Custom input using client.sendText */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Advanced Patterns

### 1. Context-Aware Theming

```tsx
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light');
  
  const themes = {
    light: createTheme({ /* light theme */ }),
    dark: createTheme({ /* dark theme */ }),
    highContrast: createTheme({ /* accessibility theme */ }),
  };

  useEffect(() => {
    // Auto-detect user preferences
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setCurrentTheme(mediaQuery.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', (e) => {
      setCurrentTheme(e.matches ? 'dark' : 'light');
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedGenux() {
  const { currentTheme, themes } = useContext(ThemeContext);
  
  return (
    <Genux
      // ...
      options={{ theme: themes[currentTheme] }}
    />
  );
}
```

### 2. Dynamic Component Loading

```tsx
function DynamicGenux() {
  const [componentOverrides, setComponentOverrides] = useState({});
  
  useEffect(() => {
    // Load components based on user role, feature flags, etc.
    import('./admin/AdminChatWindow').then(module => {
      setComponentOverrides(prev => ({
        ...prev,
        ChatWindow: module.default,
      }));
    });
  }, [userRole]);

  return (
    <Genux
      // ...
      options={{ components: componentOverrides }}
    />
  );
}
```

### 3. Multi-Agent Support

```tsx
function MultiAgentChat() {
  const [activeAgent, setActiveAgent] = useState('support');
  
  const agents = {
    support: {
      name: 'Support Assistant',
      theme: createTheme({ colors: { primary: '#3b82f6' } }),
      websocketURL: 'wss://api.example.com/ws/support',
    },
    sales: {
      name: 'Sales Assistant', 
      theme: createTheme({ colors: { primary: '#10b981' } }),
      websocketURL: 'wss://api.example.com/ws/sales',
    },
  };

  return (
    <div>
      {/* Agent Selector */}
      <div className="flex space-x-2 mb-4">
        {Object.entries(agents).map(([key, agent]) => (
          <button
            key={key}
            onClick={() => setActiveAgent(key)}
            className={`px-4 py-2 rounded ${
              activeAgent === key ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {agent.name}
          </button>
        ))}
      </div>

      {/* Dynamic Genux Instance */}
      <Genux
        key={activeAgent} // Force re-mount on agent change
        webrtcURL="/api/offer"
        websocketURL={agents[activeAgent].websocketURL}
        options={{
          theme: agents[activeAgent].theme,
          agentName: agents[activeAgent].name,
        }}
      />
    </div>
  );
}
```

---

## Real-world Examples

### E-commerce Support Widget

```tsx
const ecommerceTheme = createTheme({
  colors: {
    primary: '#f59e0b', // Orange brand color
    secondary: '#d97706',
    background: '#fefbf3', // Warm background
  },
  borderRadius: { lg: '1rem' }, // Friendly rounded corners
});

function EcommerceSupport() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.shop.com/ws/support"
      options={{
        theme: ecommerceTheme,
        agentName: "Shopping Assistant",
        logoUrl: "/shop-logo.svg",
        mcpEndpoints: [
          { name: "product-catalog", url: "/mcp/products" },
          { name: "order-tracking", url: "/mcp/orders" },
        ],
      }}
    />
  );
}
```

### SaaS Onboarding Coach

```tsx
function OnboardingCoach() {
  return (
    <Genux
      webrtcURL="/api/offer" 
      websocketURL="wss://api.saas.com/ws/onboarding"
      bubbleEnabled={false} // Full-screen takeover
      options={{
        agentName: "Onboarding Coach",
        theme: createTheme({
          colors: { primary: '#6366f1' },
          typography: { fontFamily: 'Poppins, sans-serif' },
        }),
      }}
    />
  );
}
```

---

For more information, see:
- [Getting Started Guide](./genux-sdk-getting-started.md)
- [API Reference](./genux-sdk-api-reference.md)
- [Examples](./genux-sdk-examples.md)
- [Troubleshooting](./genux-sdk-troubleshooting.md) 