# Genux SDK - Component Overrides Quick Start

## 🚀 **5-Minute Setup**

Replace any Genux component with your own custom implementation while keeping all functionality.

### **1. Install & Import**

```tsx
import { 
  Genux, 
  ComponentOverrides,
  ChatButtonProps,
  ChatWindowProps,
  ChatMessageProps,
  ChatComposerProps,
  VoiceButtonProps 
} from 'genux-sdk';
```

### **2. Create Custom Components**

```tsx
// Replace the chat button
const MyCustomButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => (
  <button 
    onClick={onClick} 
    className="my-custom-button"
    style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px',
      background: isOpen ? 'red' : 'blue',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '60px',
      height: '60px'
    }}
  >
    {isOpen ? '✕' : '💬'}
  </button>
);

// Replace message bubbles
const MyCustomMessage: React.FC<ChatMessageProps> = ({ message }) => (
  <div style={{
    padding: '10px',
    margin: '5px 0',
    backgroundColor: message.role === 'user' ? '#007bff' : '#f8f9fa',
    color: message.role === 'user' ? 'white' : 'black',
    borderRadius: '10px',
    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
  }}>
    {message.content}
  </div>
);
```

### **3. Apply Overrides**

```tsx
function App() {
  const componentOverrides: Partial<ComponentOverrides> = {
    ChatButton: MyCustomButton,
    ChatMessage: MyCustomMessage,
  };

  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws"
      options={{
        components: componentOverrides
      }}
    />
  );
}
```

---

## 🎯 **Component Types**

| Component | What it replaces | Required Props |
|-----------|------------------|----------------|
| `ChatButton` | Floating chat button | `onClick`, `isOpen` |
| `ChatWindow` | Entire chat interface | `messages`, `onSendMessage`, `onClose` |
| `ChatMessage` | Individual message bubbles | `message`, `isLast`, `isStreaming` |
| `ChatComposer` | Message input area | `onSendMessage`, `disabled`, `isLoading` |
| `VoiceButton` | Voice toggle button | `onClick`, `isConnected`, `isConnecting` |

---

## ⚡ **Quick Examples**

### **Custom Gradient Button**
```tsx
const GradientButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
      color: 'white',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    }}
  >
    {isOpen ? '✕' : '💬'}
  </button>
);
```

### **Custom Message with Avatar**
```tsx
const AvatarMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: '8px',
      margin: '8px 0'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: isUser ? '#007bff' : '#28a745',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px'
      }}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div style={{
        padding: '8px 12px',
        borderRadius: '16px',
        backgroundColor: isUser ? '#007bff' : '#f1f1f1',
        color: isUser ? 'white' : 'black',
        maxWidth: '70%'
      }}>
        {message.content}
      </div>
    </div>
  );
};
```

### **Custom Input with Emoji Picker**
```tsx
const EmojiComposer: React.FC<ChatComposerProps> = ({ 
  onSendMessage, 
  disabled 
}) => {
  const [message, setMessage] = React.useState('');
  
  return (
    <div style={{ 
      display: 'flex', 
      padding: '12px',
      gap: '8px',
      borderTop: '1px solid #eee'
    }}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '20px',
          outline: 'none'
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && message.trim()) {
            onSendMessage(message);
            setMessage('');
          }
        }}
      />
      <button
        onClick={() => setMessage(message + '😊')}
        style={{ padding: '8px', border: 'none', background: 'transparent' }}
      >
        😊
      </button>
      <button
        onClick={() => {
          if (message.trim()) {
            onSendMessage(message);
            setMessage('');
          }
        }}
        disabled={disabled || !message.trim()}
        style={{
          padding: '8px 12px',
          border: 'none',
          borderRadius: '20px',
          backgroundColor: '#007bff',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Send
      </button>
    </div>
  );
};
```

---

## 🎨 **Extending Default Components**

```tsx
import { DefaultChatButton } from 'genux-sdk';

// Add notification badge to existing button
const NotificationButton: React.FC<ChatButtonProps> = (props) => (
  <div style={{ position: 'relative' }}>
    <DefaultChatButton {...props} />
    <div style={{
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px'
    }}>
      3
    </div>
  </div>
);
```

---

## 🔧 **Pro Tips**

### **1. Conditional Overrides**
```tsx
const overrides = useMemo(() => {
  const components: Partial<ComponentOverrides> = {};
  
  if (isMobile) {
    components.ChatButton = MobileChatButton;
  }
  
  if (isDarkMode) {
    components.ChatMessage = DarkChatMessage;
  }
  
  return components;
}, [isMobile, isDarkMode]);
```

### **2. Theme Integration**
```tsx
const ThemedMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const theme = useTheme(); // Your theme context
  
  return (
    <div style={{
      backgroundColor: theme.colors.primary,
      color: theme.colors.text,
      // ... other theme-based styles
    }}>
      {message.content}
    </div>
  );
};
```

### **3. Multiple Override Sets**
```tsx
const themes = {
  corporate: { ChatButton: CorporateButton, ChatMessage: CorporateMessage },
  playful: { ChatButton: PlayfulButton, ChatMessage: PlayfulMessage },
  minimal: { ChatButton: MinimalButton, ChatMessage: MinimalMessage },
};

<Genux options={{ components: themes[selectedTheme] }} />
```

---

## ⚠️ **Important Notes**

- ✅ **No breaking changes** - existing code works unchanged
- ✅ **Partial overrides** - override only what you need
- ✅ **Props forwarding** - all original props are passed to your components
- ⚠️ **TypeScript** - use provided prop interfaces for type safety
- ⚠️ **State management** - maintain internal state in your custom components

---

## 📚 **Next Steps**

1. **Try the examples above** in your application
2. **Check [Complete Examples](./genux-sdk-examples.md)** for advanced patterns
3. **Read [Full Documentation](./genux-sdk-customization.md)** for detailed guides
4. **Review [API Reference](./genux-sdk-api-reference.md)** for all prop interfaces

---

*Need help? Check the [Troubleshooting Guide](./genux-sdk-troubleshooting.md) for common issues.* 