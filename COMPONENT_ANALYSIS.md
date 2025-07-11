# GenUX SDK Component Analysis & Refactoring Plan

## Current Component Architecture

### 1. **ChatWindow.tsx** 
- **Purpose**: Main chat interface container with thread management
- **Features**: 
  - Thread manager integration
  - Message list with scrolling
  - Header with agent info
  - Floating/full-screen modes
  - Component override support
- **Dependencies**: ThreadManager, ChatMessage, ChatComposer, C1Component

### 2. **ChatMessage.tsx**
- **Purpose**: Individual message bubble component
- **Features**:
  - User/assistant message styling
  - Voice indicator
  - Streaming animation
  - C1Component rendering support
- **Reusable**: Yes, used by ChatWindow and GenerativeUIChat

### 3. **ChatComposer.tsx**
- **Purpose**: Message input area with send/voice buttons
- **Features**:
  - Auto-resizing textarea
  - Send button with disabled states
  - Voice connection toggle
  - Loading states
- **Reusable**: Yes, used by ChatWindow and GenerativeUIChat

### 4. **BubbleWidget.tsx**
- **Purpose**: Floating widget with circular button layout
- **Features**:
  - Main bubble button
  - Hover reveals: Chat, Mic, Fullscreen buttons
  - Fixed positioning (right-center)
  - Animated transitions
- **Unique**: Specifically for floating widget mode

### 5. **ChatButton.tsx**
- **Purpose**: Simple chat toggle button (default implementation)
- **Features**: Basic open/close functionality
- **Note**: Often overridden by BubbleWidget in practice

### 6. **GenerativeUIChat.tsx**
- **Purpose**: Alternative chat interface using TheSys SDK
- **Features**:
  - Different message rendering approach
  - C1Component integration
  - Thread manager from TheSys SDK
- **Issue**: Duplicates ChatWindow functionality with different implementation

### 7. **VoiceBotFullscreenLayout.tsx**
- **Purpose**: 3-column fullscreen layout
- **Features**:
  - Left: Thread manager
  - Center: AnimatedBlob with voice controls
  - Right: GenerativeUIChat
- **Dependencies**: Uses GenerativeUIChat instead of ChatWindow

### 8. **FullscreenLayout.tsx**
- **Purpose**: Similar to VoiceBotFullscreenLayout but more generic
- **Features**: Layout container with children prop
- **Issue**: Duplicates VoiceBotFullscreenLayout functionality

### 9. **VoiceBotClient.tsx**
- **Purpose**: Standalone voice bot implementation
- **Features**: Complete WebSocket/WebRTC implementation
- **Issue**: Duplicates ConnectionService functionality

## Problems Identified

### 1. **Code Duplication**
- Two chat interfaces: `ChatWindow` vs `GenerativeUIChat`
- Two fullscreen layouts: `FullscreenLayout` vs `VoiceBotFullscreenLayout`
- Two connection implementations: `ConnectionService` vs `VoiceBotClient`

### 2. **Inconsistent Dependencies**
- Some components use TheSys SDK (`@thesysai/genui-sdk`)
- Others use internal hooks (`useThreadManager`, `useGenuxClient`)
- Mixed styling approaches

### 3. **Poor Modularity**
- Components are tightly coupled
- Hard to use individual components standalone
- Circular dependencies between layouts and chat components

## Recommended Component Architecture

### Core Components to Export

```typescript
// 1. Thread List Component
export interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onRenameThread?: (threadId: string, title: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// 2. Message Composer Component
export interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  // Optional voice button
  showVoiceButton?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
}

// 3. Chat Message Component
export interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
  // Allow custom rendering
  renderContent?: (message: Message) => React.ReactNode;
}

// 4. Voice Bot Component
export interface VoiceBotProps {
  isConnected: boolean;
  isConnecting: boolean;
  onToggle: () => void;
  // Visual customization
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// 5. Floating Widget Component
export interface FloatingWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  children?: React.ReactNode;
  // Or use preset buttons
  buttons?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  }>;
  className?: string;
  style?: React.CSSProperties;
}
```

### Composite Components

