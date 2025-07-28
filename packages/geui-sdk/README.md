# GenUX SDK

A powerful, fully-customizable React SDK for building conversational AI interfaces with voice and text chat capabilities, rich AI-generated UI components, and seamless real-time interactions.

## ✨ **Latest Features**

- 🎤 **Voice & Text Chat** - WebRTC voice + WebSocket text with real-time streaming
- 🤖 **AI-Generated UI** - Rich interactive components from AI responses  
- 🎨 **Dual Theme System** - Complete customization with light/dark/custom themes
- 🌟 **Fullscreen Mode** - Immersive 3-column layout with 3D voice visualization
- 🧩 **Component Overrides** - Replace any UI component with your own
- 🌐 **Multi-Framework Support** - Generate HTML for Tailwind, Chakra UI, Material UI
- 🔧 **Headless Mode** - Build completely custom interfaces with hooks

## 🚀 **Quick Start**

### **Installation**
```bash
npm install @your-org/genux-sdk @thesysai/genui-sdk @crayonai/react-ui
# Or with pnpm
pnpm add @your-org/genux-sdk @thesysai/genui-sdk @crayonai/react-ui
```

### **Basic Chat Interface**
```tsx
import { Genux } from '@your-org/genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="http://localhost:8000/api/offer"
      websocketURL="ws://localhost:8000/ws/per-connection-messages"
      bubbleEnabled={true}
    />
  );
}
```

### **Chat-Only Mode (No Voice)**
```tsx
import { Genux } from '@your-org/genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="http://localhost:8000/api/offer"
      websocketURL="ws://localhost:8000/ws/per-connection-messages"
      disableVoice={true}
      bubbleEnabled={false}
    />
  );
}
```

### **Fullscreen Immersive Mode**
```tsx
import { Genux } from '@your-org/genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="http://localhost:8000/api/offer"
      websocketURL="ws://localhost:8000/ws/per-connection-messages"
      bubbleEnabled={false}  // Starts in fullscreen mode
      allowFullScreen={true}
      options={{
        agentName: "AI Assistant",
        theme: lightTheme,
        crayonTheme: crayonLightTheme
      }}
    />
  );
}
```

### **With Custom Themes**
```tsx
import { Genux, lightTheme, darkTheme, crayonLightTheme, crayonDarkTheme } from '@your-org/genux-sdk';

function App() {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <Genux
      webrtcURL="http://localhost:8000/api/offer"
      websocketURL="ws://localhost:8000/ws/per-connection-messages"
      options={{
        theme: isDark ? darkTheme : lightTheme,
        crayonTheme: isDark ? crayonDarkTheme : crayonLightTheme,
        agentName: "Support Assistant"
      }}
    />
  );
}
```

## 🎨 **Comprehensive Theme System**

GenUX provides a dual theme system for complete visual control:

### **Built-in Themes**
```tsx
import { 
  lightTheme, darkTheme, defaultTheme,
  crayonLightTheme, crayonDarkTheme, crayonDefaultTheme 
} from '@your-org/genux-sdk';

// Light theme for everything
<Genux
  options={{
    theme: lightTheme,           // SDK components
    crayonTheme: crayonLightTheme // Rich content (tables, lists, etc.)
  }}
/>

// Dark theme
<Genux
  options={{
    theme: darkTheme,
    crayonTheme: crayonDarkTheme
  }}
/>

// Default GenUX brand theme
<Genux
  options={{
    theme: defaultTheme,
    crayonTheme: crayonDefaultTheme
  }}
/>
```

### **Custom Theme Creation**
```tsx
import { createTheme, toCrayonTheme } from '@your-org/genux-sdk';

const myBrandTheme = createTheme({
  colors: {
    primary: '#your-brand-color',
    background: '#your-bg-color',
    surface: '#your-surface-color'
  },
  typography: {
    fontFamily: 'Your-Brand-Font'
  }
});

const myCrayonTheme = toCrayonTheme(myBrandTheme);

<Genux
  options={{
    theme: myBrandTheme,
    crayonTheme: myCrayonTheme
  }}
/>
```

## 🌟 **Key Features**

