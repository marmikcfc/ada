# Genux SDK - Release Notes

## Version 2.0.0 - Major Feature Release

### 🎉 **New Features**

#### **Complete Component Override System**
The biggest addition in this release is a comprehensive component override system that allows complete customization of any UI component while maintaining all functionality.

**Overrideable Components:**
- `ChatButton` - The floating chat button/bubble
- `ChatWindow` - The main chat interface container  
- `ChatMessage` - Individual message bubbles
- `ChatComposer` - Message input area with send functionality
- `VoiceButton` - Voice connection toggle button

**Basic Usage:**
```tsx
import { Genux, ComponentOverrides } from 'genux-sdk';

const componentOverrides: Partial<ComponentOverrides> = {
  ChatButton: MyCustomButton,
  ChatWindow: MyCustomChatWindow,
  ChatMessage: MyCustomMessage,
  ChatComposer: MyCustomComposer,
  VoiceButton: MyCustomVoiceButton,
};

<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws"
  options={{
    components: componentOverrides,
    theme: customTheme,
  }}
/>
```

#### **Enhanced Thread Manager**
Significant improvements to the conversation thread management system:

**New Features:**
- ✅ **"New conversation" dedicated row** with plus icon
- ✅ **Duplicate thread prevention** - automatic filtering
- ✅ **Header control** - `hideHeader` prop for embedded usage
- ✅ **Improved UX** - cleaner interface with better visual hierarchy

**Thread Manager Props:**
```tsx
interface ThreadManagerProps {
  // ... existing props
  /** Whether to hide the header (useful when embedded with custom header) */
  hideHeader?: boolean;
}
```

#### **Default Component Exports**
Access to all default implementations for extending/customizing:

```tsx
import { 
  DefaultChatButton,
  DefaultChatWindow,
  DefaultChatMessage,
  DefaultChatComposer,
  DefaultBubbleWidget
} from 'genux-sdk';
```

---

### 🔧 **API Changes**

#### **New Component Override Props**

**GenuxOptions Interface Updates:**
```tsx
interface GenuxOptions {
  // ... existing options
  /** Component overrides for complete UI customization */
  components?: Partial<ComponentOverrides>;
}
```

**ComponentOverrides Interface:**
```tsx
interface ComponentOverrides {
  ChatButton: React.ComponentType<ChatButtonProps>;
  ChatWindow: React.ComponentType<ChatWindowProps>;
  ChatMessage: React.ComponentType<ChatMessageProps>;
  ChatComposer: React.ComponentType<ChatComposerProps>;
  VoiceButton: React.ComponentType<VoiceButtonProps>;
}
```

#### **Extended Component Props**

All components now support component overrides through cascading props:

```tsx
// ChatWindow now accepts componentOverrides
interface ExtendedChatWindowProps extends ChatWindowProps {
  // ... existing props
  componentOverrides?: Partial<ComponentOverrides>;
}

// ChatComposer now accepts componentOverrides for VoiceButton
interface ExtendedChatComposerProps extends ChatComposerProps {
  // ... existing props
  componentOverrides?: Partial<ComponentOverrides>;
}
```

---

### 📖 **Usage Examples**

#### **1. Complete Custom Chat Interface**

