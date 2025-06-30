# Genux SDK

A lightweight, fully-customizable JavaScript/TypeScript SDK for voice and chat interfaces with **complete component override capabilities** and **immersive fullscreen mode**.

## ✨ **New in v2.1: Fullscreen Immersive Experience**

- 🌟 **Fullscreen 3-Column Layout** - Immersive conversational interface
- 🎯 **3D Animated Blob** - Three.js-powered voice-reactive sphere
- 🔄 **Circular Button Arrangement** - Enhanced bubble widget interactions  
- 🧵 **Advanced Thread Manager** - Collapsible conversation management
- 🎨 **Glass Morphism Design** - Modern blur effects and translucent interfaces
- ⚙️ **Complete Configuration** - Agent branding, colors, and custom text

## ✨ **Previous: v2.0 Complete Customization**

- 🎨 **Component Override System** - Replace any UI component with your own
- 🧵 **Enhanced Thread Manager** - Improved conversation management  
- 📦 **Default Component Access** - Extend existing components easily
- 🎯 **No Breaking Changes** - All existing code continues to work

## 🚀 **Quick Start**

### **Basic Usage**
```tsx
import { Genux } from 'genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
    />
  );
}
```

### **✨ With Fullscreen Mode**
```tsx
import { Genux } from 'genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="wss://api.example.com/ws/messages"
      allowFullScreen={true}
      options={{
        agentName: "Ada",
        agentSubtitle: "Your intelligent assistant",
        backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        primaryColor: "#667eea",
        startCallButtonText: "🎤 Start Voice Chat",
        threadManagerTitle: "Chat History",
      }}
    />
  );
}
```

### **With Custom Components**
```tsx
import { Genux, ComponentOverrides } from 'genux-sdk';

const customComponents: Partial<ComponentOverrides> = {
  ChatButton: MyCustomButton,
  ChatMessage: MyCustomMessage,
};

function App() {
  return (
    <Genux
      webrtcURL="/api/offer"  
      websocketURL="wss://api.example.com/ws/messages"
      allowFullScreen={true}
      options={{
        components: customComponents,
        theme: customTheme,
      }}
    />
  );
}
```

## 🌟 **Fullscreen Immersive Mode**

### **3-Column Layout Experience**
When `allowFullScreen={true}`, users can click the fullscreen button in the bubble hover menu to access an immersive 3-column interface:

| Column | Content | Features |
|--------|---------|----------|
| **Left** | Thread Manager | Collapsible, create/rename/delete conversations |
| **Middle** | 3D Animated Blob | Voice-reactive sphere, agent branding, call controls |
| **Right** | Chat Interface | Message history, input composer, real-time chat |

### **3D Animated Blob Features**
- 🎭 **Three.js WebGL Rendering** - Smooth 60fps animations
- 🎵 **Voice-Reactive Effects** - Blob responds to audio input/output
- 🖱️ **Mouse Interactions** - Hover effects and position-based displacement
- 🌊 **Noise-Based Animation** - Organic vertex displacement with shaders
- 🎨 **Configurable Styling** - Custom gradients and color schemes

### **Enhanced Bubble Widget**
- 🔄 **Circular Button Layout** - Chat (top), Fullscreen (left), Mic (bottom)
- 📱 **Improved Positioning** - Fixed positioning issues and better spacing
- ✨ **Smooth Animations** - Scale effects and position transitions
- 🎯 **Touch-Friendly** - Optimized for mobile interactions

## 🎨 **Component Override System**

Replace any part of the interface while keeping all functionality:

| Component | Replaces | Use Case |
|-----------|----------|----------|
| `ChatButton` | Floating chat button | Custom branding, positioning |
| `ChatWindow` | Entire chat interface | Complete redesign |
| `ChatMessage` | Message bubbles | Custom styling, avatars |
| `ChatComposer` | Input area | Enhanced features, emojis |
| `VoiceButton` | Voice toggle | Custom animations, states |
| `FullscreenLayout` | Fullscreen interface | Custom 3-column layouts |
| `AnimatedBlob` | 3D blob | Custom animations, models |

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
<Genux options={{ components: { ChatButton: GradientButton } }} />
```

## 🧵 **Enhanced Thread Manager**

Improved conversation management with:

- ✅ **"New conversation" dedicated button** with visual distinction
- ✅ **Duplicate prevention** - automatic filtering
- ✅ **Better UX** - cleaner interface and interactions
- ✅ **Header control** - hide/show internal headers
- ✅ **Collapsible Design** - Expand/collapse to save space
- ✅ **Real-time Persistence** - localStorage with configurable keys

```tsx
<Genux 
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
- **[Component Overrides Quick Start](./docs/genux-sdk-component-overrides-quick-start.md)** - 5-minute setup guide
- **[Fullscreen Mode Guide](./docs/genux-sdk-fullscreen-guide.md)** - Complete fullscreen setup
- **[Release Notes](./docs/genux-sdk-release-notes.md)** - Complete v2.1 feature overview