### **Voice & Text Communication**
- **WebRTC Voice** - Real-time audio with speech-to-text and text-to-speech
- **WebSocket Chat** - Live text messaging with streaming AI responses
- **Dual Mode Support** - Use voice, text, or both simultaneously
- **Audio Playback** - Automatic audio element management for voice responses

### **AI-Generated Rich Content**
- **C1 Components** - Interactive UI components from TheSys AI
- **HTML Generation** - Framework-specific HTML from OpenAI/Anthropic
- **Real-time Streaming** - Incremental content updates as AI generates responses
- **Multi-Framework** - Support for Tailwind, Chakra UI, Material UI, and more

### **Flexible UI Modes**
- **Bubble Widget** - Floating chat button with expandable interface
- **Fullscreen Mode** - Immersive 3-column layout with voice visualization
- **Chat-Only Mode** - Text-focused interface without voice features
- **Headless Mode** - Complete control with hooks for custom UIs

## 🔧 **Headless Mode**

For complete control over the UI, use the `useGenuxClient` hook:

```tsx
import { useGenuxClient } from '@your-org/genux-sdk';
import { useRef, useEffect } from 'react';

function CustomInterface() {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const client = useGenuxClient({
    webrtcURL: 'http://localhost:8000/api/offer',
    websocketURL: 'ws://localhost:8000/ws/per-connection-messages'
  });

  // CRITICAL: Manual audio playback for voice responses
  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);

  const {
    messages,
    sendText,
    startVoice,
    stopVoice,
    voiceState,
    isLoading,
    streamingContent
  } = client;

  return (
    <div>
      {/* Required for voice playback */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Your custom UI */}
      {messages.map(message => (
        <div key={message.id}>
          {message.c1Content ? (
            <C1Component c1Response={message.c1Content} />
          ) : (
            message.content
          )}
        </div>
      ))}
      
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendText(e.target.value);
            e.target.value = '';
          }
        }}
      />
      
      <button 
        onClick={voiceState === 'active' ? stopVoice : startVoice}
      >
        {voiceState === 'active' ? 'Stop' : 'Start'} Voice
      </button>
    </div>
  );
}
```

## 🎨 **Component Override System**

Replace any UI component with your own implementation:

```tsx
import { Genux } from '@your-org/genux-sdk';

// Custom components
const MyCustomChatMessage = ({ message, onC1Action }) => (
  <div className="my-custom-message">
    {message.content}
  </div>
);

const MyCustomBubbleWidget = ({ onToggle, showVoiceButton }) => (
  <div className="my-custom-bubble">
    <button onClick={onToggle}>💬</button>
    {showVoiceButton && <button>🎤</button>}
  </div>
);

// Use custom components
<Genux
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  options={{
    components: {
      ChatMessage: MyCustomChatMessage,
      BubbleWidget: MyCustomBubbleWidget,
      // Override any component...
    }
  }}
/>
```

## 📚 **API Reference**

### **Main Component Props**
```tsx
interface GenuxProps {
  webrtcURL: string;
  websocketURL: string;
  bubbleEnabled?: boolean;     // Show floating bubble widget
  disableVoice?: boolean;      // Remove all voice features
  allowFullScreen?: boolean;   // Enable fullscreen mode
  options?: GenuxOptions;
}

interface GenuxOptions {
  // Component overrides
  components?: {
    ChatMessage?: React.ComponentType<ChatMessageProps>;
    BubbleWidget?: React.ComponentType<BubbleWidgetProps>;
    ChatWindow?: React.ComponentType<ChatWindowProps>;
    // ... other components
  };
  
  // Theming
  theme?: ThemeTokens;         // GenUX component theme
  crayonTheme?: CrayonTheme;   // Rich content theme
  
  // Agent configuration
  agentName?: string;
  
  // Fullscreen customization (when bubbleEnabled=false)
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
}
```

### **Hook API**
```tsx
const client = useGenuxClient({
  webrtcURL: string;
  websocketURL: string;
});

// Returns:
{
  messages: Message[];
  sendText: (text: string) => void;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  voiceState: 'idle' | 'connecting' | 'active';
  isLoading: boolean;
  streamingContent: string;
  audioStream: MediaStream | null;  // For voice playback
}
```

