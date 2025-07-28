# Myna SDK - API Reference

Complete reference documentation for all Myna SDK components, hooks, and types.

## Table of Contents

- [Components](#components)
  - [`<Myna />`](#myna-)
  - [`<BubbleWidget />`](#bubblewidget-)
  - [`<ChatWindow />`](#chatwindow-)
  - [`<ChatButton />`](#chatbutton-)
- [Hooks](#hooks)
  - [`useMynaClient`](#usemynaclient)
- [Types](#types)
- [Theming](#theming)
- [Utilities](#utilities)

---

## Components

### `<Myna />`

The main component for integrating Myna SDK into your application.

#### Props

```tsx
interface MynaProps {
  webrtcURL: string;
  websocketURL: string;
  bubbleEnabled?: boolean;
  showThreadManager?: boolean;
  options?: MynaOptions;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `webrtcURL` | `string` | - | **Required.** HTTP POST endpoint for WebRTC SDP offer/answer negotiation |
| `websocketURL` | `string` | - | **Required.** WebSocket endpoint for message streaming |
| `bubbleEnabled` | `boolean` | `true` | If `true`, shows floating bubble widget. If `false`, renders full-screen interface |
| `showThreadManager` | `boolean` | `false` | Whether to show conversation history sidebar |
| `options` | `MynaOptions` | `{}` | Additional configuration options |

#### Usage

```tsx
import { Myna } from 'myna-sdk';

// Basic usage
<Myna
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
/>

// With options
<Myna
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  bubbleEnabled={false}
  showThreadManager={true}
  options={{
    agentName: "Support Bot",
    theme: customTheme,
  }}
/>
```

---

### `MynaOptions`

Configuration object for customizing Myna behavior and appearance.

```tsx
interface MynaOptions {
  visualization?: {
    provider: 'default' | 'custom' | 'none';
    render?: (msg: AssistantMessage, ctx: VisualizationContext) => React.ReactNode;
  };
  designSystem?: 'default' | 'shadcn';
  theme?: Partial<ThemeTokens>;
  mcpEndpoints?: MCPEndpoint[];
  components?: Partial<ComponentOverrides>;
  agentName?: string;
  logoUrl?: string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `visualization.provider` | `'default' \| 'custom' \| 'none'` | Visualization rendering strategy |
| `visualization.render` | `function` | Custom render function (when provider is 'custom') |
| `designSystem` | `'default' \| 'shadcn'` | Design system to use for styling |
| `theme` | `Partial<ThemeTokens>` | Custom theme overrides |
| `mcpEndpoints` | `MCPEndpoint[]` | Additional MCP endpoints for extended functionality |
| `components` | `Partial<ComponentOverrides>` | Component overrides for custom UI |
| `agentName` | `string` | Display name for the AI agent |
| `logoUrl` | `string` | URL for agent avatar/logo |

---

### `<BubbleWidget />`

Floating bubble widget that reveals controls on hover.

#### Props

```tsx
interface BubbleWidgetProps {
  onChatClick: () => void;
  onMicToggle: () => void;
  isMicActive: boolean;
  theme?: any;
  style?: CSSProperties;
  className?: string;
}
```

#### Usage

```tsx
import { BubbleWidget } from 'myna-sdk';

<BubbleWidget
  onChatClick={() => setIsChatOpen(true)}
  onMicToggle={handleVoiceToggle}
  isMicActive={isVoiceConnected}
/>
```

---

### `<ChatWindow />`

Full chat interface component.

#### Props

```tsx
interface ChatWindowProps {
  onClose?: () => void;
  messages: Message[];
  isLoading: boolean;
  isVoiceLoading: boolean;
  isEnhancing: boolean;
  onSendMessage: (message: string) => void;
  onToggleVoice: () => void;
  isVoiceConnected: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;
  theme?: Partial<ThemeTokens>;
  showThreadManager?: boolean;
  isFloating?: boolean;
}
```

---

### `<ChatButton />`

Simple floating chat button (alternative to BubbleWidget).

#### Props

```tsx
interface ChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  theme?: Partial<ThemeTokens>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  text?: string;
}
```

---

## Hooks

### `useMynaClient`

Headless hook providing complete control over Myna functionality.

#### Parameters

```tsx
interface UseMynaClientOptions {
  webrtcURL: string;
  websocketURL: string;
  mcpEndpoints?: MCPEndpoint[];
  autoConnect?: boolean;
  initialThreadId?: string;
}
```

#### Returns

```tsx
interface MynaClient {
  // Core methods
  sendText: (message: string) => void;
  startVoice: () => void;
  stopVoice: () => void;
  
  // State
  messages: Message[];
  connectionState: ConnectionState;
  voiceState: VoiceConnectionState;
  
  // Loading states
  isLoading: boolean;
  isVoiceLoading: boolean;
  isEnhancing: boolean;
  
  // Streaming
  streamingContent: string;
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  
  // Audio
  audioStream: MediaStream | null;
  
  // Thread management
  threadId: string | undefined;
  setThreadId: (threadId: string) => void;
  
  // Additional methods
  sendC1Action: (action: { llmFriendlyMessage: string, humanFriendlyMessage: string }) => void;
  clearMessages: () => void;
}
```

#### Usage

```tsx
import { useMynaClient } from 'myna-sdk';

function CustomChat() {
  const {
    messages,
    sendText,
    connectionState,
    voiceState,
    startVoice,
    stopVoice,
    isLoading,
  } = useMynaClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws/messages',
    autoConnect: true,
  });

  // Build your custom UI...
}
```

---

## Types

### Message Types

```tsx
type MessageRole = 'user' | 'assistant' | 'system';

interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: Date;
}

interface UserMessage extends BaseMessage {
  role: 'user';
  content: string;
  type?: 'prompt';
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  content?: string;
  c1Content?: string;
  hasVoiceOver?: boolean;
}

interface SystemMessage extends BaseMessage {
  role: 'system';
  content: string;
}

type Message = UserMessage | AssistantMessage | SystemMessage;
```

### Connection States

```tsx
type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
type VoiceConnectionState = 'connected' | 'connecting' | 'disconnected';
```

### MCP Endpoint

```tsx
interface MCPEndpoint {
  name: string;
  url: string;
  apiKey?: string;
}
```

### Component Overrides

```tsx
interface ComponentOverrides {
  ChatButton: React.ComponentType<ChatButtonProps>;
  ChatWindow: React.ComponentType<ChatWindowProps>;
  ChatMessage: React.ComponentType<ChatMessageProps>;
  ChatComposer: React.ComponentType<ChatComposerProps>;
  VoiceButton: React.ComponentType<VoiceButtonProps>;
}
```

---

## Theming

### Theme Tokens

```tsx
interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      regular: number;
      medium: number;
      bold: number;
    };
  };
}
```

### Theme Functions

#### `createTheme(customTheme?: Partial<ThemeTokens>): ThemeTokens`

Creates a complete theme by merging custom tokens with defaults.

```tsx
import { createTheme } from 'myna-sdk';

const myTheme = createTheme({
  colors: {
    primary: '#6366f1',
    secondary: '#a855f7',
  },
  borderRadius: {
    lg: '1rem',
  },
});
```

#### `themeToCssVars(theme: ThemeTokens, prefix?: string): Record<string, string>`

Converts theme tokens to CSS custom properties.

```tsx
import { themeToCssVars, createTheme } from 'myna-sdk';

const theme = createTheme({ /* ... */ });
const cssVars = themeToCssVars(theme, 'myna');

// Results in:
// {
//   '--myna-color-primary': '#6366f1',
//   '--myna-spacing-md': '1rem',
//   // ... etc
// }
```

#### Pre-built Themes

```tsx
import { defaultTheme, darkTheme } from 'myna-sdk';

// Use pre-built themes
<Myna
  // ...
  options={{ theme: darkTheme }}
/>
```

---

## Utilities

### ConnectionService

Low-level service for managing WebRTC and WebSocket connections.

```tsx
import { ConnectionService, ConnectionEvent } from 'myna-sdk';

const service = new ConnectionService({
  webrtcURL: '/api/offer',
  websocketURL: 'wss://api.example.com/ws/messages',
});

// Events
service.on(ConnectionEvent.MESSAGE_RECEIVED, (message) => {
  console.log('New message:', message);
});

service.on(ConnectionEvent.STATE_CHANGED, (state) => {
  console.log('Connection state:', state);
});

// Methods
await service.connectWebSocket();
await service.connectVoice();
service.sendChatMessage('Hello!');
service.disconnect();
```

### Connection Events

```tsx
enum ConnectionEvent {
  STATE_CHANGED = 'state_changed',
  VOICE_STATE_CHANGED = 'voice_state_changed',
  MESSAGE_RECEIVED = 'message_received',
  STREAMING_STARTED = 'streaming_started',
  STREAMING_CHUNK = 'streaming_chunk',
  STREAMING_DONE = 'streaming_done',
  TRANSCRIPTION = 'transcription',
  ENHANCEMENT_STARTED = 'enhancement_started',
  AUDIO_STREAM = 'audio_stream',
  ERROR = 'error'
}
```

---

## Error Handling

### Common Error Types

```tsx
// Connection errors
try {
  await service.connectWebSocket();
} catch (error) {
  if (error.message.includes('WebSocket')) {
    // Handle WebSocket connection error
  }
}

// Voice permission errors
try {
  await service.connectVoice();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // Handle microphone permission denied
  }
}
```

### Error Events

```tsx
service.on(ConnectionEvent.ERROR, (error) => {
  console.error('Myna SDK Error:', error);
  
  // Handle different error types
  if (error.type === 'connection') {
    // Connection failed
  } else if (error.type === 'permission') {
    // Permission denied
  }
});
```

---

For more examples and guides, see:
- [Getting Started Guide](./myna-sdk-getting-started.md)
- [Customization Guide](./myna-sdk-customization.md)
- [Examples](./myna-sdk-examples.md)
- [Troubleshooting](./myna-sdk-troubleshooting.md) 