### **Guides**
- **[Customization Guide](./docs/genux-sdk-customization.md)** - Complete theming and component guide
- **[API Reference](./docs/genux-sdk-api-reference.md)** - All interfaces and props
- **[Examples](./docs/genux-sdk-examples.md)** - Real-world implementation patterns

### **Support**
- **[Troubleshooting](./docs/genux-sdk-troubleshooting.md)** - Common issues and solutions

## 🎯 **Features**

### **Core Capabilities**
- 🎤 **Voice Communication** - WebRTC-based real-time audio
- 💬 **Text Chat** - Rich messaging with C1Component support
- 🧵 **Thread Management** - Conversation history and persistence
- 🎨 **Complete Customization** - Override any component
- 📱 **Responsive Design** - Works on desktop and mobile
- 🌟 **Fullscreen Mode** - Immersive 3-column experience

### **Fullscreen Features**
- 🎭 **3D Animations** - WebGL-powered blob with voice reactions
- 🔄 **Thread Management** - Create, rename, delete conversations
- 🎨 **Agent Branding** - Custom names, subtitles, logos, colors
- 📱 **Responsive Layout** - Adapts to different screen sizes
- ✨ **Glass Morphism** - Modern blur effects and transparency
- 🎯 **Voice Controls** - Integrated call management

### **Customization Options**
- 🎨 **Theme System** - Colors, typography, spacing, borders
- 🧩 **Component Overrides** - Replace any UI component
- 🔧 **Headless Mode** - Build completely custom interfaces
- 📦 **Default Components** - Extend existing implementations
- ⚙️ **Fullscreen Config** - Agent details, colors, button text

### **Developer Experience**
- 🛠️ **TypeScript Support** - Full type safety
- 📖 **Comprehensive Docs** - Guides, examples, and API reference
- ⚡ **Quick Setup** - Working in minutes
- 🔄 **No Breaking Changes** - Seamless upgrades

## 🛠️ **Installation**

```bash
npm install genux-sdk three @types/three
```

### **Peer Dependencies**
```bash
npm install react react-dom
```

**Note**: Three.js is required for fullscreen mode 3D animations. If you don't use `allowFullScreen={true}`, the Three.js bundle won't be loaded.

## 🔧 **Configuration Options**

```tsx
interface GenuxProps {
  webrtcURL: string;
  websocketURL: string;
  bubbleEnabled?: boolean;
  showThreadManager?: boolean;
  allowFullScreen?: boolean;     // ✨ NEW: Enable fullscreen mode
  options?: GenuxOptions;
}

interface GenuxOptions {
  // Component customization
  components?: Partial<ComponentOverrides>;
  
  // Visual theming
  theme?: Partial<ThemeTokens>;
  
  // Agent configuration
  agentName?: string;
  agentSubtitle?: string;        // ✨ NEW: Subtitle for fullscreen
  logoUrl?: string;
  
  // ✨ NEW: Fullscreen styling
  backgroundColor?: string;      // Background gradient/color
  primaryColor?: string;         // Main accent color
  accentColor?: string;         // Secondary accent color
  
  // ✨ NEW: Thread manager in fullscreen
  threadManagerTitle?: string;   // Custom title
  enableThreadManager?: boolean; // Show/hide thread manager
  
  // ✨ NEW: Button text customization
  startCallButtonText?: string;  // "Start a call" button
  endCallButtonText?: string;    // "End call" button
  connectingText?: string;       // "Connecting..." text
  
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

### **E-commerce Support Widget with Fullscreen**
```tsx
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.shop.com/ws/support"
  allowFullScreen={true}
  options={{
    agentName: "Shopping Assistant",
    agentSubtitle: "I'm here to help with your purchase",
    backgroundColor: "linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)",
    primaryColor: "#ff6b6b",
    startCallButtonText: "🛍️ Talk to Assistant",
    theme: ecommerceTheme,
    components: { ChatButton: BrandedButton },
  }}
/>
```

### **SaaS Customer Support with Full Experience**
```tsx
<Genux
  bubbleEnabled={false} // Full-screen mode
  showThreadManager={true}
  allowFullScreen={true}
  options={{
    agentName: "Support Team",
    agentSubtitle: "We're here to help you succeed",
    threadManagerTitle: "Support History",
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    threadManager: { allowThreadDeletion: true },
    components: { ChatWindow: SaaSChatWindow },
  }}
/>
```

### **Mobile-Optimized with Voice Focus**
```tsx
<Genux
  allowFullScreen={true}
  options={{
    agentName: "Voice Assistant",
    agentSubtitle: "Tap to start voice conversation",
    startCallButtonText: "🎤 Start Talking",
    endCallButtonText: "🔇 End Call",
    backgroundColor: "linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)",
    components: {
      ChatButton: MobileChatButton,
      AnimatedBlob: CustomVoiceBlob,
    },
    theme: mobileTheme,
  }}
