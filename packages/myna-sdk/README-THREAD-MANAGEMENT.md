# Thread Management in Myna SDK

The Myna SDK includes comprehensive thread management capabilities that allow users to create, switch between, and manage multiple conversation threads. This feature is perfect for chat applications that need to maintain separate conversation contexts.

## Features

✅ **Thread Creation** - Create new conversation threads  
✅ **Thread Switching** - Switch between existing threads  
✅ **Thread Renaming** - Edit thread titles inline  
✅ **Thread Deletion** - Delete threads with confirmation  
✅ **Auto-generated Titles** - Automatic titles from first message  
✅ **Persistence** - Threads saved to localStorage  
✅ **Loading States** - Proper loading indicators  
✅ **Empty States** - Helpful empty state messages  
✅ **Customizable** - Full theming and configuration support  

## Quick Start

### 1. Enable Thread Manager in Myna Component

```tsx
import { Myna } from 'myna-sdk';

function App() {
  return (
    <Myna
      webrtcURL="https://your-backend.com/api/offer"
      websocketURL="wss://your-backend.com/ws/messages"
      bubbleEnabled={false} // Use full-screen mode to show sidebar
      showThreadManager={true} // Enable thread management
      options={{
        agentName: "AI Assistant",
        theme: {
          primary: '#3b82f6',
        }
      }}
    />
  );
}
```

### 2. Custom Implementation with useThreadManager Hook

```tsx
import { useThreadManager, ThreadManager } from 'myna-sdk';

function CustomChat() {
  const threadManager = useThreadManager({
    enablePersistence: true,
    storageKey: 'my-app-threads',
    maxThreads: 50,
    autoGenerateTitles: true,
  });

  const handleThreadSelect = (threadId: string) => {
    threadManager.switchThread(threadId);
    // Load messages for the selected thread
  };

  const handleCreateThread = () => {
    threadManager.createThread('New conversation');
  };

  return (
    <div style={{ display: 'flex', height: '600px' }}>
      <div style={{ width: '300px' }}>
        <ThreadManager
          threads={threadManager.threads}
          activeThreadId={threadManager.activeThreadId ?? undefined}
          onThreadSelect={handleThreadSelect}
          onCreateThread={handleCreateThread}
          onDeleteThread={threadManager.deleteThread}
          onRenameThread={threadManager.renameThread}
          isCreatingThread={threadManager.isCreatingThread}
          isLoading={threadManager.isLoading}
        />
      </div>
      <div style={{ flex: 1 }}>
        {/* Your chat interface here */}
        <div>Chat for thread: {threadManager.currentThread?.title}</div>
      </div>
    </div>
  );
}
```

## API Reference

### useThreadManager Hook

The `useThreadManager` hook provides state management for conversation threads.

#### Options

```tsx
interface UseThreadManagerOptions {
  /** Storage key for localStorage persistence */
  storageKey?: string; // default: 'myna-threads'
  
  /** Enable localStorage persistence */
  enablePersistence?: boolean; // default: true
  
  /** Custom title generator function */
  generateTitle?: (firstMessage: string) => string;
  
  /** Max threads to keep in memory */
  maxThreadsInMemory?: number; // default: 100
  
  /** Max threads to display in UI */
  maxThreads?: number; // default: 50
  
  /** Auto-generate thread titles */
  autoGenerateTitles?: boolean; // default: true
  
  /** Show create button in UI */
  showCreateButton?: boolean; // default: true
  
  /** Allow thread deletion */
  allowThreadDeletion?: boolean; // default: true
}
```

#### Return Value

```tsx
interface UseThreadManagerResult {
  // State
  threads: ThreadSummary[];
  activeThreadId: string | null;
  isCreatingThread: boolean;
  isLoading: boolean;
  currentThread: Thread | null;
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

### ThreadManager Component

The `ThreadManager` component provides a UI for managing conversation threads.

#### Props

```tsx
interface ThreadManagerProps {
  /** List of thread summaries to display */
  threads: ThreadSummary[];
  
  /** Currently active thread ID */
  activeThreadId?: string;
  
  /** Called when user selects a thread */
  onThreadSelect: (threadId: string) => void;
  
  /** Called when user creates a new thread */
  onCreateThread: () => void;
  
  /** Called when user deletes a thread */
  onDeleteThread?: (threadId: string) => void;
  
  /** Called when user renames a thread */
  onRenameThread?: (threadId: string, newTitle: string) => void;
  
  /** Whether thread creation is in progress */
  isCreatingThread?: boolean;
  
  /** Whether threads are loading */
  isLoading?: boolean;
  
  /** Thread manager configuration */
  options?: ThreadManagerOptions;
  
  /** Custom theme */
  theme?: Partial<ThemeTokens>;
  
  /** Additional styles */
  style?: React.CSSProperties;
  
  /** Additional CSS classes */
  className?: string;
}
```

## Data Types

### Thread

```tsx
interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
  isActive?: boolean;
}
```

### ThreadSummary

```tsx
interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}
```

## Usage Patterns

### 1. Basic Thread Management

```tsx
const threadManager = useThreadManager();