```tsx
import React from 'react';
import { 
  Genux, 
  ChatButtonProps, 
  ChatWindowProps,
  ChatMessageProps,
  ChatComposerProps,
  VoiceButtonProps,
  createTheme 
} from 'genux-sdk';

// Custom gradient chat button
const GradientChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110"
    style={{
      background: isOpen 
        ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
        : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    }}
  >
    {isOpen ? '✕' : '💬'}
  </button>
);

// Custom dark-themed chat window
const DarkChatWindow: React.FC<ChatWindowProps> = (props) => (
  <div className="fixed bottom-6 right-6 w-96 h-[600px] rounded-2xl shadow-2xl overflow-hidden bg-gray-900 border border-gray-700">
    {/* Custom dark theme implementation */}
    {/* ... implementation details */}
  </div>
);

// Custom message bubbles with animations
const AnimatedChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-sm px-4 py-2 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
        isUser 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
          : 'bg-white shadow-md text-gray-800 border'
      }`}>
        {message.content}
        {isStreaming && (
          <div className="inline-flex space-x-1 mt-2">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom composer with enhanced styling
const EnhancedChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  disabled,
  isLoading,
  onToggleVoiceConnection,
  isVoiceConnected
}) => {
  const [message, setMessage] = React.useState('');
  
  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t">
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
          />
          <button
            onClick={() => {
              onSendMessage(message);
              setMessage('');
            }}
            className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
        
        {onToggleVoiceConnection && (
          <button
            onClick={onToggleVoiceConnection}
            className={`p-3 rounded-full transition-all ${
              isVoiceConnected 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <MicIcon />
          </button>
        )}
      </div>
    </div>
  );
};

// Custom voice button with animated states
const AnimatedVoiceButton: React.FC<VoiceButtonProps> = ({ 
  onClick, 
  isConnected, 
  isConnecting 
}) => (
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
    <VoiceIcon isConnected={isConnected} />
  </button>
);

// Put it all together
function CustomGenuxApp() {
  const componentOverrides = {
    ChatButton: GradientChatButton,
    ChatWindow: DarkChatWindow,
    ChatMessage: AnimatedChatMessage,
    ChatComposer: EnhancedChatComposer,
    VoiceButton: AnimatedVoiceButton,
  };

  const customTheme = createTheme({
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#f8fafc',
    },
  });

  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws"
      options={{
        components: componentOverrides,
        theme: customTheme,
        agentName: "Custom AI Assistant",
      }}
    />
  );
}
```

#### **2. Extending Default Components**

```tsx
import { DefaultChatButton, ChatButtonProps } from 'genux-sdk';

// Add notification badge to default button
const NotificationChatButton: React.FC<ChatButtonProps> = (props) => (
  <div className="relative">
    <DefaultChatButton {...props} />
    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
      3
    </div>
  </div>
);

// Wrap default message with timestamp
const TimestampedMessage: React.FC<ChatMessageProps> = (props) => (
  <div>
    <DefaultChatMessage {...props} />
    <div className="text-xs text-gray-500 mt-1">
      {props.message.timestamp.toLocaleTimeString()}
    </div>
  </div>
);
```

#### **3. Conditional Component Selection**

```tsx
function AdaptiveGenuxApp() {
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  
  const componentOverrides = useMemo(() => {
    const overrides: Partial<ComponentOverrides> = {};
    
    // Role-based components
    if (userRole === 'admin') {
      overrides.ChatWindow = AdminChatWindow;
      overrides.ChatComposer = AdminChatComposer;
    }
    
    // Device-specific components
    if (deviceType === 'mobile') {
      overrides.ChatButton = MobileChatButton;
      overrides.ChatWindow = MobileChatWindow;
    }
    
    return overrides;
  }, [userRole, deviceType]);

  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws"
      options={{ components: componentOverrides }}
    />
  );
}
```

#### **4. Theme-Aware Components**

```tsx
const ThemedChatMessage: React.FC<ChatMessageProps & { theme?: Partial<ThemeTokens> }> = ({ 
  message, 
  theme 
}) => {
  const isDark = theme?.colors?.background === '#111827';
  
  return (
    <div className={`message ${isDark ? 'dark-theme' : 'light-theme'}`}>
      <div className={`bubble ${
        message.role === 'user' 
          ? isDark ? 'user-dark' : 'user-light'
          : isDark ? 'assistant-dark' : 'assistant-light'
      }`}>
        {message.content}
      </div>
    </div>
  );
};
```

---

### 🧵 **Thread Manager Enhancements**

#### **New "New Conversation" Row**

The thread manager now features a dedicated "New conversation" row at the top:

```tsx
// Automatic rendering in thread manager
<ThreadManager
  threads={threads}
  activeThreadId={activeId}
  onThreadSelect={handleSelect}
  onCreateThread={handleCreate}
  // ... other props
/>
```

**Features:**
- ✅ Dashed border for visual distinction
- ✅ Plus icon with primary color background
- ✅ "Creating conversation..." loading state
- ✅ Always visible at top of thread list

#### **Duplicate Prevention**

Threads are automatically filtered to prevent duplicates:

```tsx
// Automatic filtering logic
threads
  .filter((thread, index, self) => 
    index === self.findIndex(t => t.title === thread.title && t.id === thread.id)
  )
  .slice(0, maxThreads)
  .map(thread => <ThreadItem key={thread.id} {...thread} />)
```

#### **Header Control**

Control thread manager header visibility for embedded usage:

```tsx
// Hide header when embedded in custom container
<ThreadManager
  threads={threads}
  hideHeader={true} // Removes internal "Conversations" header
  // ... other props
/>
```

---

### 🎨 **Styling & Theming**

#### **CSS Variable Integration**

All themes now export CSS variables for broader integration:

```tsx
import { createTheme, themeToCssVars } from 'genux-sdk';

const theme = createTheme({
  colors: { primary: '#3b82f6' }
});

const cssVars = themeToCssVars(theme);
// Returns: { '--genux-color-primary': '#3b82f6', ... }

// Use in custom CSS
document.documentElement.style.setProperty('--genux-color-primary', '#3b82f6');
```

#### **Hover Effects & Animations**

Enhanced hover states and transitions:

```css
.thread-item:hover .thread-actions {
  opacity: 1;
}

.new-conversation-item:hover {
  background-color: var(--genux-color-background);
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
```

---

### 📦 **Package Updates**

#### **New Exports**

```tsx
// Default components
export {
  DefaultChatButton,
  DefaultChatWindow,
  DefaultChatMessage,
  DefaultChatComposer,
  DefaultBubbleWidget,
} from './components/defaults';

// Extended prop types
export type {
  ExtendedChatWindowProps,
  ExtendedChatComposerProps,
  ExtendedChatMessageProps,
  BubbleWidgetProps,
} from './components/defaults';
```

#### **Updated Types**

```tsx
// Enhanced GenuxOptions
interface GenuxOptions {
  // ... existing options
  components?: Partial<ComponentOverrides>;
}

// New ComponentOverrides interface
interface ComponentOverrides {
  ChatButton: React.ComponentType<ChatButtonProps>;
  ChatWindow: React.ComponentType<ChatWindowProps>;
  ChatMessage: React.ComponentType<ChatMessageProps>;
  ChatComposer: React.ComponentType<ChatComposerProps>;
  VoiceButton: React.ComponentType<VoiceButtonProps>;
}

// Enhanced ThreadManagerProps
interface ThreadManagerProps {
  // ... existing props
  hideHeader?: boolean;
}
```

---

### 🚀 **Migration Guide**

#### **From Version 1.x**

**No Breaking Changes** - All existing code continues to work unchanged.

**Optional Enhancements:**
1. **Add component overrides** for custom styling
2. **Use new thread manager features** automatically available
3. **Access default components** for extending functionality

#### **Upgrade Steps**

1. **Update package:**
   ```bash
   npm update genux-sdk
   ```

2. **Optional - Add component overrides:**
   ```tsx
   // Before
   <Genux webrtcURL="..." websocketURL="..." />
   
   // After (optional)
   <Genux 
     webrtcURL="..." 
     websocketURL="..."
     options={{
       components: { ChatButton: MyCustomButton }
     }}
   />
   ```

3. **Optional - Use enhanced thread manager:**
   ```tsx
   // Automatic improvements - no code changes needed
   <Genux showThreadManager={true} />
   ```

---

### 🔍 **Examples Repository**

Complete working examples available in `/examples`:

- **`component-overrides.tsx`** - Full customization showcase
- **`floating-widget.tsx`** - Enhanced bubble widget
- **`theme-variations.tsx`** - Multiple theme examples
- **`mobile-responsive.tsx`** - Mobile-optimized components
- **`admin-interface.tsx`** - Role-based customization

---

### 📚 **Updated Documentation**

- **[Customization Guide](./genux-sdk-customization.md)** - Complete component override guide
- **[API Reference](./genux-sdk-api-reference.md)** - Updated with new interfaces
- **[Examples](./genux-sdk-examples.md)** - Real-world implementation patterns
- **[Troubleshooting](./genux-sdk-troubleshooting.md)** - Component override debugging

---

### 🎯 **Next Steps**

**Recommended Actions:**
1. ✅ **Explore component overrides** for brand customization
2. ✅ **Test new thread manager features** in your application
3. ✅ **Review updated documentation** for advanced patterns
4. ✅ **Check examples** for implementation inspiration

**Coming Soon:**
- 🔄 Draggable chat window functionality
- 🎨 ShadCN design system integration
- 📱 Enhanced mobile components
- 🔧 More customization hooks

---

*For questions or support, check the [Troubleshooting Guide](./genux-sdk-troubleshooting.md) or review the [Examples](./genux-sdk-examples.md) for common patterns.* 