/>
```

## 🌟 **Examples**

### **Basic Fullscreen Configuration**
```tsx
import { Genux } from 'genux-sdk';

const config = {
  agentName: "Ada",
  agentSubtitle: "Your AI assistant",
  backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  primaryColor: "#667eea",
  accentColor: "#5a67d8",
  startCallButtonText: "Start conversation",
  threadManagerTitle: "Chat History",
};

<Genux allowFullScreen={true} options={config} />
```

### **Custom 3D Blob Animation**
```tsx
import { AnimatedBlob } from 'genux-sdk';

const CustomBlob: React.FC<AnimatedBlobProps> = (props) => (
  <AnimatedBlob
    {...props}
    style={{
      background: 'radial-gradient(circle, #ff6b6b, #4ecdc4)',
    }}
  />
);

<Genux 
  allowFullScreen={true}
  options={{ 
    components: { AnimatedBlob: CustomBlob } 
  }} 
/>
```

### **Extending Default Components**
```tsx
import { DefaultChatButton, FullscreenLayout } from 'genux-sdk';

const NotificationButton: React.FC<ChatButtonProps> = (props) => (
  <div style={{ position: 'relative' }}>
    <DefaultChatButton {...props} />
    <NotificationBadge count={3} />
  </div>
);

const CustomFullscreen: React.FC<FullscreenLayoutProps> = (props) => (
  <FullscreenLayout
    {...props}
    config={{
      ...props.config,
      backgroundColor: "linear-gradient(45deg, #your-brand-colors)",
    }}
  />
);
```

### **Conditional Features**
```tsx
const features = useMemo(() => ({
  allowFullScreen: !isMobile, // Disable on mobile
  showThreadManager: isDesktop,
  components: isMobile ? mobileComponents : desktopComponents,
}), [isMobile, isDesktop]);

<Genux {...features} />
```

## 🎨 **Theming & Styling**

### **Fullscreen Theme Configuration**
```tsx
const customTheme = {
  // Background gradient for fullscreen
  backgroundColor: "linear-gradient(135deg, #your-primary 0%, #your-secondary 100%)",
  
  // Color scheme
  primaryColor: "#your-primary",
  accentColor: "#your-accent", 
  
  // Traditional theme tokens
  colors: {
    primary: "#your-primary",
    background: "#f8fafc",
    surface: "rgba(255, 255, 255, 0.9)",
  },
  
  // Glass morphism effects (built-in)
  // - backdrop-filter: blur(20px)
  // - rgba backgrounds with transparency
  // - Smooth transitions and animations
};
```

### **Advanced Styling Options**
```css
/* Custom CSS for additional styling */
.genux-fullscreen-layout {
  /* Override fullscreen layout styles */
}

.animated-blob-container {
  /* Custom blob container styling */
}

.thread-manager-column {
  /* Thread manager customization */
}
```

## 🔌 **Available Components for Override**

| Component | Props Interface | Purpose |
|-----------|----------------|---------|
| `Genux` | `GenuxProps` | Main SDK component |
| `BubbleWidget` | `BubbleWidgetProps` | Floating button widget |
| `FullscreenLayout` | `FullscreenLayoutProps` | 3-column fullscreen interface |
| `AnimatedBlob` | `AnimatedBlobProps` | 3D WebGL blob animation |
| `ChatWindow` | `ChatWindowProps` | Chat interface container |
| `ChatMessage` | `ChatMessageProps` | Individual message display |
| `ChatComposer` | `ChatComposerProps` | Message input area |
| `ThreadManager` | `ThreadManagerProps` | Conversation management |

## 🔄 **Migration Guide**

### **From v2.0 to v2.1**
✅ **No breaking changes** - all existing code continues to work.

**New Features Available:**
```tsx
// Add fullscreen mode to existing implementation
<Genux
  // ... existing props
  allowFullScreen={true}  // ✨ NEW
  options={{
    // ... existing options
    agentName: "Your Agent",           // ✨ NEW
    backgroundColor: "your-gradient",   // ✨ NEW
    startCallButtonText: "Custom text" // ✨ NEW
  }}
/>
```

### **Enabling Fullscreen Features**
1. **Install Three.js**: `npm install three @types/three`
2. **Add prop**: `allowFullScreen={true}`
3. **Configure**: Add fullscreen options to `options` prop
4. **Customize**: Override `FullscreenLayout` or `AnimatedBlob` if needed

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines for details.

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Ready to get started?** 
- **Quick Setup**: [Component Overrides Quick Start](./docs/genux-sdk-component-overrides-quick-start.md)
- **Fullscreen Mode**: [Fullscreen Guide](./docs/genux-sdk-fullscreen-guide.md)
- **API Reference**: [Complete API Documentation](./docs/genux-sdk-api-reference.md)

**Experience the immersive fullscreen mode with 3D animations and advanced thread management! 🌟**
