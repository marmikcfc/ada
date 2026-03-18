# GeUI SDK - Technical Design Document

**Version:** 1.0
**Last Updated:** 2025-11-28
**Authors:** GeUI Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Frontend SDK](#3-frontend-sdk)
4. [Backend Services](#4-backend-services)
5. [Communication Protocols](#5-communication-protocols)
6. [Feature Implementation](#6-feature-implementation)
7. [Sequence Diagrams](#7-sequence-diagrams)
8. [API Reference](#8-api-reference)
9. [Configuration](#9-configuration)
10. [Security Considerations](#10-security-considerations)

**Appendices**
- [Appendix A: Error Codes](#appendix-a-error-codes)
- [Appendix B: Performance Specifications](#appendix-b-performance-specifications)
- [Appendix C: Browser Support](#appendix-c-browser-support)
- [Appendix D: SOLID Principles & DRY Analysis](#appendix-d-solid-principles--dry-analysis)

---

## 1. Executive Summary

### 1.1 Overview

GeUI SDK is a comprehensive conversational AI framework that combines voice and text chat capabilities with rich interactive components. The system enables developers to add enterprise-grade conversational AI to applications with minimal integration effort while providing complete customization capabilities.

### 1.2 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Dual Interface** | Simultaneous voice (WebRTC) and text (WebSocket) communication |
| **C1 Components** | Rich, interactive UI components rendered from AI responses |
| **Multi-Format Content** | Support for C1 XML, HTML (Tailwind/Chakra/MUI), React, plain text |
| **Thread Management** | Conversation persistence and organization |
| **Theme System** | Dual theming (GenUI + Crayon) with complete customization |
| **Component Overrides** | Full UI customization capability |
| **MCP Integration** | Model Context Protocol for tool calling |
| **Real-time Streaming** | Live AI response streaming with incremental updates |

### 1.3 Technology Stack

```
+-------------------------------------------------------------------+
|                        Frontend SDK                                |
|  React 18 | TypeScript | Three.js | Pipecat | Jotai | Vite        |
+-------------------------------------------------------------------+
                              |
                    WebSocket + WebRTC
                              |
+-------------------------------------------------------------------+
|                        Backend Services                            |
|  FastAPI | Python 3.11+ | Pipecat | Deepgram | Cartesia | OpenAI  |
+-------------------------------------------------------------------+
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
+------------------------------------------------------------------------------+
|                              Client Application                               |
|  +------------------------------------------------------------------------+  |
|  |                           GeUI SDK                                      |  |
|  |  +--------------+  +--------------+  +------------------------------+  |  |
|  |  | BubbleWidget |  |  ChatWindow  |  | VoiceBotFullscreenLayout    |  |  |
|  |  +------+-------+  +------+-------+  +--------------+---------------+  |  |
|  |         |                 |                         |                   |  |
|  |  +------+-----------------+-------------------------+---------------+  |  |
|  |  |                    useGeUIClient Hook                             |  |  |
|  |  |  +-------------------------------------------------------------+ |  |  |
|  |  |  |                  ConnectionService                          | |  |  |
|  |  |  |   +-----------------+     +-----------------------------+   | |  |  |
|  |  |  |   |    WebSocket    |     |         WebRTC              |   | |  |  |
|  |  |  |   |   (Text Chat)   |     |    (Voice Audio)            |   | |  |  |
|  |  |  |   +--------+--------+     +------------+----------------+   | |  |  |
|  |  |  +------------+-------------------------- +--------------------+ |  |  |
|  |  +---------------+-------------------------- +----------------------+  |  |
|  +------------------+-------------------------- +--------------------------+  |
+---------------------+-------------------------- +-----------------------------+
                      |                          |
                      |         Network          |
                      v                          v
+------------------------------------------------------------------------------+
|  +------------------------------------------------------------------------+  |
|  |                         FastAPI Backend                                |  |
|  |  +--------------------+     +-------------------------------------+    |  |
|  |  |  /ws/per-connection|     |         /api/offer                  |    |  |
|  |  |     -messages      |     |        (WebRTC)                     |    |  |
|  |  +---------+----------+     +-----------------+-------------------+    |  |
|  |            |                                  |                        |  |
|  |  +---------+----------------------------------+-------------------+    |  |
|  |  |                   ConnectionManager                            |    |  |
|  |  |  +-----------------+  +-----------------+  +-----------------+ |    |  |
|  |  |  |ConnectionProcess|  |  VoiceManager  |  |ChatHistoryManager| |    |  |
|  |  |  +--------+--------+  +--------+-------+  +-----------------+ |    |  |
|  |  +-----------+--------------------|-------------------------------+    |  |
|  |              |                    |                                    |  |
|  |  +-----------+--------------------+-------------------------------+    |  |
|  |  |                    EnhancedMCPClientAgent                      |    |  |
|  |  |  +------------+  +------------------+  +--------------------+  |    |  |
|  |  |  | MCP Client |  | Visualization    |  |   LLM Integration  |  |    |  |
|  |  |  |   (Tools)  |  |   Providers      |  |   (OpenAI/Claude)  |  |    |  |
|  |  |  +------------+  +------------------+  +--------------------+  |    |  |
|  |  +----------------------------------------------------------------+    |  |
|  +------------------------------------------------------------------------+  |
|                              Backend Services                                 |
+------------------------------------------------------------------------------+
```

### 2.2 Data Flow Overview

```
User Input                                                      AI Response
    |                                                                |
    v                                                                v
+---------+     +-------------+     +---------+     +---------------------+
|  Text   |---->|  WebSocket  |---->|   LLM   |---->|  Visualization      |
|  Input  |     |  Message    |     | Process |     |  Enhancement        |
+---------+     +-------------+     +---------+     +---------------------+
                                                               |
+---------+     +-------------+     +---------+                |
|  Voice  |---->|   WebRTC    |---->|   STT   |----------------+
|  Input  |     |   Audio     |     | Process |                |
+---------+     +-------------+     +---------+                |
                                                               v
                +-------------+     +---------+     +---------------------+
                |  WebSocket  |<----|Response |<----|  Content Streaming  |
                |  Stream     |     | Format  |     |  (C1/HTML/Text)     |
                +-------------+     +---------+     +---------------------+
                       |
                       v
                +-----------------------------------------------------+
                |              FlexibleContentRenderer                 |
                |  +------+  +------+  +-------+  +----------------+  |
                |  |  C1  |  | HTML |  | React |  |   Plain Text   |  |
                |  +------+  +------+  +-------+  +----------------+  |
                +-----------------------------------------------------+
```

### 2.3 Per-Connection Architecture

Each client connection is isolated with its own:

```
+---------------------------------------------------------------------+
|                    Per-Connection State                              |
|  +-----------------+  +-----------------+  +---------------------+   |
|  |  WebSocket      |  |  Message Queue  |  |  MCP Configuration  |   |
|  |  Connection     |  |  (100 items)    |  |  (Servers + Tools)  |   |
|  +-----------------+  +-----------------+  +---------------------+   |
|  +-----------------+  +-----------------+  +---------------------+   |
|  |  Voice Agent    |  |  Chat History   |  |  Visualization      |   |
|  |  (WebRTC)       |  |  (Threads)      |  |  Provider           |   |
|  +-----------------+  +-----------------+  +---------------------+   |
+---------------------------------------------------------------------+
```

---

## 3. Frontend SDK

### 3.1 Package Structure

```
packages/geui-sdk/
├── src/
│   ├── components/
│   │   ├── core/                    # Building blocks
│   │   │   ├── AnimatedBlob.tsx     # 3D WebGL visualization
│   │   │   ├── BubbleWidget.tsx     # Floating widget
│   │   │   ├── ChatMessage.tsx      # Message renderer
│   │   │   ├── FlexibleContentRenderer.tsx  # Multi-format content
│   │   │   ├── MessageComposer.tsx  # Text input
│   │   │   ├── ThreadList.tsx       # Thread management
│   │   │   ├── VoiceBot.tsx         # Voice controls
│   │   │   └── VoiceBotUI.tsx       # Voice display
│   │   ├── composite/               # Complete interfaces
│   │   │   ├── ChatWindow.tsx       # Chat interface
│   │   │   ├── MinimizableChatWindow.tsx
│   │   │   ├── ThreadedChatWindow.tsx
│   │   │   ├── FullscreenLayout.tsx
│   │   │   └── VoiceBotFullscreenLayout.tsx
│   │   ├── defaults/                # Default implementations
│   │   └── GeUI.tsx                 # Main entry point
│   ├── core/
│   │   └── ConnectionService.ts     # WebSocket/WebRTC management
│   ├── hooks/
│   │   ├── useGeUIClient.ts         # Main client hook
│   │   └── useThreadManager.ts      # Thread management hook
│   ├── theming/
│   │   ├── defaultTheme.ts          # Theme definitions
│   │   └── comprehensiveThemes.ts   # Extended themes
│   ├── types/
│   │   └── index.ts                 # TypeScript definitions
│   └── index.ts                     # Public exports
├── package.json
└── tsup.config.ts
```

### 3.2 Component Hierarchy

```
GeUI (Main Orchestrator)
│
├── Mode: bubbleEnabled={true}
│   │
│   ├── BubbleWidget
│   │   ├── Chat Button --> MinimizableChatWindow
│   │   │                   └── ChatWindow
│   │   │                        ├── ChatMessage[]
│   │   │                        │   └── FlexibleContentRenderer
│   │   │                        └── MessageComposer
│   │   ├── Mic Button --> Voice Connection (ConnectionService)
│   │   └── Fullscreen Button --> VoiceBotFullscreenLayout
│   │
│   └── Hidden Audio Element (for voice playback)
│
└── Mode: bubbleEnabled={false}
    │
    └── VoiceBotFullscreenLayout (3-Column Immersive)
        ├── Left Column: ThreadList
        │   └── Thread items with edit/delete
        ├── Center Column: AnimatedBlob (3D WebGL)
        │   └── VoiceBotUI controls
        └── Right Column: ChatWindow
            ├── ChatMessage[]
            │   └── FlexibleContentRenderer
            └── MessageComposer
```

### 3.3 Core Components

#### 3.3.1 GeUI (Main Component)

**File:** `src/components/GeUI.tsx`

```typescript
interface GeUIProps {
  // Required
  webrtcURL: string;           // WebRTC offer endpoint
  websocketURL: string;        // WebSocket message endpoint

  // Optional
  bubbleEnabled?: boolean;     // Show floating widget (default: true)
  showThreadManager?: boolean; // Display thread sidebar
  allowFullScreen?: boolean;   // Enable fullscreen modal
  disableVoice?: boolean;      // Remove all voice features
  options?: GeUIOptions;       // Comprehensive configuration
}

interface GeUIOptions {
  // Display
  agentName?: string;
  agentSubtitle?: string;
  logoUrl?: string;
  welcomeMessage?: string;

  // Theming
  theme?: ThemeTokens;
  crayonTheme?: CrayonTheme;
  backgroundColor?: string;
  primaryColor?: string;

  // Framework
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'inline' | 'c1';
  designSystem?: string;

  // MCP Configuration
  mcpEndpoints?: MCPEndpoint[];

  // Component Overrides
  components?: ComponentOverrides;
  fullscreenComponents?: {
    ThreadList?: React.ComponentType<ThreadListProps>;
    VoiceBotUI?: React.ComponentType<VoiceBotUIProps>;
    ChatWindow?: React.ComponentType<ChatWindowProps>;
  };
  fullscreenLayout?: {
    showThreadList?: boolean;
    showVoiceBot?: boolean;
    showChatWindow?: boolean;
    columnWidths?: string;
  };

  // Thread Management
  threadManager?: ThreadManagerOptions;

  // Interaction Handlers
  onFormSubmit?: (formId: string, data: FormData) => void;
  onButtonClick?: (actionType: string, context: object) => void;
  onInputChange?: (fieldName: string, value: string) => void;
  onLinkClick?: (href: string, context: object) => void;
  onWebSocketConnect?: (ws: WebSocket) => void;
}
```

#### 3.3.2 BubbleWidget

**File:** `src/components/core/BubbleWidget.tsx`

Floating circular widget with expandable action buttons.

```typescript
interface BubbleWidgetProps {
  onChatClick: () => void;
  onMicToggle: () => void;
  isMicActive: boolean;
  onFullScreenClick?: () => void;
  allowFullScreen?: boolean;
  showVoiceButton?: boolean;
  theme?: ThemeTokens;
  style?: React.CSSProperties;
  className?: string;
}
```

**Visual Behavior:**
```
Collapsed State:        Expanded State (on hover):
    +---+                   +---+
    | * |                   | C |  <-- Chat
    +---+                   +---+
                            | M |  <-- Voice
                            +---+
                            | F |  <-- Fullscreen
                            +---+
```

#### 3.3.3 ChatWindow

**File:** `src/components/composite/ChatWindow.tsx`

Complete chat interface with message history and input.

```typescript
interface ChatWindowProps {
  // Required
  messages: Message[];
  onSendMessage: (message: string) => void;

  // Optional - Display
  header?: React.ReactNode;
  agentName?: string;

  // Optional - State
  isLoading?: boolean;
  isEnhancing?: boolean;
  isMinimized?: boolean;
  showMinimizeButton?: boolean;

  // Optional - Voice
  showVoiceButton?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;

  // Optional - Streaming
  streamingContent?: string;
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;

  // Optional - C1 Interactions
  onC1Action?: (action: C1Action) => void;
  sendC1Action?: (action: SendC1Action) => void;

  // Optional - Theming
  theme?: ThemeTokens;
  crayonTheme?: CrayonTheme;
  className?: string;
  style?: React.CSSProperties;

  // Optional - Custom Rendering
  renderMessage?: (message: Message) => React.ReactNode;
}
```

#### 3.3.4 FlexibleContentRenderer

**File:** `src/components/core/FlexibleContentRenderer.tsx`

Multi-format content renderer supporting C1, HTML, React, and text.

```typescript
interface FlexibleContentRendererProps {
  content: string;
  contentType: 'c1' | 'html' | 'react' | 'text';
  framework?: 'tailwind' | 'shadcn' | 'chakra' | 'mui' | 'bootstrap' | 'c1' | 'inline';
  reactContent?: React.ReactNode;
  onC1Action?: (action: C1Action) => void;
  sendC1Action?: (action: SendC1Action) => void;
  isStreaming?: boolean;
  crayonTheme?: CrayonTheme;
  allowDangerousHtml?: boolean;
  htmlSanitizeOptions?: SanitizeOptions;
}
```

**Content Type Handling:**

```
+---------------------------------------------------------------------+
|                    FlexibleContentRenderer                           |
|                                                                      |
|  Input: content string + contentType                                 |
|         |                                                            |
|         v                                                            |
|  +------------------------------------------------------------------+|
|  |                    Content Detection                              ||
|  |  1. Check for <content> wrapper -> extract inner C1               ||
|  |  2. Check for HTML entity encoding -> decode                      ||
|  |  3. Detect content type if not specified                          ||
|  +------------------------------------------------------------------+|
|         |                                                            |
|         v                                                            |
|  +------------------------------------------------------------------+|
|  |                    Render by Type                                 ||
|  |                                                                   ||
|  |  contentType='c1'    -> <C1Component c1Response={...} />          ||
|  |  contentType='html'  -> DOMPurify.sanitize() -> dangerousHTML     ||
|  |  contentType='react' -> {reactContent}                            ||
|  |  contentType='text'  -> <span>{content}</span>                    ||
|  +------------------------------------------------------------------+|
|         |                                                            |
|         v                                                            |
|  +------------------------------------------------------------------+|
|  |                    Theme Wrapping                                 ||
|  |  <ThemeProvider theme={crayonTheme}>                              ||
|  |    {rendered content}                                             ||
|  |  </ThemeProvider>                                                 ||
|  +------------------------------------------------------------------+|
+---------------------------------------------------------------------+
```

#### 3.3.5 AnimatedBlob

**File:** `src/components/core/AnimatedBlob.tsx`

3D WebGL animated sphere for voice visualization using Three.js.

```typescript
interface AnimatedBlobProps {
  audioAnalyser?: AnalyserNode;
  isActive?: boolean;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}
```

**Rendering Pipeline:**
```
Audio Input --> AnalyserNode --> Frequency Data --> Vertex Displacement --> 3D Sphere
```

### 3.4 Hooks

#### 3.4.1 useGeUIClient

**File:** `src/hooks/useGeUIClient.ts`

Primary hook for headless SDK usage.

```typescript
interface UseGeUIClientOptions extends ConnectionServiceOptions {
  initialThreadId?: string;
  autoConnect?: boolean;  // default: true
}

interface GeUIClientReturn {
  // Connection State
  connectionState: ConnectionState;    // 'connected' | 'connecting' | 'disconnected' | 'error'
  voiceState: VoiceConnectionState;    // 'connected' | 'connecting' | 'disconnected'

  // Messages
  messages: Message[];
  streamingContent: string;
  streamingContentType: 'c1' | 'html';
  streamingMessageId: string | null;
  isStreamingActive: boolean;

  // Loading States
  isLoading: boolean;
  isEnhancing: boolean;
  isVoiceLoading: boolean;

  // Audio
  audioStream: MediaStream | null;

  // Thread
  threadId?: string;
  setThreadId: (threadId: string) => void;

  // Actions
  sendText: (message: string) => void;
  startVoice: () => void;
  stopVoice: () => void;
  sendC1Action: (action: { llmFriendlyMessage: string; humanFriendlyMessage: string }) => void;
  clearMessages: () => void;

  // Utilities
  getBackendConnectionId: () => string | null;
  isReadyForVoice: () => boolean;
}
```

**Usage Example:**
```typescript
const MyCustomChat = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const client = useGeUIClient({
    webrtcURL: '/api/offer',
    websocketURL: 'ws://localhost:8000/ws/per-connection-messages',
    autoConnect: true
  });

  // CRITICAL: Connect audio stream for voice playback
  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);

  return (
    <div>
      {/* Hidden audio element - REQUIRED for voice */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

      {/* Messages */}
      {client.messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}

      {/* Input */}
      <input onKeyPress={e => {
        if (e.key === 'Enter') {
          client.sendText(e.target.value);
        }
      }} />

      {/* Voice Toggle */}
      <button onClick={() => {
        client.voiceState === 'connected'
          ? client.stopVoice()
          : client.startVoice();
      }}>
        {client.voiceState === 'connected' ? 'Stop' : 'Start'} Voice
      </button>
    </div>
  );
};
```

#### 3.4.2 useThreadManager

**File:** `src/hooks/useThreadManager.ts`

Conversation thread management with persistence.

```typescript
interface UseThreadManagerOptions {
  storageKey?: string;              // default: 'geui-threads'
  enablePersistence?: boolean;      // default: true
  generateTitle?: (msg: string) => string;
  maxThreadsInMemory?: number;
  maxThreads?: number;
  autoGenerateTitles?: boolean;
  showCreateButton?: boolean;
  allowThreadDeletion?: boolean;
}

interface UseThreadManagerResult {
  // State
  threads: ThreadSummary[];
  activeThreadId: string | null;
  currentThread: Thread | null;
  isCreatingThread: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  createThread: (initialMessage?: string) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  updateThread: (threadId: string, message: string, messageId: string) => void;
  getThread: (threadId: string) => Thread | null;
  clearAllThreads: () => void;
  refreshThreads: () => void;
}
```

### 3.5 ConnectionService

**File:** `src/core/ConnectionService.ts`

Manages WebSocket and WebRTC connections with event-driven architecture.

```typescript
interface ConnectionServiceOptions {
  webrtcURL?: string;
  websocketURL: string;
  mcpEndpoints?: MCPEndpoint[];
  autoReconnect?: boolean;           // default: false
  reconnectInterval?: number;        // default: 5000ms
  maxReconnectAttempts?: number;     // default: 5
  uiFramework?: string;
  visualizationProvider?: VisualizationConfig;
  onFormSubmit?: (formId: string, data: FormData) => void;
  onButtonClick?: (actionType: string, context: object) => void;
  onInputChange?: (fieldName: string, value: string) => void;
  onLinkClick?: (href: string, context: object) => void;
  onWebSocketConnect?: (ws: WebSocket) => void;
}

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
  INTERACTION_PROCESSING = 'interaction_processing',
  INTERACTION_COMPLETE = 'interaction_complete',
  INTERACTION_LOADING = 'interaction_loading',
  ERROR = 'error'
}
```

**Connection Lifecycle:**
```
+----------------------------------------------------------------------+
|                    ConnectionService Lifecycle                        |
|                                                                       |
|  Initialization:                                                      |
|  +---------+    +-----------------+    +------------------------+     |
|  |  new()  |--->| connectWebSocket|--->| Wait for connection_   |     |
|  +---------+    |                 |    | established message    |     |
|                 +-----------------+    +------------------------+     |
|                                                                       |
|  Voice Connection:                                                    |
|  +-------------+    +--------------+    +-----------------------+     |
|  |connectVoice |--->| Create Offer |--->| POST /api/offer       |     |
|  +-------------+    +--------------+    +-----------------------+     |
|                                                 |                     |
|                     +--------------+    +-------v---------------+     |
|                     |Audio Stream  |<---| Set Remote Answer     |     |
|                     |Available     |    +-----------------------+     |
|                     +--------------+                                  |
|                                                                       |
|  Message Flow:                                                        |
|  +-------------+    +--------------+    +-----------------------+     |
|  | sendMessage |--->| WebSocket    |--->| Backend Processing    |     |
|  +-------------+    |   send()     |    +-----------------------+     |
|                     +--------------+                                  |
|                                                                       |
|  Events Emitted:                                                      |
|  * STATE_CHANGED (connecting -> connected -> disconnected)            |
|  * VOICE_STATE_CHANGED (voice connection state)                       |
|  * MESSAGE_RECEIVED (complete messages)                               |
|  * STREAMING_CHUNK (incremental content)                              |
|  * STREAMING_DONE (stream complete)                                   |
|  * AUDIO_STREAM (MediaStream available)                               |
+----------------------------------------------------------------------+
```

### 3.6 Type Definitions

#### 3.6.1 Message Types

```typescript
type MessageRole = 'user' | 'assistant' | 'system';

interface UserMessage {
  id: string;
  role: 'user';
  content: string;
  timestamp: Date;
  type?: 'prompt';
}

interface AssistantMessage {
  id: string;
  role: 'assistant';
  content: string;
  contentType: 'c1' | 'html' | 'react' | 'text';
  framework?: 'tailwind' | 'shadcn' | 'chakra' | 'mui' | 'bootstrap' | 'c1' | 'inline';
  reactContent?: React.ReactNode;
  timestamp: Date;
  isLoading?: boolean;
  hasVoiceOver?: boolean;
  allowDangerousHtml?: boolean;
}

interface SystemMessage {
  id: string;
  role: 'system';
  content: string;
  timestamp: Date;
}

type Message = UserMessage | AssistantMessage | SystemMessage;
```

#### 3.6.2 Theme Types

```typescript
interface ThemeTokens {
  colors: {
    // Brand (47 color tokens)
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;

    // Background hierarchy
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceHover: string;
    elevated: string;
    overlay: string;

    // Text hierarchy
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    textDisabled: string;

    // Interactive
    link: string;
    linkHover: string;
    linkVisited: string;

    // Border
    border: string;
    borderHover: string;
    borderFocus: string;
    borderDisabled: string;

    // Semantic
    error: string;
    errorBackground: string;
    errorBorder: string;
    success: string;
    successBackground: string;
    successBorder: string;
    warning: string;
    warningBackground: string;
    warningBorder: string;
    info: string;
    infoBackground: string;
    infoBorder: string;

    // Chat-specific
    chatUserBubble: string;
    chatUserText: string;
    chatAssistantBubble: string;
    chatAssistantText: string;
    chatTimestamp: string;
  };

  spacing: {
    '0': string;      // 0
    '3xs': string;    // 2px
    '2xs': string;    // 4px
    xs: string;       // 8px
    sm: string;       // 12px
    md: string;       // 16px
    lg: string;       // 24px
    xl: string;       // 32px
    '2xl': string;    // 48px
    '3xl': string;    // 64px
  };

  borderRadius: {
    none: string;     // 0
    '3xs': string;    // 2px
    '2xs': string;    // 4px
    xs: string;       // 6px
    sm: string;       // 8px
    md: string;       // 12px
    lg: string;       // 16px
    xl: string;       // 24px
    '2xl': string;    // 32px
    '3xl': string;    // 48px
    full: string;     // 9999px
  };

  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSize: { '3xs' to '5xl' };
    fontWeight: { thin to black };
    lineHeight: { tight, normal, relaxed, loose };
    letterSpacing: { tight to widest };
    heading: { h1 to h6 };
    body: { large, medium, small };
    label: { large, medium, small };
    code: { fontSize, fontWeight, fontFamily, lineHeight, letterSpacing };
  };

  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
  };

  effects: {
    backdropBlur: string;
    transition: string;
    transitionFast: string;
    transitionSlow: string;
  };
}
```

### 3.7 Exports Summary

```typescript
// Main Component
export { default as GeUI } from './components/GeUI';

// Composite Components
export { ChatWindow, MinimizableChatWindow, ThreadedChatWindow, FullscreenLayout } from './components/composite';
export { default as VoiceBotFullscreenLayout } from './components/composite/VoiceBotFullscreenLayout';

// Core Components
export { BubbleWidget, ChatMessage, MessageComposer, ThreadList, VoiceBot, VoiceBotUI, FlexibleContentRenderer } from './components/core';
export { default as AnimatedBlob } from './components/core/AnimatedBlob';
export { default as ChatButton } from './components/ChatButton';

// Default Components
export { DefaultChatButton, DefaultBubbleWidget } from './components/defaults';

// Hooks
export { useGeUIClient } from './hooks/useGeUIClient';
export { useThreadManager } from './hooks/useThreadManager';

// Services
export { ConnectionService, ConnectionEvent } from './core/ConnectionService';

// Theming
export { defaultTheme, lightTheme, darkTheme, createTheme, themeToCssVars, toCrayonTheme } from './theming/defaultTheme';
export { crayonLightTheme, crayonDarkTheme, crayonDefaultTheme, type CrayonTheme } from './theming/defaultTheme';
export { comprehensiveLightTheme, comprehensiveDarkTheme, comprehensiveDefaultTheme } from './theming/comprehensiveThemes';

// Types (all exported)
export type { GeUIProps, GeUIOptions, GeUIClient, Message, ThemeTokens, ... };
```

---

## 4. Backend Services

### 4.1 Directory Structure

```
backend/
├── app/
│   ├── server.py                    # FastAPI application setup
│   ├── routes/
│   │   └── chat.py                  # WebSocket endpoint handler
│   ├── config.py                    # Configuration management
│   ├── models.py                    # Pydantic data models
│   ├── connection_manager.py        # Connection lifecycle
│   ├── connection_processor.py      # Message processing
│   ├── voice_manager.py             # Voice agent registry
│   ├── voice_broadcast_manager.py   # Voice message routing
│   ├── chat_history_manager.py      # Conversation persistence
│   └── webrtc.py                    # WebRTC offer/answer
├── agent/
│   ├── enhanced_mcp_client_agent.py # MCP client with tools
│   └── voice_based_interaction_agent.py  # Voice pipeline
├── visualization/
│   ├── base.py                      # Base visualization class
│   ├── factory.py                   # Provider factory
│   ├── thesys_provider.py           # TheSys C1 provider
│   ├── openai_provider.py           # OpenAI HTML provider
│   ├── anthropic_provider.py        # Claude HTML provider
│   └── google_provider.py           # Gemini HTML provider
├── mcp_servers.json                 # MCP server configuration
├── main.py                          # Entry point
└── requirements.txt                 # Python dependencies
```

### 4.2 Core Services

#### 4.2.1 ConnectionManager

**File:** `app/connection_manager.py`

Manages WebSocket connection lifecycle with state machine.

```python
class ConnectionState(Enum):
    CONNECTING = "connecting"
    CONFIG_RECEIVED = "config_received"
    VALIDATING = "validating"
    MCP_INITIALIZING = "mcp_initializing"
    VIZ_INITIALIZING = "viz_initializing"
    READY = "ready"
    ACTIVE = "active"
    ERROR = "error"
    DISCONNECTING = "disconnecting"
    CLOSED = "closed"

class ConnectionManager:
    async def register_connection(self, connection_id: str, websocket: WebSocket)
    async def configure_connection(self, connection_id: str, config: dict)
    async def update_state(self, connection_id: str, state: ConnectionState, progress: int = None)
    async def send_message(self, connection_id: str, message: dict)
    async def unregister_connection(self, connection_id: str)
```

**State Transition Diagram:**
```
                    +---------------+
                    |  CONNECTING   |
                    +-------+-------+
                            |
                    +-------v-------+
                    |CONFIG_RECEIVED|
                    +-------+-------+
                            |
                    +-------v-------+
                    |  VALIDATING   |
                    +-------+-------+
                            |
            +---------------+---------------+
            |               |               |
     +------v-------+       |       +-------v------+
     |MCP_INITIALIZING      |       |  VIZ_INIT    |
     +------+-------+       |       +-------+------+
            |               |               |
            +---------------+---------------+
                            |
                    +-------v-------+
                    |    READY      |
                    +-------+-------+
                            |
                    +-------v-------+
                    |    ACTIVE     |<-----+
                    +-------+-------+      |
                            |         (messages)
                    +-------v-------+      |
         +--------->|    ERROR      |------+
         |          +-------+-------+
    (any state)             |
                    +-------v-------+
                    |DISCONNECTING  |
                    +-------+-------+
                            |
                    +-------v-------+
                    |    CLOSED     |
                    +---------------+
```

#### 4.2.2 ConnectionProcessor

**File:** `app/connection_processor.py`

Per-connection message processing with enhancement decision.

```python
class ConnectionProcessor:
    def __init__(self, connection_id: str, config: ConnectionConfig):
        self.mcp_client: EnhancedMCPClientAgent
        self.visualization_provider: BaseVisualizationProvider
        self.raw_output_queue: asyncio.Queue
        self.message_queue: asyncio.Queue

    async def process_message(self, message: str, thread_id: str) -> None
    async def _make_enhancement_decision(self, message: str, mcp_response: str) -> EnhancementDecision
    async def _process_with_enhancement(self, message: str, mcp_response: str, thread_id: str) -> None
    async def _stream_visualization(self, content: str, thread_id: str) -> None
```

**Processing Pipeline:**
```
User Message
    |
    v
+---------------------------------------------------------------------+
|                    MCP Client Processing                             |
|  +-------------+    +-------------+    +-------------------------+   |
|  | Tool Calls  |--->|  Execute    |--->|  Aggregate Results      |   |
|  | Decision    |    |  Tools      |    |                         |   |
|  +-------------+    +-------------+    +-------------------------+   |
+---------------------------------------------------------------------+
    |
    v
+---------------------------------------------------------------------+
|                  Enhancement Decision                                |
|  +---------------------------------------------------------------+  |
|  |  Should enhance?                                               |  |
|  |  * Complex data -> Yes (charts, tables)                        |  |
|  |  * Simple text -> No (plain response)                          |  |
|  |  * Interactive -> Yes (forms, buttons)                         |  |
|  +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+
    |
    +-- Yes ------------------------+
    |                               |
    v                               v
+---------------+         +------------------------+
| Plain Text    |         | Visualization Provider |
| Response      |         | (TheSys/OpenAI/Claude) |
+---------------+         +------------------------+
                                    |
                                    v
                          +------------------------+
                          | Stream C1/HTML Tokens  |
                          +------------------------+
```

#### 4.2.3 VoiceManager

**File:** `app/voice_manager.py`

Voice agent registry and lifecycle management.

```python
class VoiceManager:
    def __init__(self):
        self._agents: Dict[str, VoiceInterfaceAgent] = {}
        self._thread_mapping: Dict[str, str] = {}  # thread_id -> connection_id

    async def register_voice_agent(self, connection_id: str, agent: VoiceInterfaceAgent)
    async def unregister_voice_agent(self, connection_id: str)
    def get_agent(self, connection_id: str) -> Optional[VoiceInterfaceAgent]
    def get_connection_for_thread(self, thread_id: str) -> Optional[str]
```

#### 4.2.4 VoiceBroadcastManager

**File:** `app/voice_broadcast_manager.py`

Routes voice messages to appropriate WebSocket connections.

```python
class VoiceBroadcastManager:
    def __init__(self):
        self._subscribers: Dict[str, asyncio.Queue] = {}

    async def subscribe(self, connection_id: str) -> asyncio.Queue
    async def unsubscribe(self, connection_id: str)
    async def broadcast(self, connection_id: str, message: dict)
```

#### 4.2.5 ChatHistoryManager

**File:** `app/chat_history_manager.py`

Conversation persistence and thread management.

```python
class ChatHistoryManager:
    def __init__(self):
        self._threads: Dict[str, List[Message]] = {}
        self._metadata: Dict[str, ThreadMetadata] = {}

    async def add_user_message(self, thread_id: str, content: str) -> str
    async def add_assistant_message(self, thread_id: str, content: str, content_type: str) -> str
    async def get_history(self, thread_id: str, limit: int = 50) -> List[Message]
    async def get_thread_summary(self, thread_id: str) -> ThreadSummary
```

### 4.3 Voice Pipeline

**File:** `agent/voice_based_interaction_agent.py`

WebRTC voice processing with Pipecat framework.

```python
class VoiceInterfaceAgent:
    def __init__(
        self,
        connection_id: str,
        voice_thread_id: str,
        mcp_client: EnhancedMCPClientAgent,
        visualization_provider: BaseVisualizationProvider
    ):
        self.transport: SmallWebRTCTransport
        self.stt: DeepgramSTTService
        self.llm: OpenAILLMService
        self.tts: CartesiaTTSService
        self.vad: SileroVADAnalyzer

    async def start_pipeline(self) -> None
    async def stop_pipeline(self) -> None
```

**Voice Pipeline Architecture:**
```
+---------------------------------------------------------------------+
|                      Pipecat Voice Pipeline                          |
|                                                                      |
|  +--------------+                                                    |
|  |   WebRTC     |                                                    |
|  |   Input      |                                                    |
|  +------+-------+                                                    |
|         | audio                                                      |
|         v                                                            |
|  +--------------+                                                    |
|  |   VAD        |  (Silero Voice Activity Detection)                 |
|  |   Analyzer   |                                                    |
|  +------+-------+                                                    |
|         | speech segments                                            |
|         v                                                            |
|  +--------------+                                                    |
|  |   Noise      |  (Optional noise reduction)                        |
|  |   Filter     |                                                    |
|  +------+-------+                                                    |
|         | cleaned audio                                              |
|         v                                                            |
|  +--------------+     +--------------------------------------+       |
|  |   Deepgram   |---->|  user_transcription message          |       |
|  |   STT        |     |  -> WebSocket -> Frontend            |       |
|  +------+-------+     +--------------------------------------+       |
|         | text                                                       |
|         v                                                            |
|  +--------------+                                                    |
|  |   OpenAI     |  (with MCP tool integration)                       |
|  |   LLM        |                                                    |
|  +------+-------+                                                    |
|         | response + tool calls                                      |
|         +--------------------------------+                           |
|         |                                |                           |
|         v                                v                           |
|  +--------------+            +--------------------------+            |
|  |   Cartesia   |            |  Visualization           |            |
|  |   TTS        |            |  Enhancement             |            |
|  +------+-------+            |  (parallel processing)   |            |
|         | audio              +--------------------------+            |
|         v                                |                           |
|  +--------------+                        |                           |
|  |   WebRTC     |                        |                           |
|  |   Output     |                        |                           |
|  +--------------+                        |                           |
|                                          v                           |
|  +-------------------------------------------------------------------+
|  |  voice_response + c1_token/html_token messages                    |
|  |  -> VoiceBroadcastManager -> WebSocket -> Frontend                |
|  +-------------------------------------------------------------------+
+---------------------------------------------------------------------+
```

### 4.4 MCP Integration

**File:** `agent/enhanced_mcp_client_agent.py`

Model Context Protocol client for tool calling.

```python
class EnhancedMCPClientAgent:
    def __init__(
        self,
        model: str = "gpt-4o",
        mcp_servers: List[MCPServerConfig] = None,
        max_tool_calls: int = 10,
        timeout: int = 30
    ):
        self.llm_client: OpenAI | Anthropic
        self.mcp_servers: List[MCPServer]
        self.available_tools: List[Tool]

    async def process_message(self, message: str, history: List[Message]) -> MCPResponse
    async def execute_tools(self, tool_calls: List[ToolCall]) -> List[ToolResult]
```

**MCP Server Configuration (mcp_servers.json):**
```json
{
  "servers": [
    {
      "name": "web-search",
      "transport": "http",
      "url": "https://mcp.example.com/search",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      },
      "tools": ["search_web", "fetch_url"]
    },
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "tools": ["read_file", "write_file", "list_directory"]
    }
  ]
}
```

**Tool Calling Flow:**
```
+---------------------------------------------------------------------+
|                    MCP Tool Calling Flow                             |
|                                                                      |
|  1. User Message                                                     |
|     |                                                                |
|     v                                                                |
|  2. LLM decides which tools to call                                  |
|     |                                                                |
|     v                                                                |
|  3. Tool Call Requests                                               |
|     +------------------------------------------------------------+  |
|     |  {                                                          |  |
|     |    "tool": "search_web",                                    |  |
|     |    "arguments": { "query": "weather in NYC" }               |  |
|     |  }                                                          |  |
|     +------------------------------------------------------------+  |
|     |                                                                |
|     v                                                                |
|  4. MCP Server Execution (parallel if multiple)                      |
|     |                                                                |
|     v                                                                |
|  5. Tool Results                                                     |
|     +------------------------------------------------------------+  |
|     |  {                                                          |  |
|     |    "tool": "search_web",                                    |  |
|     |    "result": { "weather": "72F, Sunny" }                    |  |
|     |  }                                                          |  |
|     +------------------------------------------------------------+  |
|     |                                                                |
|     v                                                                |
|  6. LLM generates final response with tool results                   |
|                                                                      |
+---------------------------------------------------------------------+
```

### 4.5 Visualization Providers

**Directory:** `visualization/`

```python
# Base class
class BaseVisualizationProvider(ABC):
    @abstractmethod
    async def generate(self, content: str, context: dict) -> AsyncGenerator[str, None]:
        """Stream visualization content"""
        pass

    @abstractmethod
    def get_content_type(self) -> str:
        """Return 'c1' or 'html'"""
        pass

# TheSys Provider (C1 Components)
class TheSysVisualizationProvider(BaseVisualizationProvider):
    async def generate(self, content: str, context: dict) -> AsyncGenerator[str, None]:
        # Streams C1 XML tokens
        async for token in self.client.stream(content):
            yield token

    def get_content_type(self) -> str:
        return 'c1'

# OpenAI Provider (HTML)
class OpenAIVisualizationProvider(BaseVisualizationProvider):
    async def generate(self, content: str, context: dict) -> AsyncGenerator[str, None]:
        # Streams HTML with specified framework classes
        async for token in self.client.stream(content, framework=context.get('framework')):
            yield token

    def get_content_type(self) -> str:
        return 'html'
```

**Supported Providers:**

| Provider | Output Type | Use Case |
|----------|-------------|----------|
| **TheSys** | C1 XML | Rich interactive components |
| **OpenAI** | HTML | Framework-specific HTML (Tailwind, etc.) |
| **Anthropic** | HTML | Claude-generated HTML |
| **Google** | HTML | Gemini-generated HTML |

---

## 5. Communication Protocols

### 5.1 WebSocket Protocol

**Endpoint:** `ws://host:port/ws/per-connection-messages`

#### 5.1.1 Connection Handshake

```
+--------------------------------------------------------------------+
|                    WebSocket Handshake                              |
|                                                                     |
|  Client                                           Server            |
|    |                                                |               |
|    |-------- WebSocket Connect ------------------>  |               |
|    |                                                |               |
|    |<------- connection_established ---------------|               |
|    |         {                                      |               |
|    |           "type": "connection_established",    |               |
|    |           "connection_id": "conn-abc123"       |               |
|    |         }                                      |               |
|    |                                                |               |
|    |-------- connection_config ------------------>  |               |
|    |         {                                      |               |
|    |           "type": "connection_config",         |               |
|    |           "config": {                          |               |
|    |             "visualization_provider": {...},   |               |
|    |             "mcp_config": {...},               |               |
|    |             "preferences": {...}               |               |
|    |           }                                    |               |
|    |         }                                      |               |
|    |                                                |               |
|    |<------- connection_state (VALIDATING) --------|               |
|    |<------- connection_state (MCP_INIT) ----------|               |
|    |<------- connection_state (VIZ_INIT) ----------|               |
|    |<------- connection_state (READY) -------------|               |
|    |<------- connection_state (ACTIVE) ------------|               |
|    |                                                |               |
|    |                Ready for messages              |               |
|    |                                                |               |
+--------------------------------------------------------------------+
```

#### 5.1.2 Message Types

**Client -> Server:**

| Type | Description | Payload |
|------|-------------|---------|
| `connection_config` | Initial configuration | `{ config: ConnectionConfig }` |
| `chat` | Text message | `{ content: string, thread_id?: string }` |
| `chat_request` | Alternative chat format | `{ message: string, thread_id?: string }` |
| `thesys_bridge` | C1 component interaction | `{ action: C1Action }` |
| `user_interaction` | Form/button interaction | `{ interactionType, context }` |

**Server -> Client:**

| Type | Description | Payload |
|------|-------------|---------|
| `connection_established` | Connection ACK | `{ connection_id: string }` |
| `connection_state` | State update | `{ state: string, progress?: number }` |
| `text_chat_response` | Complete response | `{ content, contentType, id }` |
| `chat_token` | Text stream chunk | `{ token: string, id: string }` |
| `c1_token` | C1 stream chunk | `{ token: string, id: string }` |
| `html_token` | HTML stream chunk | `{ token: string, id: string }` |
| `chat_done` | Stream complete | `{ id: string }` |
| `user_transcription` | Voice-to-text | `{ text: string, is_final: boolean }` |
| `voice_response` | Voice response | `{ text, audio_url?, visualization? }` |
| `immediate_voice_response` | Fast-path response | `{ text: string }` |
| `enhancement_started` | Enhancement loading | `{ id: string }` |
| `error` | Error message | `{ code: string, message: string }` |

#### 5.1.3 Message Flow Examples

**Text Chat Flow:**
```json
// Client sends
{
  "type": "chat",
  "content": "What's the weather in NYC?",
  "thread_id": "thread-123"
}

// Server streams
{ "type": "enhancement_started", "id": "msg-456" }
{ "type": "c1_token", "token": "<Card>", "id": "msg-456" }
{ "type": "c1_token", "token": "<Title>Weather</Title>", "id": "msg-456" }
{ "type": "c1_token", "token": "...</Card>", "id": "msg-456" }
{ "type": "chat_done", "id": "msg-456" }
```

**User Interaction Flow:**
```json
// Client sends form submission
{
  "type": "user_interaction",
  "interactionType": "form_submit",
  "context": {
    "formId": "contact-form",
    "formData": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "timestamp": "2024-01-20T10:30:00Z"
  }
}

// Server processes and responds
{ "type": "enhancement_started", "id": "msg-789" }
{ "type": "c1_token", "token": "<Card>...", "id": "msg-789" }
{ "type": "chat_done", "id": "msg-789" }
```

### 5.2 WebRTC Protocol

**Endpoint:** `POST /api/offer`

#### 5.2.1 Connection Flow

```
+--------------------------------------------------------------------+
|                    WebRTC Connection Flow                           |
|                                                                     |
|  Client                                           Server            |
|    |                                                |               |
|    |-------- Create Offer -------------------------|               |
|    |         (getUserMedia for mic access)         |               |
|    |                                                |               |
|    |-------- POST /api/offer --------------------->|               |
|    |         {                                      |               |
|    |           "sdp": "v=0...",                     |               |
|    |           "type": "offer",                     |               |
|    |           "backend_connection_id": "conn-123"  |               |
|    |         }                                      |               |
|    |                                                |               |
|    |                                   +------------+               |
|    |                                   |Create Voice|               |
|    |                                   |Agent       |               |
|    |                                   |Start Pipeline              |
|    |                                   +------------+               |
|    |                                                |               |
|    |<------- Answer --------------------------------|               |
|    |         {                                      |               |
|    |           "sdp": "v=0...",                     |               |
|    |           "type": "answer"                     |               |
|    |         }                                      |               |
|    |                                                |               |
|    |-------- ICE Candidates ----------------------->|               |
|    |<------- ICE Candidates ------------------------|               |
|    |                                                |               |
|    |========== Audio Stream Connected =============|               |
|    |                                                |               |
+--------------------------------------------------------------------+
```

#### 5.2.2 Request/Response Format

**Request:**
```json
POST /api/offer
Content-Type: application/json

{
  "sdp": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n...",
  "type": "offer",
  "backend_connection_id": "conn-abc123"
}
```

**Response:**
```json
{
  "sdp": "v=0\r\no=- 4611731400430051337 2 IN IP4 127.0.0.1\r\n...",
  "type": "answer"
}
```

### 5.3 Global SDK Object

The SDK exposes a global `window.geui` object for HTML content interactions:

```typescript
interface GlobalGeUISDK {
  handleFormSubmit(event: Event, formId: string): void;
  handleButtonClick(event: Event, actionType: string, context?: object): void;
  handleInputChange(event: Event, fieldName: string): void;
  handleLinkClick(event: Event, href: string, context?: object): void;
  sendInteraction(type: string, context: object): void;
}

// Usage in generated HTML
<form onsubmit="window.geui.handleFormSubmit(event, 'contact-form')">
  <input name="email" onchange="window.geui.handleInputChange(event, 'email')" />
  <button type="submit">Submit</button>
</form>

<button onclick="window.geui.handleButtonClick(event, 'add_to_cart', {productId: '123'})">
  Add to Cart
</button>
```

---

## 6. Feature Implementation

### 6.1 Real-time Streaming

**Implementation Pattern:**

```typescript
// Frontend: useGeUIClient.ts
useEffect(() => {
  connectionService.on(ConnectionEvent.STREAMING_CHUNK, (data) => {
    setStreamingContent(prev => prev + data.token);
    setStreamingMessageId(data.id);
    setIsStreamingActive(true);
  });

  connectionService.on(ConnectionEvent.STREAMING_DONE, (data) => {
    // Convert streaming content to permanent message
    const newMessage: AssistantMessage = {
      id: data.id,
      role: 'assistant',
      content: streamingContent,
      contentType: data.contentType,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setStreamingContent('');
    setStreamingMessageId(null);
    setIsStreamingActive(false);
  });
}, []);
```

```python
# Backend: connection_processor.py
async def _stream_visualization(self, content: str, thread_id: str) -> None:
    async for token in self.visualization_provider.generate(content, context):
        await self.message_queue.put({
            "type": f"{self.visualization_provider.get_content_type()}_token",
            "token": token,
            "id": self.current_message_id,
            "thread_id": thread_id
        })

    await self.message_queue.put({
        "type": "chat_done",
        "id": self.current_message_id,
        "contentType": self.visualization_provider.get_content_type()
    })
```

### 6.2 C1 Component Integration

**C1 XML Structure:**
```xml
<Card>
  <Title>Weather Report</Title>
  <Content>
    <Text>Current temperature: 72F</Text>
    <Chart type="line" data="{{temperatureData}}" />
  </Content>
  <Actions>
    <Button action="refresh">Refresh</Button>
    <Button action="share">Share</Button>
  </Actions>
</Card>
```

**Frontend Rendering:**
```typescript
// FlexibleContentRenderer.tsx
if (contentType === 'c1') {
  return (
    <ThemeProvider theme={crayonTheme}>
      <C1Component
        c1Response={content}
        onAction={(action) => {
          // Handle C1 component actions
          sendC1Action?.({
            llmFriendlyMessage: action.llmMessage,
            humanFriendlyMessage: action.humanMessage
          });
        }}
        isStreaming={isStreaming}
      />
    </ThemeProvider>
  );
}
```

### 6.3 Voice + Visualization Sync

**Fast-Path Response Pattern:**

```
User speaks: "What's the weather?"
    |
    v
+---------------------------------------------------------------------+
|                    Parallel Processing                               |
|                                                                      |
|  +---------------------+    +-------------------------------------+  |
|  |  Fast Path (TTS)    |    |  Slow Path (Enhancement)            |  |
|  |                     |    |                                      |  |
|  |  LLM generates      |    |  MCP tools execute                   |  |
|  |  quick response     |    |  Visualization generates             |  |
|  |       |             |    |       |                              |  |
|  |       v             |    |       v                              |  |
|  |  immediate_voice_   |    |  c1_token stream                     |  |
|  |  response           |    |       |                              |  |
|  |       |             |    |       v                              |  |
|  |       v             |    |  chat_done                           |  |
|  |  TTS -> Audio       |    |                                      |  |
|  |  Playback           |    |                                      |  |
|  +---------------------+    +-------------------------------------+  |
|                                                                      |
|  Timeline:                                                           |
|  |---- 0.5s: Voice starts responding ---------------------------|   |
|  |---- 1.0s: Enhancement streaming begins -----------------------|   |
|  |---- 2.0s: Full visualization displayed -----------------------|   |
+---------------------------------------------------------------------+
```

### 6.4 Thread Management

**Thread Lifecycle:**

```
+---------------------------------------------------------------------+
|                    Thread Lifecycle                                  |
|                                                                      |
|  Create Thread                                                       |
|  |                                                                   |
|  |  1. User sends first message                                      |
|  |  2. Auto-generate title from first message                        |
|  |  3. Assign unique thread ID                                       |
|  |  4. Store in localStorage (if persistence enabled)                |
|  |                                                                   |
|  v                                                                   |
|  Active Thread                                                       |
|  |                                                                   |
|  |  * Messages accumulated in thread                                 |
|  |  * History sent with each request for context                     |
|  |  * Voice agent bound to thread ID                                 |
|  |                                                                   |
|  v                                                                   |
|  Thread Actions                                                      |
|  |                                                                   |
|  +-- Switch Thread: Load different conversation                      |
|  +-- Rename Thread: Update title                                     |
|  +-- Delete Thread: Remove from storage                              |
|  +-- Create New: Start fresh conversation                            |
|                                                                      |
+---------------------------------------------------------------------+
```

### 6.5 Theme System

**Dual Theme Architecture:**

```
+---------------------------------------------------------------------+
|                    Dual Theme System                                 |
|                                                                      |
|  +-------------------------+    +-----------------------------+      |
|  |    GeUI Theme           |    |    Crayon Theme             |      |
|  |    (ThemeTokens)        |    |    (CrayonTheme)            |      |
|  |                         |    |                              |      |
|  |  Controls:              |    |  Controls:                   |      |
|  |  * Chat bubbles         |    |  * C1 Components             |      |
|  |  * Buttons              |    |  * Tables                    |      |
|  |  * Inputs               |    |  * Code blocks               |      |
|  |  * Widget styling       |    |  * Markdown                  |      |
|  |  * Layout colors        |    |  * Charts                    |      |
|  |                         |    |                              |      |
|  |  CSS Variables:         |    |  CSS Variables:              |      |
|  |  --geui-color-*         |    |  --crayon-*                  |      |
|  |  --geui-spacing-*       |    |                              |      |
|  |  --geui-radius-*        |    |                              |      |
|  +-------------------------+    +-----------------------------+      |
|                                                                      |
|  Usage:                                                              |
|  <GeUI                                                               |
|    options={{                                                        |
|      theme: lightTheme,           // GeUI components                 |
|      crayonTheme: crayonLightTheme   // Rich content                 |
|    }}                                                                |
|  />                                                                  |
+---------------------------------------------------------------------+
```

---

## 7. Sequence Diagrams

### 7.1 Text Chat Flow

```
+----------+          +----------+          +----------+          +----------+
|  User    |          |  GeUI    |          |  Backend |          |Viz Provider
|          |          |  SDK     |          |  Server  |          |  (TheSys)|
+----+-----+          +----+-----+          +----+-----+          +----+-----+
     |                     |                     |                     |
     | Type message        |                     |                     |
     |-------------------->|                     |                     |
     |                     |                     |                     |
     |                     | sendText()          |                     |
     |                     | WebSocket: chat     |                     |
     |                     |-------------------->|                     |
     |                     |                     |                     |
     |                     |                     | MCP Process         |
     |                     |                     | (tool calls)        |
     |                     |                     |                     |
     |                     |                     | Enhancement Decision|
     |                     |                     |-------------------->|
     |                     |                     |                     |
     |                     | enhancement_started |                     |
     |                     |<--------------------|                     |
     |                     |                     |                     |
     | Show loading        |                     |<-- Stream tokens ---|
     |<--------------------|                     |                     |
     |                     |                     |                     |
     |                     | c1_token (stream)   |                     |
     |                     |<--------------------|                     |
     |                     |                     |                     |
     | Update UI           |                     |                     |
     | (incremental)       |                     |                     |
     |<--------------------|                     |                     |
     |                     |                     |                     |
     |                     | chat_done           |                     |
     |                     |<--------------------|                     |
     |                     |                     |                     |
     | Display complete    |                     |                     |
     | C1 Component        |                     |                     |
     |<--------------------|                     |                     |
     |                     |                     |                     |
```

### 7.2 Voice Interaction Flow

```
+----------+     +----------+     +----------+     +----------+     +----------+
|  User    |     |  GeUI    |     |  Backend |     |  Voice   |     |  LLM/    |
|          |     |  SDK     |     |  Server  |     |  Agent   |     |  TTS     |
+----+-----+     +----+-----+     +----+-----+     +----+-----+     +----+-----+
     |                |                |                |                |
     | Click Mic      |                |                |                |
     |--------------->|                |                |                |
     |                |                |                |                |
     |                | startVoice()   |                |                |
     |                | POST /api/offer|                |                |
     |                |--------------->|                |                |
     |                |                |                |                |
     |                |                | Create Agent   |                |
     |                |                |--------------->|                |
     |                |                |                |                |
     |                | WebRTC Answer  |                |                |
     |                |<---------------|                |                |
     |                |                |                |                |
     | Audio Connected|                |                |                |
     |<---------------|                |                |                |
     |                |                |                |                |
     | Speak          |                |                |                |
     |===============>|================|===============>|                |
     |                | Audio Stream   |                |                |
     |                |                |                |                |
     |                |                |                | STT Deepgram   |
     |                |                |                |--------------->|
     |                |                |                |                |
     |                | user_transcription              |                |
     |                |<---------------|<---------------|                |
     |                |                |                |                |
     | Show transcript|                |                | LLM Process    |
     |<---------------|                |                |--------------->|
     |                |                |                |                |
     |                |                |                |<-- Response ---|
     |                |                |                |                |
     |                | immediate_voice_response        |                |
     |                |<---------------|<---------------|                |
     |                |                |                |                |
     |                |                |                | TTS Cartesia   |
     |                |<==================================================
     | Hear response  |                |                |                |
     |<---------------|                |                |                |
     |                |                |                |                |
     |                | c1_token stream (visualization) |                |
     |                |<---------------|<---------------|                |
     |                |                |                |                |
     | See rich UI    |                |                |                |
     |<---------------|                |                |                |
```

### 7.3 Connection Configuration Flow

```
+----------+          +----------+          +----------+
|  Client  |          |WebSocket |          |Connection|
|  App     |          |  Server  |          | Manager  |
+----+-----+          +----+-----+          +----+-----+
     |                     |                     |
     | WebSocket Connect   |                     |
     |-------------------->|                     |
     |                     | register_connection |
     |                     |-------------------->|
     |                     |                     |
     | connection_established                    |
     |<--------------------|                     |
     |                     |                     |
     | connection_config   |                     |
     | {                   |                     |
     |   visualization_    |                     |
     |   provider: {...},  |                     |
     |   mcp_config: {...} |                     |
     | }                   |                     |
     |-------------------->| configure_connection|
     |                     |-------------------->|
     |                     |                     |
     |                     |                     | Validate config
     | connection_state:   |                     |
     | VALIDATING          |                     |
     |<--------------------|<--------------------|
     |                     |                     |
     |                     |                     | Init MCP servers
     | connection_state:   |                     |
     | MCP_INITIALIZING    |                     |
     |<--------------------|<--------------------|
     |                     |                     |
     |                     |                     | Init visualization
     | connection_state:   |                     |
     | VIZ_INITIALIZING    |                     |
     |<--------------------|<--------------------|
     |                     |                     |
     | connection_state:   |                     |
     | READY -> ACTIVE     |                     |
     |<--------------------|<--------------------|
     |                     |                     |
     | Ready for messages  |                     |
     |                     |                     |
```

### 7.4 User Interaction Flow (Form Submission)

```
+----------+     +----------+     +----------+     +----------+
|  User    |     |C1Component    |  GeUI    |     |  Backend |
|          |     |(Form)    |     |  SDK     |     |  Server  |
+----+-----+     +----+-----+     +----+-----+     +----+-----+
     |                |                |                |
     | Fill form      |                |                |
     |--------------->|                |                |
     |                |                |                |
     | Click Submit   |                |                |
     |--------------->|                |                |
     |                |                |                |
     |                | onAction()     |                |
     |                |--------------->|                |
     |                |                |                |
     |                |                | sendC1Action() |
     |                |                | user_interaction
     |                |                |--------------->|
     |                |                |                |
     |                |                |                | Debounce check
     |                |                |                | (5s window)
     |                |                |                |
     |                |                |                | Convert to
     |                |                |                | user message
     |                |                |                |
     |                |                |                | MCP Process
     |                |                |                |
     |                |                | enhancement_started
     |                |                |<---------------|
     |                |                |                |
     |                | Show loading   |                |
     |                |<---------------|                |
     |                |                |                |
     |                |                | c1_token stream|
     |                |                |<---------------|
     |                |                |                |
     |                | Update content |                |
     |                |<---------------|                |
     |                |                |                |
     | See response   |                |                |
     |<---------------|                |                |
```

---

## 8. API Reference

### 8.1 REST Endpoints

#### Health Check
```
GET /health

Response: 200 OK
{
  "status": "healthy",
  "version": "1.0.0"
}
```

#### WebRTC Offer
```
POST /api/offer

Request:
{
  "sdp": "v=0\r\no=- ...",
  "type": "offer",
  "backend_connection_id": "conn-abc123"  // Links to WebSocket
}

Response: 200 OK
{
  "sdp": "v=0\r\no=- ...",
  "type": "answer"
}

Error: 400 Bad Request
{
  "error": "Invalid SDP offer",
  "code": "INVALID_OFFER"
}
```

#### Debug: List Threads
```
GET /api/chat/threads

Response: 200 OK
{
  "threads": [
    {
      "id": "thread-123",
      "title": "Weather discussion",
      "message_count": 5,
      "last_message": "The weather is sunny...",
      "updated_at": "2024-01-20T10:30:00Z"
    }
  ]
}
```

#### Debug: Thread History
```
GET /api/chat/history/{thread_id}?limit=50

Response: 200 OK
{
  "thread_id": "thread-123",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What's the weather?",
      "timestamp": "2024-01-20T10:29:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "<Card>...</Card>",
      "content_type": "c1",
      "timestamp": "2024-01-20T10:29:05Z"
    }
  ]
}
```

### 8.2 WebSocket Messages Reference

#### Client -> Server

**connection_config**
```json
{
  "type": "connection_config",
  "config": {
    "client_id": "client-123",
    "visualization_provider": {
      "provider_type": "thesys",
      "model": "thesys-1",
      "api_key_env": "THESYS_API_KEY"
    },
    "mcp_config": {
      "model": "gpt-4o",
      "servers": [
        {
          "name": "web-search",
          "transport": "http",
          "url": "https://mcp.example.com/search"
        }
      ]
    },
    "preferences": {
      "ui_framework": "c1",
      "theme": "dark"
    }
  }
}
```

**chat**
```json
{
  "type": "chat",
  "content": "What's the weather in New York?",
  "thread_id": "thread-123"
}
```

**user_interaction**
```json
{
  "type": "user_interaction",
  "interactionType": "form_submit",
  "context": {
    "formId": "contact-form",
    "formData": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hello!"
    },
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

**thesys_bridge**
```json
{
  "type": "thesys_bridge",
  "action": {
    "type": "button_click",
    "llmFriendlyMessage": "User clicked refresh weather button",
    "humanFriendlyMessage": "Refreshing weather data..."
  }
}
```

#### Server -> Client

**connection_state**
```json
{
  "type": "connection_state",
  "state": "MCP_INITIALIZING",
  "progress": 40,
  "message": "Initializing MCP servers..."
}
```

**c1_token**
```json
{
  "type": "c1_token",
  "token": "<Card><Title>",
  "id": "msg-456",
  "thread_id": "thread-123"
}
```

**chat_done**
```json
{
  "type": "chat_done",
  "id": "msg-456",
  "contentType": "c1",
  "thread_id": "thread-123"
}
```

**user_transcription**
```json
{
  "type": "user_transcription",
  "text": "What's the weather",
  "is_final": false,
  "thread_id": "thread-123"
}
```

**voice_response**
```json
{
  "type": "voice_response",
  "text": "The weather in New York is 72F and sunny.",
  "visualization": "<Card>...</Card>",
  "visualization_type": "c1",
  "thread_id": "thread-123"
}
```

**error**
```json
{
  "type": "error",
  "code": "MCP_ERROR",
  "message": "Failed to connect to MCP server: web-search",
  "details": {
    "server": "web-search",
    "error": "Connection timeout"
  }
}
```

---

## 9. Configuration

### 9.1 Frontend Configuration

```typescript
// Full configuration example
<GeUI
  // Required
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"

  // Display modes
  bubbleEnabled={true}           // Floating widget
  allowFullScreen={true}         // Enable fullscreen
  disableVoice={false}           // Voice enabled
  showThreadManager={true}       // Thread sidebar

  // Options
  options={{
    // Agent identity
    agentName: "AI Assistant",
    agentSubtitle: "Powered by GeUI",
    logoUrl: "/logo.png",
    welcomeMessage: "Hello! How can I help you?",

    // Theming
    theme: lightTheme,
    crayonTheme: crayonLightTheme,
    primaryColor: "#667eea",
    backgroundColor: "#ffffff",

    // UI Framework
    uiFramework: "tailwind",  // 'tailwind' | 'chakra' | 'mui' | 'inline' | 'c1'

    // MCP Configuration
    mcpEndpoints: [
      {
        name: "web-search",
        url: "https://mcp.example.com/search",
        headers: { "Authorization": "Bearer ${API_KEY}" }
      }
    ],

    // Thread management
    threadManager: {
      enablePersistence: true,
      storageKey: "my-app-threads",
      maxThreads: 50,
      autoGenerateTitles: true,
      allowThreadDeletion: true
    },

    // Fullscreen customization
    fullscreenComponents: {
      ThreadList: CustomThreadList,
      VoiceBotUI: CustomVoiceBot,
      ChatWindow: CustomChatWindow
    },
    fullscreenLayout: {
      showThreadList: true,
      showVoiceBot: true,
      showChatWindow: true,
      columnWidths: "280px 1fr 400px"
    },

    // Interaction handlers
    onFormSubmit: (formId, data) => console.log('Form:', formId, data),
    onButtonClick: (action, ctx) => console.log('Button:', action, ctx),
    onInputChange: (field, value) => console.log('Input:', field, value),

    // WebSocket hook (for ConfigurableGeUIClient pattern)
    onWebSocketConnect: (ws) => {
      // Send custom configuration after connection
    }
  }}
/>
```

### 9.2 Backend Configuration

**Environment Variables:**
```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
THESYS_API_KEY=...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=...

# Server Settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Model Settings
AGENT_MODEL=gpt-4o
ENHANCEMENT_MODEL=gpt-4o
THESYS_MODEL=thesys-1

# Voice Settings
VOICE_IDLE_TIMEOUT=60
VOICE_IDLE_WARNING_TIME=50

# Connection Limits
MAX_CONNECTIONS=1000
MAX_THREADS_PER_CONNECTION=50
MAX_MESSAGES_PER_THREAD=50
```

**MCP Servers Configuration (mcp_servers.json):**
```json
{
  "servers": [
    {
      "name": "web-search",
      "transport": "http",
      "url": "https://mcp.example.com/search",
      "headers": {
        "Authorization": "Bearer ${SEARCH_API_KEY}"
      },
      "tools": ["search_web", "fetch_url"],
      "timeout": 30
    },
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
      "tools": ["read_file", "write_file", "list_directory"]
    },
    {
      "name": "database",
      "transport": "websocket",
      "url": "wss://db-mcp.example.com/ws",
      "tools": ["query", "insert", "update"]
    }
  ],
  "constraints": {
    "max_servers_per_connection": 10,
    "max_tool_calls_per_request": 10,
    "timeout_seconds": 30
  }
}
```

### 9.3 Per-Connection Configuration

**ConfigurableGeUIClient Pattern:**
```typescript
// Frontend: ConfigurableGeUIClient.tsx
const ConfigurableGeUIClient: React.FC<ConfigurableProps> = ({
  clientId,
  connectionConfig,
  children,
  ...geUIProps
}) => {
  const handleWebSocketConnect = useCallback((ws: WebSocket) => {
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connection_established') {
        // Send configuration after connection established
        ws.send(JSON.stringify({
          type: 'connection_config',
          config: {
            client_id: clientId,
            visualization_provider: connectionConfig.visualization_provider,
            mcp_config: connectionConfig.mcp_config,
            preferences: connectionConfig.preferences
          }
        }));

        // Remove listener after sending config
        ws.removeEventListener('message', handleMessage);
      }
    };

    ws.addEventListener('message', handleMessage);
  }, [clientId, connectionConfig]);

  return (
    <GeUI
      {...geUIProps}
      options={{
        ...geUIProps.options,
        onWebSocketConnect: handleWebSocketConnect
      }}
    >
      {children}
    </GeUI>
  );
};
```

---

## 10. Security Considerations

### 10.1 Content Sanitization

**HTML Content:**
```typescript
// FlexibleContentRenderer.tsx uses DOMPurify
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
  ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th',
                 'form', 'input', 'button', 'select', 'option', 'textarea'],
  ALLOWED_ATTR: ['class', 'style', 'href', 'src', 'alt', 'type', 'name',
                 'value', 'placeholder', 'onclick', 'onsubmit', 'onchange'],
  ALLOW_DATA_ATTR: true
});
```

### 10.2 API Key Security

- Never expose API keys in frontend code
- Use environment variables on backend
- Use `api_key_env` pattern to reference env vars by name

### 10.3 WebSocket Security

- Validate all incoming messages against schemas
- Implement rate limiting per connection
- Use connection IDs for message routing (not user input)

### 10.4 Voice Security

- WebRTC requires HTTPS in production
- Audio streams are encrypted via DTLS-SRTP
- Transcriptions are not stored permanently by default

---

## Appendix A: Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_CONFIG_FORMAT` | JSON validation failed | Check config structure |
| `CONFIG_TIMEOUT` | No config within 30s | Send config faster |
| `CONFIG_ERROR` | Invalid config values | Validate config |
| `MCP_ERROR` | MCP server error | Check server status |
| `VIZ_ERROR` | Visualization error | Check provider config |
| `INVALID_OFFER` | Bad WebRTC offer | Regenerate offer |
| `CONNECTION_LIMIT` | Max connections | Wait or upgrade |
| `RATE_LIMIT` | Too many requests | Slow down |

## Appendix B: Performance Specifications

| Metric | Target | Notes |
|--------|--------|-------|
| SDK Bundle Size | < 100KB gzipped | Use tree-shaking |
| Voice Latency | < 200ms | STT to TTS |
| UI Responsiveness | 60fps | Animation smoothness |
| WebSocket Queue | 100 items | Per connection |
| Connection Limit | 1000 concurrent | Per server |
| Thread Limit | 50 per connection | Configurable |
| History Retention | 1 hour | In memory |

## Appendix C: Browser Support

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 80+ | Full support |
| Firefox | 75+ | Full support |
| Safari | 14+ | WebRTC may require HTTPS |
| Edge | 80+ | Full support |
| Mobile Safari | 14+ | Requires user gesture for audio |
| Mobile Chrome | 80+ | Full support |

---

## Appendix D: SOLID Principles & DRY Analysis

### D.1 Overview

This appendix provides a comprehensive analysis of the codebase against SOLID principles and DRY (Don't Repeat Yourself) practices.

#### Assessment Summary

| Principle | Frontend | Backend | Status |
|-----------|----------|---------|--------|
| **S** - Single Responsibility | ❌ Violated | ❌ Violated | Needs Work |
| **O** - Open/Closed | ⚠️ Partial | ⚠️ Partial | Fair |
| **L** - Liskov Substitution | ✅ Good | ⚠️ Issues | Fair |
| **I** - Interface Segregation | ❌ Violated | ❌ Violated | Needs Work |
| **D** - Dependency Inversion | ⚠️ Partial | ❌ Violated | Needs Work |
| **DRY** | ❌ Violated | ❌ Violated | Needs Work |

---

### D.2 Single Responsibility Principle (SRP)

#### D.2.1 Frontend Violations

**ConnectionService.ts (1,343 lines)** - CRITICAL

The service handles 7+ distinct responsibilities:

```
ConnectionService
├── WebSocket lifecycle management (lines 155-211)
├── WebRTC voice connection (lines 251-384)
├── Chat message handling (lines 389-448)
├── Streaming content aggregation (lines 665-790)
├── Interaction handling (forms, buttons, links) (lines 1064-1304)
├── Global window handler setup (lines 1064-1080)
├── Debouncing logic (lines 1045-1059)
└── State machine management (lines 970-985)
```

**Recommended Decomposition:**
```
ConnectionService (current: 1,343 lines)
  ↓ Split into:
├── WebSocketService (~250 lines)
├── WebRTCService (~200 lines)
├── StreamingService (~150 lines)
├── InteractionHandler (~200 lines)
└── ConnectionOrchestrator (~200 lines)
```

**GeUI.tsx (268 lines)** - MODERATE

Orchestrates multiple concerns:
- UI state management (isChatOpen, isFullscreenOpen)
- Audio stream handling
- Theme resolution
- Component override resolution
- Event handler management
- Multiple render paths

**VoiceBotFullscreenLayout.tsx (354 lines)** - MODERATE

Handles:
- Thread management (lines 133-224)
- Component override resolution (lines 120-123)
- Layout configuration (lines 126-131)
- Multiple event handlers
- 3-column layout rendering

#### D.2.2 Backend Violations

**connection_processor.py (550+ lines)**

`_stream_visualization_response()` method (lines 195-410) does too much:
- Determines content types
- Handles both HTML and C1 provider logic
- Manages framework detection
- Implements chunk collection and splitting
- Sends messages to frontend

**Recommended Decomposition:**
```python
# Extract into separate classes:
class HTMLStreamHandler: ...
class C1StreamHandler: ...
class FrameworkDetector: ...
class ResponseSender: ...
```

**routes/chat.py (lines 456-608)**

Multiple helper functions with cross-cutting concerns:
- `_convert_interaction_to_user_message()` (50 lines)
- `_convert_interaction_to_ai_context()` (40 lines)
- `_detect_framework_from_interaction()` (69 lines)

**Recommendation:** Create `InteractionProcessor` class with single responsibility.

#### D.2.3 Well-Designed Components

| Component | Location | Why It's Good |
|-----------|----------|---------------|
| `ChatMessage.tsx` | Frontend | Single responsibility: render a message |
| `BubbleWidget.tsx` | Frontend | Focused on presentation only |
| `ConnectionManager` | Backend | Clear lifecycle management |
| `VoiceBroadcastManager` | Backend | Clean subscription model |

---

### D.3 Open/Closed Principle (OCP)

#### D.3.1 Violations

**Frontend: Interaction Handler Extension**

`ConnectionService.ts` lines 1147-1304:

Each interaction type has nearly identical code patterns. New interaction types require modifying the class.

```typescript
// Problem: Hardcoded handlers
handleFormSubmit()    // lines 1085-1142
handleButtonClick()   // lines 1147-1203
handleLinkClick()     // lines 1235-1304
// Adding handleDragDrop() requires modifying ConnectionService
```

**Solution:** Use strategy pattern:
```typescript
interface InteractionHandler {
  canHandle(type: string): boolean;
  handle(event: Event, context: any): void;
}

class InteractionManager {
  private handlers: InteractionHandler[] = [];

  register(handler: InteractionHandler): void { ... }
  handle(type: string, event: Event, context: any): void { ... }
}
```

**Backend: Provider Type Handling**

`connection_processor.py` lines 300-410 uses hardcoded string comparison:

```python
# Problem: if/else chain for providers
if content_type == "html":
    # HTML logic
else:
    # C1 logic
# Adding new provider requires modifying this method
```

**Solution:** Polymorphic design - let providers handle their own streaming.

#### D.3.2 Good Examples

**Component Override Pattern (GeUI.tsx lines 117-119):**
```typescript
// Open for extension via options
const ChatButtonComponent = componentOverrides.ChatButton || ChatButton;
```

**VisualizationProvider Abstract Class (Backend):**
```python
# Extensible through inheritance
class VisualizationProvider(ABC):
    @abstractmethod
    async def generate(self, content: str) -> AsyncGenerator[str, None]: ...
```

---

### D.4 Liskov Substitution Principle (LSP)

#### D.4.1 Frontend - Good Compliance

Props interfaces are well-structured with optional properties and sensible defaults:
- `ChatWindowProps` - all props optional with defaults
- `BubbleWidgetProps` - optional props with clear contracts
- `VoiceBotUIProps` - properly optional

#### D.4.2 Potential Issues

**Type Casting in GeUI.tsx:**
```typescript
// Lines 171, 214 - Bypasses type safety
<ChatWindowComponent {...(chatWindowProps as any)} />
```

If overridden component doesn't satisfy ChatWindowProps, it will fail silently.

**Backend Session Storage (enhanced_mcp_client_agent.py):**
```python
# HTTP servers stored as dict, STDIO as ClientSession
# Code must check type first - not substitutable
if 'server_url' in tool_info:  # HTTP check
    # Reconnect logic
else:
    session = tool_info['session']  # STDIO check
```

---

### D.5 Interface Segregation Principle (ISP)

#### D.5.1 Fat Interfaces

**ChatWindowProps (38 properties):**

```typescript
interface ChatWindowProps {
  // Chat display (5 props)
  messages, agentName, isLoading, isEnhancing, header

  // Voice features (3 props)
  showVoiceButton, onVoiceToggle, isVoiceActive

  // Streaming (4 props)
  streamingContent, streamingContentType, streamingMessageId, isStreamingActive

  // C1 components (2 props)
  onC1Action, sendC1Action

  // Minimize feature (5 props)
  isMinimized, onMinimize, onRestore, showMinimizeButton, minimizedHeight

  // Theming (4 props)
  theme, crayonTheme, className, style

  // Custom rendering (1 prop)
  renderMessage

  // ... 14 more props
}
```

**Recommended Split:**
```typescript
interface ChatWindowCoreProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  agentName?: string;
}

interface ChatWindowVoiceProps {
  showVoiceButton?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
}

interface ChatWindowStreamingProps {
  streamingContent?: string;
  streamingContentType?: 'c1' | 'html';
  streamingMessageId?: string | null;
  isStreamingActive?: boolean;
}

interface ChatWindowMinimizeProps {
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  showMinimizeButton?: boolean;
}

// Compose as needed
type ChatWindowProps = ChatWindowCoreProps
  & Partial<ChatWindowVoiceProps>
  & Partial<ChatWindowStreamingProps>
  & Partial<ChatWindowMinimizeProps>;
```

**GeUIOptions (48+ properties):**

Single massive configuration object mixing:
- Theme options
- Component overrides
- Thread manager config
- Fullscreen config
- UI framework config
- Interaction handlers

**ConnectionServiceOptions (58+ properties):**

Too many concerns in one interface.

#### D.5.2 Backend Fat Interfaces

**EnhancedMCPClient (800+ lines):**

Handles:
- Config loading
- Server connection (HTTP/WebSocket/STDIO)
- Tool discovery
- Tool execution
- Streaming enhancement decisions

**Recommended Split:**
```python
class ConfigLoader: ...
class ServerConnector: ...
class ToolCatalog: ...
class ToolExecutor: ...
class EnhancementDecisionMaker: ...
```

---

### D.6 Dependency Inversion Principle (DIP)

#### D.6.1 Frontend Violations

**useGeUIClient.ts - Direct Instantiation:**
```typescript
// Lines 96-111: Hard dependency on concrete class
const newService = new ConnectionService({
  webrtcURL,
  websocketURL,
  // ... config
});
// Cannot mock or substitute for testing
```

**ChatWindow.tsx - Concrete Dependencies:**
```typescript
// Direct calls to concrete implementations
const mergedTheme = createTheme(theme);
const cssVars = themeToCssVars(mergedTheme);
```

#### D.6.2 Backend Violations

**connection_processor.py - Direct Imports:**
```python
from app.voice_manager import voice_manager  # Concrete
success = await voice_manager.inject_tts_voice_over(...)
```

**enhanced_mcp_client_agent.py - Direct Client Creation:**
```python
self.openai_client = AsyncOpenAI(api_key=self.config.openai_api_key)
# Should be injected, not created internally
```

#### D.6.3 Recommended Pattern

```typescript
// Factory pattern for dependency injection
interface ConnectionServiceFactory {
  create(options: ConnectionServiceOptions): IConnectionService;
}

// Usage in hook
function useGeUIClient(
  options: UseGeUIClientOptions,
  factory: ConnectionServiceFactory = defaultFactory
) {
  const service = factory.create(options);
  // ...
}
```

---

### D.7 DRY Violations

#### D.7.1 Critical: Interaction Handlers (219 duplicate lines)

**Location:** `ConnectionService.ts` lines 1085-1304

Three handlers share ~80% identical logic:

```typescript
// Pattern repeated in handleFormSubmit, handleButtonClick, handleLinkClick:
private handleXxx(event: Event, identifier: string, context?: any): void {
  event.preventDefault();
  if (this.isInteractionProcessing(type, identifier)) return;
  this.markInteractionProcessing(type, identifier);
  this.emit(ConnectionEvent.INTERACTION_LOADING);

  // Build user message (differs slightly)
  const userMessage = this.buildMessage(...);

  this.addUserMessage(userMessage);

  const debounceKey = `${type}:${identifier}`;
  this.debounceInteraction(debounceKey, () => {
    this.sendInteraction(type, { ... });
  }, delay);  // delay varies: 100, 200, 300

  if (this.customHandler) { this.customHandler(...); }
  setTimeout(() => this.markInteractionComplete(...), 1000);
}
```

**Solution:**
```typescript
private handleInteraction(
  type: InteractionType,
  identifier: string,
  event: Event,
  buildMessage: () => string,
  debounceDelay: number,
  customHandler?: Function
): void {
  event.preventDefault();
  if (this.isInteractionProcessing(type, identifier)) return;
  this.markInteractionProcessing(type, identifier);
  this.emit(ConnectionEvent.INTERACTION_LOADING);

  const userMessage = buildMessage();
  this.addUserMessage(userMessage);

  this.debounceInteraction(`${type}:${identifier}`, () => {
    this.sendInteraction(type, { identifier });
  }, debounceDelay);

  customHandler?.();
  setTimeout(() => this.markInteractionComplete(type, identifier), 1000);
}

// Usage:
handleFormSubmit = (e, formId) => this.handleInteraction(
  'form_submit', formId, e,
  () => `📝 Submitted form: ${this.formatFormData(formId)}`,
  100, this.onFormSubmit
);
```

#### D.7.2 High: Theme Creation (8 files)

**Pattern repeated in every styled component:**
```typescript
const mergedTheme = createTheme(theme);
const cssVars = themeToCssVars(mergedTheme);
```

**Affected files:**
- `GeUI.tsx`
- `ChatWindow.tsx`
- `BubbleWidget.tsx`
- `MessageComposer.tsx`
- `ChatMessage.tsx`
- `ThreadList.tsx`
- `VoiceBot.tsx`
- `VoiceBotFullscreenLayout.tsx`

**Solution - Create Hook:**
```typescript
// hooks/useThemeStyles.ts
export function useThemeStyles(customTheme?: Partial<ThemeTokens>) {
  const mergedTheme = useMemo(() => createTheme(customTheme), [customTheme]);
  const cssVars = useMemo(() => themeToCssVars(mergedTheme), [mergedTheme]);
  return { theme: mergedTheme, cssVars };
}

// Usage in any component:
const { theme, cssVars } = useThemeStyles(props.theme);
```

#### D.7.3 High: Framework Detection (Backend - 4 occurrences)

**Location:** `connection_processor.py` lines 333-338, 421-426, 453-458, 498-502

```python
# Repeated 4 times:
framework = "tailwind"
if (hasattr(self.context, 'config') and
    self.context.config and
    hasattr(self.context.config, 'preferences') and
    self.context.config.preferences):
    framework = self.context.config.preferences.get('ui_framework', 'tailwind')
```

**Solution:**
```python
@property
def framework_preference(self) -> str:
    """Get UI framework preference with caching."""
    if not hasattr(self, '_framework_preference'):
        self._framework_preference = 'tailwind'
        if (hasattr(self.context, 'config') and
            self.context.config and
            hasattr(self.context.config, 'preferences') and
            self.context.config.preferences):
            self._framework_preference = self.context.config.preferences.get(
                'ui_framework', 'tailwind'
            )
    return self._framework_preference
```

#### D.7.4 Moderate: WebSocket Connection Checks

**Location:** `ConnectionService.ts` - Multiple methods

```typescript
// Repeated in connectVoice, sendChatMessage, sendC1Action:
if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
  await this.connectWebSocket();
}
```

**Solution:**
```typescript
private async ensureWebSocketConnected(): Promise<void> {
  if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
    await this.connectWebSocket();
  }
}
```

#### D.7.5 Moderate: Error Card Creation (Backend)

**Locations:** `connection_processor.py` lines 511-519, `routes/chat.py` lines 713-720

```python
# Duplicated structure:
error_card = {
    "component": "Callout",
    "props": {
        "variant": "error",
        "title": "Processing Error",
        "description": f"Failed to process: {error_message}"
    }
}
error_content = f'<content>{json.dumps(error_card)}</content>'
```

**Solution:**
```python
# utils/card_factory.py
def create_error_card(title: str, description: str) -> str:
    card = {
        "component": "Callout",
        "props": {"variant": "error", "title": title, "description": description}
    }
    return f'<content>{json.dumps(card)}</content>'
```

---

### D.8 Refactoring Roadmap

#### Phase 1: Quick Wins (1-2 days)

| Task | File | Effort | Lines Saved |
|------|------|--------|-------------|
| Extract `useThemeStyles()` hook | New file | 1 hour | ~80 lines |
| Extract `ensureWebSocketConnected()` | ConnectionService.ts | 30 min | ~15 lines |
| Extract `_get_framework_preference()` | connection_processor.py | 30 min | ~24 lines |
| Create `create_error_card()` factory | Backend utils | 20 min | ~20 lines |

#### Phase 2: Moderate Refactoring (1 week)

| Task | File | Effort | Impact |
|------|------|--------|--------|
| Create generic `handleInteraction()` | ConnectionService.ts | 2-3 hours | -219 lines |
| Split `ChatWindowProps` interface | types/index.ts | 2 hours | Better ISP |
| Create `InteractionProcessor` class | routes/chat.py | 2-3 hours | Better SRP |
| Inject dependencies in hooks | useGeUIClient.ts | 2 hours | Better DIP |

#### Phase 3: Major Refactoring (2-3 weeks)

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Split `ConnectionService` into 5 services | Frontend | 3-4 days | Better SRP |
| Split `EnhancedMCPClient` into 5 classes | Backend | 2-3 days | Better SRP/ISP |
| Implement transport registry pattern | Backend | 2 days | Better OCP |
| Create dependency injection framework | Both | 3-4 days | Better DIP |

---

### D.9 Metrics After Refactoring

| Metric | Current | Target |
|--------|---------|--------|
| ConnectionService.ts | 1,343 lines | ~200 lines (orchestrator) |
| Duplicate interaction code | 219 lines | 0 lines |
| Theme boilerplate per component | 6 lines | 1 line |
| Fat interfaces (>20 props) | 3 | 0 |
| Direct concrete dependencies | 15+ | 3-5 |

---

*Document generated: 2025-11-28*
*GeUI SDK Version: 0.1.0*
