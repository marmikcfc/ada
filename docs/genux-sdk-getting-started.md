# Genux SDK - Getting Started Guide

Welcome to Genux SDK! This guide will help you integrate a powerful voice and chat assistant into your web application in just a few minutes.

## Table of Contents

- [What is Genux SDK?](#what-is-genux-sdk)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Basic Examples](#basic-examples)
- [Next Steps](#next-steps)

## What is Genux SDK?

Genux SDK is a lightweight (≤100KB gzipped), fully-customizable JavaScript/TypeScript SDK that provides:

- **🎙️ Voice Conversations** - Real-time voice input and audio output
- **💬 Text Chat** - Traditional chat interface with streaming responses
- **🎨 Customizable UI** - From simple embedding to complete custom interfaces
- **⚡ Real-time Streaming** - Live response streaming with C1Component support
- **🔧 Headless Mode** - Build any UI you want with powerful hooks

## Installation

### Using npm

```bash
npm install genux-sdk
```

### Using pnpm

```bash
pnpm add genux-sdk
```

### Using yarn

```bash
yarn add genux-sdk
```

### Peer Dependencies

Genux SDK requires React 16.8+ as a peer dependency:

```bash
npm install react react-dom
```

## Quick Start

Get up and running in under 5 minutes with this minimal example:

### 1. Basic Floating Widget

```tsx
import React from 'react';
import { Genux } from 'genux-sdk';

function App() {
  return (
    <div>
      <h1>My App</h1>
      
      {/* Add Genux floating widget */}
      <Genux
        webrtcURL="https://your-backend.com/api/offer"
        websocketURL="wss://your-backend.com/ws/messages"
      />
    </div>
  );
}

export default App;
```

That's it! This renders a floating chat button in the bottom-right corner that expands into a full chat interface when clicked.

### 2. Full-Screen Chat Interface

```tsx
import React from 'react';
import { Genux } from 'genux-sdk';

function ChatPage() {
  return (
    <Genux
      webrtcURL="https://your-backend.com/api/offer"
      websocketURL="wss://your-backend.com/ws/messages"
      bubbleEnabled={false} // Renders full-screen instead of floating
    />
  );
}
```

### Local Development & CSS Import

For local development with bundlers like Vite, follow these steps:

1. **Set up WebSocket proxy** in your `vite.config.ts`:
```js
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});
```

2. **Use relative URLs** in your application:
```tsx
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  bubbleEnabled={true}
  allowFullScreen={true}
/>
```

3. **Import the fullscreen layout CSS** so the 3-column grid and glass-morphism styles are applied:
```ts
// From the built package (dist)
import 'genux-sdk/dist/FullscreenLayout.css';

// Or when using the source files directly:
import 'genux-sdk/src/components/FullscreenLayout.css';
```

## Core Concepts

### 1. **Dual-Path Architecture**
- **Fast Path**: Real-time voice with immediate audio responses
- **Slow Path**: Enhanced visual responses with C1Components

### 2. **Two Rendering Modes**
- **Floating Widget** (`bubbleEnabled={true}`): Floating button that expands
- **Full-Screen** (`bubbleEnabled={false}`): Takes the full viewport

### 3. **Connection Types**
- **WebRTC**: For voice input/output and real-time communication
- **WebSocket**: For text messages and streaming responses

### 4. **Customization Levels**
- **Theme-based**: Colors, spacing, typography
- **Component-based**: Replace individual UI components  
- **Headless**: Build completely custom interfaces

## Basic Examples

### Example 1: Themed Widget

```tsx
import { Genux, createTheme } from 'genux-sdk';

const customTheme = createTheme({
  colors: {
    primary: '#6366f1', // Custom brand color
    secondary: '#a855f7',
  },
  borderRadius: {
    lg: '1rem', // Rounded corners
  },
});

function ThemedApp() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      options={{
        theme: customTheme,
        agentName: "Support Assistant",
        logoUrl: "/company-logo.png",
      }}
    />
  );
}
```

### Example 2: Custom Agent Configuration

```tsx
import { Genux } from 'genux-sdk';

function CustomAgentApp() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      showThreadManager={true} // Show conversation history sidebar
      options={{
        agentName: "Sales Assistant",
        logoUrl: "/sales-bot-avatar.png",
        mcpEndpoints: [
          {
            name: "knowledge-base",
            url: "https://api.example.com/mcp/kb",
          },
          {
            name: "crm-integration", 
            url: "https://api.example.com/mcp/crm",
            apiKey: process.env.REACT_APP_CRM_API_KEY,
          }
        ],
      }}
    />
  );
}
```

### Example 3: Headless Custom UI

```tsx
import { useGenuxClient } from 'genux-sdk';

function CustomChatInterface() {
  const {
    messages,
    sendText,
    connectionState,
    voiceState,
    startVoice,
    stopVoice,
    isLoading,
  } = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws/messages',
  });

  return (
    <div className="my-custom-chat">
      <div className="status">
        Connection: {connectionState} | Voice: {voiceState}
      </div>
      
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="controls">
        <input 
          type="text" 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendText(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          placeholder="Type a message..."
        />
        <button 
          onClick={() => voiceState === 'connected' ? stopVoice() : startVoice()}
        >
          {voiceState === 'connected' ? 'Stop Voice' : 'Start Voice'}
        </button>
      </div>
    </div>
  );
}
```

## Configuration Requirements

### Backend Endpoints

Your backend needs to provide two endpoints:

1. **WebRTC Endpoint** (`webrtcURL`