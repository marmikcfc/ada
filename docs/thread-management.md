# Thread Management Documentation

## Overview

The Genux SDK now includes comprehensive thread management capabilities allowing users to:

- Create new conversation threads
- Switch between existing threads  
- Rename and delete threads
- Automatic persistence to localStorage
- Auto-generated thread titles

## Quick Start

### Enable in Genux Component

```tsx
<Genux
  webrtcURL="..."
  websocketURL="..."
  showThreadManager={true}
  bubbleEnabled={false}
/>
```

### Custom Implementation

```tsx
import { useThreadManager, ThreadManager } from 'genux-sdk';

const threadManager = useThreadManager({
  enablePersistence: true,
  maxThreads: 50,
});

<ThreadManager
  threads={threadManager.threads}
  activeThreadId={threadManager.activeThreadId ?? undefined}
  onThreadSelect={threadManager.switchThread}
  onCreateThread={threadManager.createThread}
  onDeleteThread={threadManager.deleteThread}
  onRenameThread={threadManager.renameThread}
  isCreatingThread={threadManager.isCreatingThread}
  isLoading={threadManager.isLoading}
/>
```

## Key Components

1. **ThreadManager** - UI component for thread list
2. **useThreadManager** - Hook for thread state management
3. **Thread types** - TypeScript interfaces for thread data

## Features

- ✅ Thread creation/deletion/renaming
- ✅ Auto-generated titles from first message
- ✅ localStorage persistence
- ✅ Loading states and error handling
- ✅ Fully themeable and customizable
- ✅ TypeScript support

See `examples/thread-management.tsx` for complete usage examples. 