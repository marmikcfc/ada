# Myna SDK

A lightweight, fully-customizable JavaScript/TypeScript SDK for voice and chat interfaces with **complete component override capabilities**.

## ✨ **New in v2.0: Complete Customization**

- 🎨 **Component Override System** - Replace any UI component with your own
- 🧵 **Enhanced Thread Manager** - Improved conversation management  
- 📦 **Default Component Access** - Extend existing components easily
- 🎯 **No Breaking Changes** - All existing code continues to work

## 🚀 **Quick Start**

### **Basic Usage**
```tsx
import { Myna } from 'myna-sdk';

function App() {
  return (
    <Myna
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
    />
  );
}
```

### **With Custom Components**
```tsx
import { Myna, ComponentOverrides } from 'myna-sdk';

const customComponents: Partial<ComponentOverrides> = {
  ChatButton: MyCustomButton,
  ChatMessage: MyCustomMessage,
};

function App() {
  return (
    <Myna
      webrtcURL="/api/offer"  
      websocketURL="wss://api.example.com/ws/messages"
      options={{
        components: customComponents,
        theme: customTheme,
      }}
    />
  );
}
```

## 🎨 **Component Override System**

Replace any part of the interface while keeping all functionality:

| Component | Replaces | Use Case |
|-----------|----------|----------|
| `ChatButton` | Floating chat button | Custom branding, positioning |
| `ChatWindow` | Entire chat interface | Complete redesign |
| `ChatMessage` | Message bubbles | Custom styling, avatars |
| `ChatComposer` | Input area | Enhanced features, emojis |
| `VoiceButton` | Voice toggle | Custom animations, states |

### **Quick Example**
```tsx
// Custom gradient chat button
const GradientButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => (
  <button
    onClick={onClick}
    style={{
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
      // ... your custom styles
    }}
  >
    {isOpen ? '✕' : '💬'}
  </button>
);

// Use it
<Myna options={{ components: { ChatButton: GradientButton } }} />
```

## 🧵 **Enhanced Thread Manager**

Improved conversation management with:

- ✅ **"New conversation" dedicated button** with visual distinction
- ✅ **Duplicate prevention** - automatic filtering
- ✅ **Better UX** - cleaner interface and interactions
- ✅ **Header control** - hide/show internal headers

```tsx
<Myna 
  showThreadManager={true}
  options={{
    threadManager: {
      initiallyCollapsed: false,
      allowThreadDeletion: true,
      maxThreads: 50,
    }
  }}
/>
```

## 📚 **Documentation**

### **Getting Started**
- **[Component Overrides Quick Start](./docs/myna-sdk-component-overrides-quick-start.md)** - 5-minute setup guide
- **[Release Notes](./docs/myna-sdk-release-notes.md)** - Complete v2.0 feature overview

### **Guides**
- **[Customization Guide](./docs/myna-sdk-customization.md)** - Complete theming and component guide
- **[API Reference](./docs/myna-sdk-api-reference.md)** - All interfaces and props
- **[Examples](./docs/myna-sdk-examples.md)** - Real-world implementation patterns

### **Support**
- **[Troubleshooting](./docs/myna-sdk-troubleshooting.md)** - Common issues and solutions

## 🎯 **Features**

### **Core Capabilities**
- 🎤 **Voice Communication** - WebRTC-based real-time audio
- 💬 **Text Chat** - Rich messaging with C1Component support
- 🧵 **Thread Management** - Conversation history and persistence
- 🎨 **Complete Customization** - Override any component
- 📱 **Responsive Design** - Works on desktop and mobile

### **Customization Options**
- 🎨 **Theme System** - Colors, typography, spacing, borders
- 🧩 **Component Overrides** - Replace any UI component
- 🔧 **Headless Mode** - Build completely custom interfaces
- 📦 **Default Components** - Extend existing implementations

### **Developer Experience**
- 🛠️ **TypeScript Support** - Full type safety
- 📖 **Comprehensive Docs** - Guides, examples, and API reference
- ⚡ **Quick Setup** - Working in minutes
- 🔄 **No Breaking Changes** - Seamless upgrades

## 🛠️ **Installation**

```bash
npm install myna-sdk
```

### **Peer Dependencies**
```bash
npm install react react-dom
```

## 🔧 **Configuration Options**

```tsx
interface MynaOptions {
  // Component customization
  components?: Partial<ComponentOverrides>;
  
  // Visual theming
  theme?: Partial<ThemeTokens>;
  
  // Agent configuration
  agentName?: string;
  logoUrl?: string;
  
  // Thread management
  threadManager?: {
    enablePersistence?: boolean;
    maxThreads?: number;
    allowThreadDeletion?: boolean;
    initiallyCollapsed?: boolean;
  };
  
  // Technical integration
  mcpEndpoints?: MCPEndpoint[];
  visualization?: {
    provider: 'default' | 'custom' | 'none';
    render?: (msg: AssistantMessage) => React.ReactNode;
  };
}
```

## 📱 **Usage Patterns**

### **E-commerce Support Widget**
```tsx
<Myna
  webrtcURL="/api/offer"
  websocketURL="wss://api.shop.com/ws/support"
  options={{
    agentName: "Shopping Assistant",
    theme: ecommerceTheme,
    components: { ChatButton: BrandedButton },
  }}
/>
```

### **SaaS Customer Support**
```tsx
<Myna
  bubbleEnabled={false} // Full-screen mode
  showThreadManager={true}
  options={{
    agentName: "Support Team",
    threadManager: { allowThreadDeletion: true },
    components: { ChatWindow: SaaSChatWindow },
  }}
/>
```

### **Mobile-Optimized Chat**
```tsx
<Myna
  options={{
    components: {
      ChatButton: MobileChatButton,
      ChatWindow: MobileChatWindow,
      ChatMessage: MobileMessage,
    },
    theme: mobileTheme,
  }}
/>
```

## 🌟 **Examples**

### **Basic Theme Customization**
```tsx
import { createTheme } from 'myna-sdk';

const brandTheme = createTheme({
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#f8fafc',
  },
  borderRadius: {
    lg: '1rem',
  },
});

<Myna options={{ theme: brandTheme }} />
```

### **Extending Default Components**
```tsx
import { DefaultChatButton } from 'myna-sdk';

const NotificationButton: React.FC<ChatButtonProps> = (props) => (
  <div style={{ position: 'relative' }}>
    <DefaultChatButton {...props} />
    <NotificationBadge count={3} />
  </div>
);
```

### **Conditional Overrides**
```tsx
const overrides = useMemo(() => {
  return isMobile ? mobileComponents : desktopComponents;
}, [isMobile]);

<Myna options={{ components: overrides }} />
```

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines for details.

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Ready to get started?** Check out the **[Component Overrides Quick Start](./docs/myna-sdk-component-overrides-quick-start.md)** for a 5-minute setup guide.