```typescript
// 1. Full Chat Window (no threads)
export interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  header?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// 2. Chat Window with Threads
export interface ThreadedChatWindowProps extends ChatWindowProps {
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  showThreadList?: boolean;
  threadListPosition?: 'left' | 'right';
}

// 3. Fullscreen Layout
export interface FullscreenLayoutProps {
  // Layout slots
  left?: React.ReactNode;    // Thread list
  center?: React.ReactNode;   // Voice bot / Animated blob
  right?: React.ReactNode;    // Chat window
  // Configuration
  showThreads?: boolean;
  showVoiceBot?: boolean;
  className?: string;
}
```

## Refactoring Plan

### Phase 1: Create Base Components
1. Extract pure, reusable components
2. Remove all external dependencies (TheSys SDK)
3. Use only internal hooks and services

### Phase 2: Build Composite Components
1. Create `SimpleChatWindow` - just messages and composer
2. Create `ThreadedChatWindow` - adds thread list
3. Create unified `FullscreenLayout` with slots

### Phase 3: Remove Duplicates
1. Deprecate `GenerativeUIChat` in favor of `ChatWindow`
2. Merge `VoiceBotFullscreenLayout` into `FullscreenLayout`
3. Remove `VoiceBotClient` (use `ConnectionService`)

### Phase 4: Export Clean API

```typescript
// packages/genux-sdk/src/index.ts
export {
  // Core Components
  ThreadList,
  MessageComposer,
  ChatMessage,
  VoiceBot,
  FloatingWidget,
  
  // Composite Components
  ChatWindow,
  ThreadedChatWindow,
  FullscreenLayout,
  
  // Hooks
  useGenuxClient,
  useThreadManager,
  
  // Types
  Message,
  Thread,
  // ... other types
};
```

## Usage Examples

### 1. Simple Chat Window (Customer Service)
```typescript
import { ChatWindow, useGenuxClient } from 'genux-sdk';

function CustomerServiceChat() {
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: 'wss://api.example.com/ws'
  });
  
  return (
    <ChatWindow
      messages={client.messages}
      onSendMessage={client.sendText}
      isLoading={client.isLoading}
      header={<h3>Customer Support</h3>}
    />
  );
}
```

### 2. Floating Widget
```typescript
import { FloatingWidget, ChatWindow, VoiceBot, useGenuxClient } from 'genux-sdk';

function App() {
  const client = useGenuxClient(config);
  const [showChat, setShowChat] = useState(false);
  
  return (
    <>
      <FloatingWidget position="bottom-right">
        <button onClick={() => setShowChat(!showChat)}>
          {showChat ? '✕' : '💬'}
        </button>
        <VoiceBot
          isConnected={client.voiceState === 'connected'}
          isConnecting={client.voiceState === 'connecting'}
          onToggle={client.voiceState === 'connected' ? client.stopVoice : client.startVoice}
        />
      </FloatingWidget>
      
      {showChat && (
        <ChatWindow
          messages={client.messages}
          onSendMessage={client.sendText}
          style={{ position: 'fixed', bottom: 80, right: 20 }}
        />
      )}
    </>
  );
}
```

### 3. Fullscreen Experience
```typescript
import { FullscreenLayout, ThreadList, VoiceBot, ChatWindow, useGenuxClient, useThreadManager } from 'genux-sdk';

function FullscreenApp() {
  const client = useGenuxClient(config);
  const threads = useThreadManager();
  
  return (
    <FullscreenLayout
      left={
        <ThreadList
          threads={threads.threads}
          activeThreadId={threads.activeThreadId}
          onSelectThread={threads.switchThread}
          onCreateThread={threads.createThread}
        />
      }
      center={
        <VoiceBot
          size="large"
          animated
          isConnected={client.voiceState === 'connected'}
          onToggle={client.toggleVoice}
        />
      }
      right={
        <ChatWindow
          messages={client.messages}
          onSendMessage={client.sendText}
        />
      }
    />
  );
}
```

## Benefits of This Approach

1. **Modularity**: Each component serves a single purpose
2. **Reusability**: Components can be used independently
3. **Flexibility**: Easy to create custom layouts
4. **Consistency**: Single source of truth for each feature
5. **Simplicity**: Clear API with minimal props
6. **Extensibility**: Easy to add new features without breaking existing ones

## Migration Strategy

1. **Backward Compatibility**: Keep existing components but mark as deprecated
2. **Gradual Migration**: Introduce new components alongside old ones
3. **Documentation**: Provide clear migration guides
4. **Examples**: Show how to achieve same results with new components
5. **Deprecation Timeline**: Give users 2-3 releases to migrate