## 🌐 **Multi-Framework Support**

The backend can generate framework-specific HTML for different UI libraries:

```tsx
<Genux
  webrtcURL="http://localhost:8000/api/offer"
  websocketURL="ws://localhost:8000/ws/per-connection-messages"
  options={{
    uiFramework: 'tailwind', // or 'chakra', 'mui', 'antd', 'inline'
    onFormSubmit: (formId, formData) => {
      console.log('Form submitted:', formId, formData);
    },
    onButtonClick: (actionType, context) => {
      console.log('Button clicked:', actionType, context);
    }
  }}
/>
```

**Supported Frameworks:**
- **Tailwind CSS** - Utility-first styling
- **Chakra UI** - Modular component library
- **Material UI (MUI)** - Google Material Design
- **Ant Design** - Enterprise-grade components
- **Inline Styles** - Framework-agnostic fallback

## 🔧 **Usage Patterns**

### **E-commerce Support Widget**
```tsx
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://shop.example.com/ws/support"
  bubbleEnabled={true}
  options={{
    agentName: "Shopping Assistant",
    theme: ecommerceTheme,
    crayonTheme: ecommerceCrayonTheme
  }}
/>
```

### **SaaS Customer Support**
```tsx
<Genux
  bubbleEnabled={false}      // Full page experience
  disableVoice={false}       // Voice enabled
  options={{
    agentName: "Support Team",
    theme: darkTheme,
    crayonTheme: crayonDarkTheme,
    fullscreenLayout: {
      showThreadList: true,
      showVoiceBot: true,
      showChatWindow: true,
      columnWidths: "300px 1fr 400px"
    }
  }}
/>
```

### **Voice-Only Experience**
```tsx
<Genux
  bubbleEnabled={false}
  options={{
    agentName: "Voice Assistant",
    fullscreenLayout: {
      showChatWindow: false,    // Hide chat, voice only
      columnWidths: "300px 1fr"
    }
  }}
/>
```

### **Chat-Only Experience**
```tsx
<Genux
  disableVoice={true}        // No voice features
  bubbleEnabled={false}
  options={{
    agentName: "Chat Support",
    fullscreenLayout: {
      showVoiceBot: false,     // Hide voice UI
      columnWidths: "300px 1fr"
    }
  }}
/>
```

## 🛠️ **Development**

### **Dependencies**
- **React 18+** - Core framework
- **TypeScript** - Type safety
- **@thesysai/genui-sdk** - C1 component rendering
- **@crayonai/react-ui** - Theme system

### **Optional Dependencies**
- **three** - 3D animations in fullscreen mode
- **@types/three** - TypeScript definitions

## 🚀 **Troubleshooting**

### **Common Issues**

1. **WebSocket connection failed**
   - Ensure backend server is running
   - Check WebSocket URL format: `ws://localhost:8000/ws/per-connection-messages`
   - Verify CORS settings on backend

2. **Voice not working**
   - Ensure HTTPS is used (required for microphone access)
   - Check microphone permissions in browser
   - Verify WebRTC offer endpoint returns valid response

3. **No audio playback in headless mode**
   - Add hidden audio element with `audioStream` from `useGenuxClient`
   - Ensure `autoPlay` attribute is set
   - Check browser autoplay policies

4. **C1 components not rendering**
   - Ensure `@thesysai/genui-sdk` is installed
   - Check that C1 content is valid JSON
   - Verify ThemeProvider is wrapping C1Component

5. **Themes not applying**
   - Ensure both `theme` and `crayonTheme` are provided
   - Check CSS import order
   - Verify theme objects match expected structure

### **Debug Tips**

- Open browser DevTools Network tab to monitor WebSocket messages
- Check console for SDK-related errors
- Use connection status indicators in UI
- Enable verbose logging in SDK options

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add comprehensive examples and tests
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Ready to build amazing conversational AI interfaces?** 

Start with the [example app](../example/) to see all features in action, or dive into the [backend](../backend/) to understand the full architecture.