// Create a new thread
const threadId = await threadManager.createThread('Hello there!');

// Switch to a thread
await threadManager.switchThread(threadId);

// Update thread with new message
threadManager.updateThread(threadId, 'New message', 'msg-123');

// Delete a thread
await threadManager.deleteThread(threadId);
```

### 2. Thread Persistence Configuration

```tsx
const threadManager = useThreadManager({
  enablePersistence: true,
  storageKey: 'my-app-conversations',
  maxThreadsInMemory: 50,
});
```

### 3. Custom Title Generation

```tsx
const threadManager = useThreadManager({
  autoGenerateTitles: true,
  generateTitle: (firstMessage) => {
    // Custom logic for generating titles
    const words = firstMessage.split(' ').slice(0, 4);
    return words.join(' ') + (firstMessage.length > 20 ? '...' : '');
  },
});
```

### 4. Thread Manager with Custom Theme

```tsx
<ThreadManager
  {...threadManagerProps}
  theme={{
    primary: '#059669',
    surface: '#f0fdf4',
    text: '#064e3b',
    border: '#bbf7d0',
  }}
  options={{
    maxThreads: 20,
    showCreateButton: true,
    allowThreadDeletion: true,
  }}
/>
```

### 5. Handling Thread Operations

```tsx
const handleThreadSelect = async (threadId: string) => {
  try {
    await threadManager.switchThread(threadId);
    // Load messages for the selected thread
    loadMessagesForThread(threadId);
  } catch (error) {
    console.error('Failed to switch thread:', error);
  }
};

const handleCreateThread = async () => {
  try {
    const threadId = await threadManager.createThread();
    // Clear current chat and prepare for new conversation
    clearCurrentChat();
  } catch (error) {
    console.error('Failed to create thread:', error);
  }
};
```

## Integration with Existing Chat

### Message Association

When using thread management, associate messages with the active thread:

```tsx
const sendMessage = async (content: string) => {
  if (threadManager.activeThreadId) {
    // Send message via your chat service
    const messageId = await chatService.sendMessage(content, threadManager.activeThreadId);
    
    // Update the thread with the new message
    threadManager.updateThread(threadManager.activeThreadId, content, messageId);
  } else {
    // Create a new thread if none exists
    const threadId = await threadManager.createThread(content);
    // Then send the message
    await chatService.sendMessage(content, threadId);
  }
};
```

### Loading Thread Messages

```tsx
const loadThreadMessages = async (threadId: string) => {
  setLoading(true);
  try {
    const messages = await chatService.getThreadMessages(threadId);
    setMessages(messages);
  } catch (error) {
    console.error('Failed to load thread messages:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (threadManager.activeThreadId) {
    loadThreadMessages(threadManager.activeThreadId);
  }
}, [threadManager.activeThreadId]);
```

## Styling and Customization

### CSS Classes

The ThreadManager component uses these CSS classes for styling:

- `.myna-thread-manager` - Main container
- `.myna-thread-manager-header` - Header with title and create button
- `.myna-thread-list` - Thread list container
- `.thread-item` - Individual thread item
- `.thread-item.active` - Active thread item
- `.thread-actions` - Thread action buttons container
- `.create-button` - New thread creation button

### Custom Styling

```css
.myna-thread-manager {
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.thread-item {
  transition: all 0.2s ease;
}

.thread-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.thread-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## Error Handling

The thread manager includes built-in error handling for common scenarios:

```tsx
const threadManager = useThreadManager();

// Check for errors
if (threadManager.error) {
  console.error('Thread manager error:', threadManager.error);
}

// Handle async operation errors
try {
  await threadManager.createThread('New chat');
} catch (error) {
  // Handle creation error
  alert('Failed to create thread: ' + error.message);
}
```

## Performance Considerations

1. **Memory Management**: Threads are automatically limited by `maxThreadsInMemory`
2. **Persistence**: Uses localStorage with error handling for storage failures
3. **Lazy Loading**: Thread messages are loaded only when needed
4. **Debounced Updates**: Thread updates are optimized to prevent excessive re-renders

## Accessibility

The ThreadManager component includes:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly text
- Focus management for inline editing
- High contrast support

## Migration Guide

If you're upgrading from a version without thread management:

1. **No Breaking Changes**: Thread management is opt-in
2. **Existing Messages**: Current messages remain unaffected
3. **Storage**: New localStorage keys are used (no conflicts)
4. **API**: All existing APIs remain the same

```tsx
// Before (still works)
<Myna webrtcURL="..." websocketURL="..." />

// After (with threads)
<Myna 
  webrtcURL="..." 
  websocketURL="..." 
  showThreadManager={true} 
/>
```

## Examples

See the complete examples in `examples/thread-management.tsx` for:

- Myna component with thread management
- Custom implementation with useThreadManager
- Standalone ThreadManager component
- Integration patterns and best practices 