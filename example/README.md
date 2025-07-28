# GenUI SDK Example App

A comprehensive demonstration app showcasing all features of the GenUI SDK, built with React, TypeScript, and Tauri.

## Overview

This example app demonstrates the full capabilities of the GenUI SDK including voice interactions, text chat, AI-powered UI generation, theme customization, and advanced features like fullscreen modes and component overrides.

## Features Demonstrated

### Core Features
- **Voice Chat** - Real-time voice conversations with WebRTC
- **Text Chat** - WebSocket-based messaging with streaming responses
- **AI Visualization** - Rich UI components generated from AI responses
- **Theme System** - Light, dark, and custom themes with real-time switching
- **Multi-Framework Support** - HTML generation for Tailwind, Chakra UI, Material UI

### Advanced Features
- **Fullscreen Mode** - Immersive 3-column layout with 3D voice visualization
- **Component Overrides** - Custom UI components and layouts
- **Per-Connection Processing** - Isolated AI processing per user session
- **MCP Integration** - Tool-enhanced AI responses with external capabilities
- **Thread Management** - Conversation persistence and organization

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Backend server running (see backend README)

### Installation

```bash
# Navigate to example directory
cd example

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Or build for production
pnpm build
```

### Configuration

The app automatically connects to:
- **WebSocket**: `ws://localhost:8000/ws/per-connection-messages`
- **WebRTC**: `http://localhost:8000/api/offer`

Update connection URLs in demos if your backend runs on different ports.

## Demo Scenarios

### 1. Voice Bot Demo (`VoiceBotDemo.tsx`)
**Full-featured voice and text interface**

- Voice input with real-time transcription
- AI-generated visual responses
- Text chat with message history
- Bubble widget for quick access

```typescript
<Genux
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  bubbleEnabled={true}
  allowFullScreen={true}
/>
```

### 2. Chat Only Demo (`ChatOnlyDemo.tsx`) 
**Pure text chat without voice features**

- Disabled voice functionality
- No microphone permissions required
- Optimized for text-only workflows

```typescript
<Genux
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  disableVoice={true}
  bubbleEnabled={false}
/>
```

### 3. Voice First Mode Demo (`VoiceFirstModeDemo.tsx`)
**Immersive fullscreen voice experience**

- 3-column layout with thread list, voice UI, and chat
- 3D animated blob for voice visualization
- Thread management and persistence

```typescript
<Genux
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  bubbleEnabled={false}
  allowFullScreen={true}
/>
```

### 4. Theme Showcase Demo (`ThemeShowcaseDemo.tsx`)
**Real-time theme switching demonstration**

- Light, dark, and default themes
- Rich content examples (tables, lists, code)
- Real-time theme switching
- Demonstrates dual theme system (GenUX + Crayon)

### 5. UI Framework Demo (`UIFrameworkDemo.tsx`)
**Multi-framework HTML generation**

- Backend generates framework-specific HTML
- Support for Tailwind, Chakra UI, Material UI
- Interactive forms and components
- Real-time framework switching

### 6. Custom Fullscreen Demo (`CustomFullscreenDemo.tsx`)
**Component override demonstration**

- Custom thread list, voice UI, and chat components
- Branded interfaces and layouts
- Flexible column configuration

### 7. Standalone Voice Bot Demo (`StandaloneVoiceBotDemo.tsx`)
**Headless SDK usage example**

- Direct use of `useGenuxClient` hook
- Custom UI implementation
- Manual audio playback handling

## Project Structure

```
example/
├── src/
│   ├── demos/                    # Demo scenarios
│   │   ├── VoiceBotDemo.tsx     # Full voice + chat demo
│   │   ├── ChatOnlyDemo.tsx     # Text-only demo
│   │   ├── VoiceFirstModeDemo.tsx # Fullscreen voice demo
│   │   ├── ThemeShowcaseDemo.tsx # Theme switching demo
│   │   ├── UIFrameworkDemo.tsx   # Multi-framework demo
│   │   └── CustomFullscreenDemo.tsx # Component override demo
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   └── MCPServerConfig.tsx  # MCP configuration component
│   │
│   ├── App.tsx                  # Main application
│   ├── DemoRouter.tsx           # Demo navigation
│   └── ConfigurableGeUIClient.tsx # Configurable SDK wrapper
│
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
└── vite.config.ts              # Vite configuration
```

