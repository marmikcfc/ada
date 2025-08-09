# GeUI SDK - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Exported Hooks](#exported-hooks)
3. [Exported Components](#exported-components)
4. [Framework Support](#framework-support)
5. [Code Organization](#code-organization)
6. [Usage Examples](#usage-examples)
7. [Advanced Features](#advanced-features)

## Overview

GeUI SDK is a comprehensive conversational AI framework that provides:
- **Dual Interface**: Voice (WebRTC) and text (WebSocket) communication
- **Rich Content Rendering**: Support for C1Components, HTML, React components, and plain text
- **Thread Management**: Conversation persistence and organization
- **Complete Customization**: Component overrides and theme system
- **Framework Agnostic**: Support for Tailwind, Chakra UI, Material UI, Bootstrap, and more

## Exported Hooks

### 1. `useGeUIClient`
Primary hook for headless SDK usage providing complete control over the connection and messaging.

```typescript
interface UseGeUIClientOptions {
  webrtcURL?: string;           // WebRTC endpoint (optional for chat-only)
  websocketURL: string;          // WebSocket endpoint
  initialThreadId?: string;      // Starting thread ID
  autoConnect?: boolean;         // Auto-connect on mount (default: true)
  initialMessages?: Message[];   // Pre-load messages
  onThreadCreated?: (id) => void; // Thread creation callback
  
  // UI Framework support
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'antd' | 'bootstrap' | 'inline';
  
  // Interaction handlers
  onFormSubmit?: (formId: string, formData: FormData) => void;
  onButtonClick?: (actionType: string, context: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
  onLinkClick?: (href: string, context: any) => void;
  onWebSocketConnect?: (ws: WebSocket) => () => void;
}

// Returns
{
  // Core messaging
  sendText: (message: string) => void;
  sendC1Action: (action: {llmFriendlyMessage: string, humanFriendlyMessage: string}) => void;
  messages: Message[];
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  
  // Voice control
  startVoice: () => void;
  stopVoice: () => void;
  audioStream: MediaStream | null;  // IMPORTANT: Must connect to audio element
  
  // Connection states
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
  voiceState: 'connected' | 'connecting' | 'disconnected';
  
  // Loading states
  isLoading: boolean;
  isVoiceLoading: boolean;
  isEnhancing: boolean;
  
  // Streaming support
  streamingContent: string;
  streamingContentType: 'c1' | 'html';
  streamingMessageId: string | null;
  isStreamingActive: boolean;
  
  // Thread management
  threadId: string | undefined;
  setThreadId: (threadId: string) => void;
  
  // Interaction processing
  isInteractionProcessing: (type: InteractionType, identifier: string) => boolean;
  getProcessingInteractions: () => InteractionProcessingState[];
  
  // Utilities
  getBackendConnectionId: () => string | null;
  isReadyForVoice: () => boolean;
}
```

**Critical Note**: When using `useGeUIClient` directly, you MUST manually handle audio playback:
```typescript
const audioRef = useRef<HTMLAudioElement>(null);
const client = useGeUIClient(options);

useEffect(() => {
  if (audioRef.current && client.audioStream) {
    audioRef.current.srcObject = client.audioStream;
  }
}, [client.audioStream]);

// In render
<audio ref={audioRef} autoPlay style={{ display: 'none' }} />
```

### 2. `useThreadManager`
Manages individual thread content with localStorage and optional API support.

```typescript
interface UseThreadManagerOptions {
  threadId: string;
  apiUrl?: string;               // Backend API base URL
  headers?: Record<string, string>;
  enableLocalStorage?: boolean;   // Default: true
  storageKey?: string;            // Default: 'geui-messages'
  connectionConfig?: {
    webrtcURL?: string;
    websocketURL?: string;
  };
  autoConnect?: boolean;          // Default: true
}

// Returns
{
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  connectionState: ConnectionState;
  
  loadMessages: () => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  clearMessages: () => void;
  saveMessages: () => Promise<void>;
  
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  getConnectionService: () => ConnectionService | null;
}
```

### 3. `useThreadListManager`
Manages multiple threads with CRUD operations.

```typescript
interface UseThreadListManagerOptions {
  enablePersistence?: boolean;    // Default: true
  storageKey?: string;            // Default: 'geui-threads'
  maxThreads?: number;            // Default: 50
  autoGenerateTitles?: boolean;  // Default: true
  generateTitle?: (firstMessage: string) => string;
}

// Returns
{
  threads: ThreadSummary[];
  activeThreadId: string | undefined;
  
  createThread: (title?: string) => string;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  getThread: (threadId: string) => Thread | undefined;
  
  isLoading: boolean;
  error: Error | null;
}
```

### 4. `useThreadedClient`
Combines `useGeUIClient` with thread management capabilities.

```typescript
interface UseThreadedClientOptions extends UseGeUIClientOptions {
  enableThreadPersistence?: boolean;
  threadStorageKey?: string;
  maxThreads?: number;
  autoGenerateTitles?: boolean;
}

// Returns everything from useGeUIClient plus:
{
  threads: ThreadSummary[];
  activeThreadId: string | undefined;
  createThread: (title?: string) => void;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
}
```

### 5. `useThreadInterface`
Advanced hook combining thread management with message persistence.

```typescript
interface ThreadInterfaceOptions {
  enablePersistence?: boolean;
  storageKey?: string;
  maxThreads?: number;
  autoGenerateTitles?: boolean;
  generateTitle?: (firstMessage: string) => string;
}

// Returns
{
  // Thread management
  threads: ThreadSummary[];
  activeThread: Thread | undefined;
  createThread: (title?: string) => Thread;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  
  // Message management
  getMessagesForThread: (threadId: string) => Message[];
  addMessageToThread: (threadId: string, message: Message) => void;
  clearMessagesForThread: (threadId: string) => void;
  
  // Storage info
  getStorageInfo: () => StorageInfo;
  clearAllData: () => void;
}
```

### 6. `useThreadInterfaceWrapper`
Wrapper that combines `useGeUIClient` with `useThreadInterface`.

```typescript
// Same interface as useGeUIClient but with thread support
// Automatically syncs messages between client and thread storage
```

## Exported Components

### Core Components
Building blocks for custom interfaces.

#### 1. `BubbleWidget`
Floating circular widget with chat/voice/fullscreen buttons.
```typescript
interface BubbleWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onMicToggle?: () => void;
  onFullscreenToggle?: () => void;
  
  isMicActive?: boolean;
  isMicLoading?: boolean;
  showVoiceButton?: boolean;
  showFullscreenButton?: boolean;
  
  theme?: Partial<ThemeTokens>;
  className?: string;
  style?: React.CSSProperties;
}
```

#### 2. `ChatMessage`
Individual message rendering with support for multiple content types.
```typescript
interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  hasVoiceOver?: boolean;
  children?: React.ReactNode;
}
```

#### 3. `MessageComposer`
Text input with optional voice button.
```typescript
interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  onVoiceToggle?: () => void;
  
  isDisabled?: boolean;
  isLoading?: boolean;
  isVoiceActive?: boolean;
  isVoiceLoading?: boolean;
  showVoiceButton?: boolean;
  
  placeholder?: string;
  className?: string;
}
```

#### 4. `ThreadList`
Thread management UI component.
```typescript
interface ThreadListProps {
  threads: ThreadSummary[];
  activeThreadId?: string;
  
  onThreadSelect: (threadId: string) => void;
  onThreadCreate: () => void;
  onThreadDelete?: (threadId: string) => void;
  onThreadRename?: (threadId: string, newTitle: string) => void;
  
  isLoading?: boolean;
  title?: string;
  allowDelete?: boolean;
  allowRename?: boolean;
}
```

#### 5. `VoiceBot`
Voice interaction controls.
```typescript
interface VoiceBotProps {
  isConnected: boolean;
  isConnecting: boolean;
  onToggle: () => void;
  
  agentName?: string;
  startCallText?: string;
  endCallText?: string;
  connectingText?: string;
}
```

#### 6. `AnimatedBlob`
3D WebGL animated sphere for voice visualization.
```typescript
// No props - uses internal audio analysis
```

#### 7. `FlexibleContentRenderer`
Universal content renderer supporting multiple formats.
```typescript
interface FlexibleContentRendererProps {
  content: string;
  contentType: 'c1' | 'html' | 'react' | 'text';
  framework?: 'tailwind' | 'shadcn' | 'chakra' | 'mui' | 'bootstrap' | 'c1' | 'inline';
  reactContent?: React.ReactNode;
  
  onC1Action?: (action: any) => void;
  sendC1Action?: (action: {llmFriendlyMessage: string, humanFriendlyMessage: string}) => void;
  
  isStreaming?: boolean;
  crayonTheme?: Record<string, any>;
  allowDangerousHtml?: boolean;
  htmlSanitizeOptions?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedStyles?: string[];
  };
}
```

### Composite Components
Complete interfaces built from core components.

#### 1. `ChatWindow`
Main chat interface.
```typescript
interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onClose?: () => void;
  
  isLoading: boolean;
  isVoiceLoading: boolean;
  isEnhancing: boolean;
  
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

#### 2. `MinimizableChatWindow`
Chat window with minimize/restore functionality.
```typescript
interface MinimizableChatWindowProps extends ChatWindowProps {
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  agentName?: string;
}
```

#### 3. `ThreadedChatWindow`
Chat with integrated thread management.
```typescript
interface ThreadedChatWindowProps extends ChatWindowProps {
  threads: ThreadSummary[];
  activeThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onThreadCreate: () => void;
  onThreadDelete?: (threadId: string) => void;
}
```

#### 4. `VoiceBotFullscreenLayout`
Immersive 3-column voice experience.
```typescript
interface VoiceBotFullscreenLayoutProps {
  // Client connection
  client: GeUIClient;
  
  // Customization
  agentName?: string;
  agentSubtitle?: string;
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  
  // Thread management
  threadManagerTitle?: string;
  enableThreadManager?: boolean;
  
  // Component overrides
  fullscreenComponents?: {
    ThreadList?: React.ComponentType<ThreadListProps>;
    VoiceBotUI?: React.ComponentType<VoiceBotUIProps>;
    ChatWindow?: React.ComponentType<ChatWindowProps>;
  };
  
  // Layout configuration
  fullscreenLayout?: {
    showThreadList?: boolean;
    showVoiceBot?: boolean;
    showChatWindow?: boolean;
    columnWidths?: string;
  };
  
  // Container mode for embedding
  containerMode?: boolean;
}
```

#### 5. `FullscreenLayout`
Generic fullscreen modal layout.
```typescript
interface FullscreenLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
}
```

### Main Component

#### `GeUI`
Primary SDK component that orchestrates all functionality.
```typescript
interface GeUIProps {
  webrtcURL: string;
  websocketURL: string;
  
  bubbleEnabled?: boolean;        // Default: true
  allowFullScreen?: boolean;      // Default: false
  disableVoice?: boolean;         // Default: false
  enableThreadManagement?: boolean; // Default: false
  
  options?: GeUIOptions;
}

interface GeUIOptions {
  // Design system
  designSystem?: 'default' | 'shadcn';
  
  // Theming
  theme?: Partial<ThemeTokens>;
  crayonTheme?: Record<string, any>;
  
  // Component overrides
  components?: Partial<ComponentOverrides>;
  
  // Agent customization
  agentName?: string;
  agentSubtitle?: string;
  logoUrl?: string;
  
  // Fullscreen customization
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  
  // Thread management
  threadManager?: {
    enablePersistence?: boolean;
    storageKey?: string;
    maxThreads?: number;
    autoGenerateTitles?: boolean;
    showCreateButton?: boolean;
    allowThreadDeletion?: boolean;
    initiallyCollapsed?: boolean;
    generateTitle?: (firstMessage: string) => string;
  };
  
  // Fullscreen layout
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
  
  // Container mode for embedding
  containerMode?: boolean;
  
  // UI framework preference
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'antd' | 'bootstrap' | 'inline';
  
  // Interaction handlers
  onFormSubmit?: (formId: string, formData: FormData) => void;
  onButtonClick?: (actionType: string, context: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
  onLinkClick?: (href: string, context: any) => void;
  onWebSocketConnect?: (ws: WebSocket) => () => void;
}
```

## Framework Support

### Supported Frameworks

#### 1. **C1Components** (Default)
Rich interactive components from TheSys AI.
```typescript
// Automatic rendering of C1Component XML
<content>
  <list>
    <item>First item</item>
    <item>Second item</item>
  </list>
</content>
```

#### 2. **HTML with Framework Classes**
Backend generates HTML optimized for specific CSS frameworks.

**Tailwind CSS**
```html
<div class="bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold mb-4">Title</h2>
  <button class="bg-blue-500 text-white px-4 py-2 rounded">Click</button>
</div>
```

**Chakra UI**
```html
<div data-chakra-component="Box" class="chakra-box">
  <h2 data-chakra-component="Heading">Title</h2>
  <button data-chakra-component="Button" class="chakra-button">Click</button>
</div>
```

**Material UI**
```html
<div class="MuiPaper-root MuiCard-root">
  <h2 class="MuiTypography-h5">Title</h2>
  <button class="MuiButton-root MuiButton-contained">Click</button>
</div>
```

#### 3. **React Components**
Direct React component rendering.
```typescript
// Message with reactContent
{
  role: 'assistant',
  contentType: 'react',
  reactContent: <CustomComponent />
}
```

#### 4. **Plain Text**
Simple text messages.
```typescript
{
  role: 'assistant',
  contentType: 'text',
  content: 'Plain text message'
}
```

### Global Interaction Handlers

The SDK exposes `window.geuiSDK` for HTML interactions:

```javascript
window.geuiSDK = {
  // Form submission
  handleFormSubmit: (event, formId) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    // Sends to backend and triggers onFormSubmit callback
  },
  
  // Button clicks
  handleButtonClick: (event, actionType, context) => {
    // Sends to backend and triggers onButtonClick callback
  },
  
  // Input changes
  handleInputChange: (event, fieldName) => {
    // Sends to backend and triggers onInputChange callback
  },
  
  // Link clicks
  handleLinkClick: (event, href, context) => {
    // Sends to backend and triggers onLinkClick callback
  },
  
  // Custom interactions
  sendInteraction: (type, context) => {
    // Sends custom interaction to backend
  }
};
```

Usage in HTML:
```html
<form onsubmit="window.geuiSDK.handleFormSubmit(event, 'signup-form')">
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>

<button onclick="window.geuiSDK.handleButtonClick(event, 'purchase', {productId: 123})">
  Buy Now
</button>

<input onchange="window.geuiSDK.handleInputChange(event, 'username')" />
```

## Code Organization

### Directory Structure

```
packages/geui-sdk/
├── src/
│   ├── components/           # React components
│   │   ├── core/            # Building blocks
│   │   │   ├── AnimatedBlob.tsx
│   │   │   ├── BubbleWidget.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── FlexibleContentRenderer.tsx
│   │   │   ├── MessageComposer.tsx
│   │   │   ├── ThreadList.tsx
│   │   │   ├── VoiceBot.tsx
│   │   │   └── VoiceBotUI.tsx
│   │   ├── composite/       # Complete interfaces
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── FullscreenLayout.tsx
│   │   │   ├── MinimizableChatWindow.tsx
│   │   │   ├── ThreadedChatWindow.tsx
│   │   │   └── VoiceBotFullscreenLayout.tsx
│   │   ├── defaults/        # Default implementations
│   │   └── GeUI.tsx        # Main component
│   │
│   ├── hooks/              # React hooks
│   │   ├── useGeUIClient.ts
│   │   ├── useThreadInterface.ts
│   │   ├── useThreadInterfaceWrapper.ts
│   │   ├── useThreadListManager.ts
│   │   ├── useThreadManager.ts
│   │   └── useThreadedClient.ts
│   │
│   ├── contexts/           # React contexts
│   │   └── ThreadContext.tsx
│   │
│   ├── core/               # Core services
│   │   └── ConnectionService.ts
│   │
│   ├── theming/            # Theme system
│   │   ├── defaultTheme.ts
│   │   └── comprehensiveThemes.ts
│   │
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   │
│   ├── utils/              # Utilities
│   │   └── messageStorage.ts
│   │
│   └── index.ts            # Main exports
```

### Architecture Principles

#### 1. **Separation of Concerns**
- **Core Components**: Reusable building blocks
- **Composite Components**: Complete interfaces
- **Hooks**: Business logic and state management
- **Services**: Connection and communication logic
- **Utils**: Helper functions

#### 2. **Modular Design**
- Each component is self-contained
- Clear interfaces between modules
- Dependency injection for services

#### 3. **Progressive Enhancement**
- Basic chat functionality works without voice
- Voice features are optional
- Thread management is optional
- Fullscreen mode is optional

#### 4. **Customization First**
- Every component can be overridden
- Theme system for styling
- Framework-agnostic design

## Usage Examples

### Basic Chat Widget
```typescript
import { GeUI } from 'geui-sdk';

<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  bubbleEnabled={true}
/>
```

### Chat-Only (No Voice)
```typescript
<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  disableVoice={true}
  options={{
    agentName: "Support Assistant"
  }}
/>
```

### Fullscreen Voice Experience
```typescript
<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  bubbleEnabled={false}
  options={{
    agentName: "Voice Assistant",
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  }}
/>
```

### Custom Components
```typescript
const MyCustomChatMessage = (props) => (
  <div className="my-message">
    {props.message.content}
  </div>
);

<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  options={{
    components: {
      ChatMessage: MyCustomChatMessage
    }
  }}
/>
```

### Headless Usage
```typescript
import { useGeUIClient } from 'geui-sdk';

function MyCustomChat() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const client = useGeUIClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/messages'
  });

  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);

  return (
    <>
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      <div>
        {client.messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      <button onClick={() => client.sendText('Hello')}>
        Send Message
      </button>
    </>
  );
}
```

### Thread Management
```typescript
<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  enableThreadManagement={true}
  options={{
    threadManager: {
      enablePersistence: true,
      maxThreads: 10,
      autoGenerateTitles: true
    }
  }}
/>
```

### Framework-Specific Content
```typescript
<GeUI
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  options={{
    uiFramework: 'tailwind',
    onFormSubmit: (formId, formData) => {
      console.log('Form submitted:', formId, formData);
    },
    onButtonClick: (action, context) => {
      console.log('Button clicked:', action, context);
    }
  }}
/>
```

## Advanced Features

### 1. **Streaming Support**
Real-time message streaming with incremental updates.
- C1Component streaming
- HTML streaming
- Proper accumulation and rendering

### 2. **Voice Features**
- WebRTC-based voice communication
- Real-time transcription
- Audio stream management
- Voice state indicators

### 3. **Thread Persistence**
- localStorage-based persistence
- Thread metadata management
- Message history per thread
- Auto-generated thread titles

### 4. **Security**
- DOMPurify for HTML sanitization
- Controlled event handler execution
- Secure WebSocket/WebRTC connections
- CORS support

### 5. **Performance**
- Lazy loading of components
- Efficient re-rendering
- Connection pooling
- Message virtualization (planned)

### 6. **Theming**
- Comprehensive token system
- Light/dark themes
- Custom theme creation
- Crayon UI integration

### 7. **Interaction Processing**
- Debounced interactions
- Processing state tracking
- Duplicate prevention
- Queue management

## Backend Requirements

### WebSocket Messages
```typescript
// Client to server
{
  type: 'chat',
  content: string,
  threadId?: string
}

// Server to client
{
  type: 'text_chat_response',
  content: string,           // C1Component XML or text
  contentType: 'c1' | 'html' | 'text',
  id: string,
  threadId?: string,
  isVoiceOverOnly?: boolean
}

// Streaming
{
  type: 'c1_token',
  content: string,
  id: string
}

{
  type: 'chat_done',
  id: string
}
```

### WebRTC Requirements
- POST /api/offer - WebRTC offer/answer exchange
- ICE candidate exchange
- Data channel for transcripts
- Audio streams

### Thread API (Optional)
```
GET /api/threads - List threads
POST /api/threads - Create thread
GET /api/threads/{id}/messages - Get messages
POST /api/threads/{id}/messages - Add message
PUT /api/threads/{id} - Update thread
DELETE /api/threads/{id} - Delete thread
```

## Best Practices

1. **Always handle audio for headless usage**
2. **Use proper theme tokens for consistency**
3. **Implement error boundaries around custom components**
4. **Test with different frameworks when using HTML content**
5. **Use thread management for conversation persistence**
6. **Implement proper cleanup in useEffect hooks**
7. **Use the containerMode for embedded experiences**
8. **Sanitize HTML content unless explicitly trusted**
9. **Provide loading states for better UX**
10. **Use streaming for real-time responses**

## Summary

GeUI SDK provides a complete solution for building conversational AI interfaces with:
- Flexible architecture supporting multiple use cases
- Comprehensive hook system for headless usage  
- Rich component library for rapid development
- Framework-agnostic design with multi-framework support
- Advanced features like threading, streaming, and voice
- Complete customization through overrides and theming

The SDK follows React best practices, provides TypeScript support throughout, and maintains a clean separation between presentation and business logic.