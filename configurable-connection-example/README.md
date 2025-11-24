# Configurable Connection Example

A standalone example demonstrating how to configure WebSocket and WebRTC connections with the GeUI SDK for different environments and use cases.

## Features Demonstrated

- **Multiple Environment Presets** - Local, Staging, Production configurations
- **Custom URL Configuration** - Set your own WebSocket and WebRTC endpoints
- **Feature Toggles** - Enable/disable voice features and bubble mode
- **Advanced Connection Options** - Reconnection, timeout, and retry settings
- **Real-time Connection Status** - Monitor connection state and health
- **Environment-specific Settings** - Switch between development and production setups

## Quick Start

```bash
# From the root of the GeUI SDK repository
cd configurable-connection-example

# Install dependencies
pnpm install

# Run the example
pnpm dev
```

The app will open at [http://localhost:5173](http://localhost:5173)

## Use Cases

This example is perfect for:

1. **Development vs Production** - Different backend URLs per environment
2. **Multi-tenant Applications** - Different endpoints per customer
3. **A/B Testing** - Compare different backend configurations
4. **Edge Deployments** - Connect to regional endpoints
5. **Custom Backends** - Use your own WebSocket/WebRTC infrastructure

## Configuration Options

### Environment Presets

The example includes three pre-configured environments:

```typescript
// Local Development
websocketURL: 'ws://localhost:8000/ws/per-connection-messages'
webrtcURL: 'http://localhost:8000/api/offer'

// Staging
websocketURL: 'wss://staging-api.example.com/ws/per-connection-messages'
webrtcURL: 'https://staging-api.example.com/api/offer'

// Production
websocketURL: 'wss://api.example.com/ws/per-connection-messages'
webrtcURL: 'https://api.example.com/api/offer'
```

### Basic Usage

```typescript
import GeUI from 'geui-sdk';

<GeUI
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  webrtcURL="http://localhost:8000/api/offer"
  bubbleEnabled={true}
  disableVoice={false}
/>
```

### Advanced Options

Configure connection behavior with advanced options:

```typescript
<GeUI
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  webrtcURL="http://localhost:8000/api/offer"
  options={{
    // Connection reliability
    reconnectAttempts: 3,      // Number of reconnection attempts
    reconnectDelay: 1000,      // Delay between attempts (ms)
    connectionTimeout: 30000,  // Connection timeout (ms)

    // UI customization
    agentName: "AI Assistant",
    welcomeMessage: "How can I help you today?",

    // Theme customization
    theme: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2'
      }
    }
  }}
/>
```

## Environment Variables

Create a `.env` file in this directory (copy from `.env.example`):

```bash
# WebSocket Configuration
VITE_WS_URL_DEV=ws://localhost:8000/ws/per-connection-messages
VITE_WS_URL_STAGING=wss://staging-api.example.com/ws/per-connection-messages
VITE_WS_URL_PROD=wss://api.example.com/ws/per-connection-messages

# WebRTC Configuration
VITE_WEBRTC_URL_DEV=http://localhost:8000/api/offer
VITE_WEBRTC_URL_STAGING=https://staging-api.example.com/api/offer
VITE_WEBRTC_URL_PROD=https://api.example.com/api/offer

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_BUBBLE_MODE=true
```

Then use in your code:

```typescript
const config = {
  websocketURL: import.meta.env.VITE_WS_URL_DEV,
  webrtcURL: import.meta.env.VITE_WEBRTC_URL_DEV
};
```

## Key Learnings

### Security Best Practices

- ✅ Use `wss://` (secure WebSocket) in production
- ✅ Use `https://` for WebRTC endpoints in production
- ✅ Store sensitive URLs in environment variables
- ✅ Implement authentication tokens when needed

### Connection Management

- Configure appropriate timeout values for your use case
- Enable reconnection for better reliability
- Monitor connection state for debugging
- Handle connection errors gracefully

### Environment-Specific Configuration

```typescript
// Dynamically select configuration based on environment
const getConfig = () => {
  const env = import.meta.env.MODE;

  const configs = {
    development: {
      websocketURL: import.meta.env.VITE_WS_URL_DEV,
      webrtcURL: import.meta.env.VITE_WEBRTC_URL_DEV
    },
    staging: {
      websocketURL: import.meta.env.VITE_WS_URL_STAGING,
      webrtcURL: import.meta.env.VITE_WEBRTC_URL_STAGING
    },
    production: {
      websocketURL: import.meta.env.VITE_WS_URL_PROD,
      webrtcURL: import.meta.env.VITE_WEBRTC_URL_PROD
    }
  };

  return configs[env] || configs.development;
};
```

## Backend Requirements

Your backend must provide:

1. **WebSocket Endpoint** - For text chat and message streaming
   - Example: `/ws/per-connection-messages`
   - Handles: text messages, streaming responses, connection state

2. **WebRTC Endpoint** - For voice features (optional)
   - Example: `/api/offer`
   - Handles: WebRTC offer/answer exchange, audio streaming

## Project Structure

```
configurable-connection-example/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   └── main.tsx             # Entry point
├── package.json             # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── index.html              # HTML template
├── .env.example            # Environment variable template
└── README.md               # This file
```

## Related Examples

- Main Example App: [../example](../example) - Full demo suite
- GeUI SDK: [../packages/geui-sdk](../packages/geui-sdk) - Core SDK package

## Support

- Documentation: See [CLAUDE.md](../CLAUDE.md) for comprehensive SDK documentation
- Issues: Report issues in the main repository
- Backend Setup: See [../backend](../backend) for backend implementation