## Key Technologies

### Frontend Stack
- **React 18** - UI framework with hooks and context
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast development and building
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Pre-built component library

### GenUI SDK Integration
- **@your-org/genux-sdk** - Core SDK package
- **@thesysai/genui-sdk** - C1 component rendering
- **@crayonai/react-ui** - Theme system integration

### Development Tools
- **ESLint + Prettier** - Code formatting and linting
- **TypeScript** - Type checking
- **PostCSS** - CSS processing

## Development Commands

```bash
# Development server with hot reload
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview

# Clean build artifacts
pnpm clean
```

## Usage Patterns

### Basic Integration
```typescript
import { Genux } from '@your-org/genux-sdk';

function MyApp() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="ws://localhost:8000/ws/per-connection-messages"
      bubbleEnabled={true}
      options={{
        agentName: "My Assistant",
        theme: lightTheme,
        crayonTheme: crayonLightTheme
      }}
    />
  );
}
```

### Headless Usage
```typescript
import { useGenuxClient } from '@your-org/genux-sdk';

function CustomInterface() {
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'ws://localhost:8000/ws/per-connection-messages'
  });

  const { messages, sendText, startVoice, voiceState } = client;

  // Custom UI implementation using client state
  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
    </div>
  );
}
```

### Theme Customization
```typescript
import { createTheme, toCrayonTheme } from '@your-org/genux-sdk';

const customTheme = createTheme({
  colors: {
    primary: '#your-brand-color',
    background: '#your-bg-color'
  }
});

const customCrayonTheme = toCrayonTheme(customTheme);

<Genux
  options={{
    theme: customTheme,
    crayonTheme: customCrayonTheme
  }}
/>
```

## Testing Different Scenarios

### Voice Features
1. Start the voice bot demo
2. Click the microphone button
3. Speak a question or command
4. Observe real-time transcription and AI response with voice output

### Text Chat
1. Open the chat-only demo
2. Type messages in the input field
3. Watch streaming AI responses with rich UI components

### Theme Switching
1. Open the theme showcase demo
2. Use the theme selector to switch between light/dark/default
3. Observe how both text and rich content adapt to the theme

### UI Frameworks
1. Open the UI framework demo
2. Switch between different frameworks (Tailwind, Chakra, etc.)
3. Submit forms and interact with generated components

## Troubleshooting

### Common Issues

1. **WebSocket connection failed**
   - Ensure backend server is running on port 8000
   - Check browser console for connection errors
   - Verify WebSocket URL is correct

2. **Voice not working**
   - Ensure HTTPS is used (required for microphone access)
   - Check microphone permissions in browser
   - Verify WebRTC offer endpoint is accessible

3. **Themes not applying**
   - Ensure both `theme` and `crayonTheme` are provided
   - Check that CSS imports are in correct order
   - Verify theme objects are valid

4. **C1 components not rendering**
   - Ensure `@thesysai/genui-sdk` is installed
   - Check that ThemeProvider is wrapping C1Component
   - Verify C1 content is valid JSON

### Debug Tips

- Open browser DevTools Network tab to monitor WebSocket messages
- Check browser console for SDK-related errors
- Use the connection status indicators in demo UIs
- Enable debug mode in SDK options for verbose logging

## Contributing

1. Add new demos to the `demos/` directory
2. Follow existing patterns for WebSocket and WebRTC integration
3. Include proper TypeScript types and error handling
4. Add comprehensive examples in demo descriptions

## Deployment

### Static Site Deployment
```bash
# Build for production
pnpm build

# Deploy dist/ directory to your hosting platform
```

### Tauri Desktop App
```bash
# Install Tauri CLI
cargo install tauri-cli

# Build desktop app
pnpm tauri build

# Development with desktop app
pnpm tauri dev
```

## License

[Your License Here]