# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **GenUX SDK** - a comprehensive conversational AI framework that combines voice and text chat capabilities with rich interactive components. The project consists of a reusable SDK package and backend services that power generative user experiences.

**Vision**: Enable any developer to add enterprise-grade conversational AI to their application in under 5 minutes, while providing complete customization and white-labeling capabilities.

### Key Components

- **GenUX SDK** (`packages/genux-sdk/`) - React/TypeScript SDK for voice and chat interfaces
- **Backend Services** (`backend/`) - Python FastAPI backend with WebRTC and WebSocket support
- **Example App** (`example/`) - Demonstration Tauri application using the SDK

### Architecture Highlights

- **Dual Interface**: Supports both voice (WebRTC) and text (WebSocket) communication channels
- **C1 Components**: Rich, interactive UI components that render from AI responses
- **Theme System**: Dual theming approach combining Crayon UI and custom theme tokens
- **Real-time Streaming**: Live streaming of AI responses with real-time content updates
- **Thread Management**: Conversation persistence and thread organization
- **Component Override System**: Complete UI customization capability
- **Fullscreen Immersive Mode**: 3-column layout with 3D animations

## Development Commands

### SDK Development
```bash
# Navigate to SDK package
cd packages/genux-sdk

# Development with hot reload
pnpm dev

# Build the SDK
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint

# Run tests
pnpm test

# Check bundle size
pnpm size
```

### Backend Development
```bash
# Navigate to backend
cd backend

# Install dependencies (use Poetry if available)
pip install -e .

# Run development server
python main.py

# Run with specific configuration
uvicorn app.server:app --reload --host 0.0.0.0 --port 8000
```

### Example App Development
```bash
# Navigate to example
cd example

# Development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Tauri commands
pnpm tauri dev
pnpm tauri build
```

### Workspace Management
```bash
# Install all dependencies (from root)
pnpm install

# Run SDK in dev mode while working on example
pnpm --filter genux-sdk dev &
pnpm --filter example dev
```

## Component Architecture (2025-07-08)

### Current Clean Architecture

The SDK now follows a **unified modular architecture** with clear separation of concerns:

#### **Core Components** (`src/components/core/`)
Reusable building blocks that form the foundation of all user interfaces:

- **`AnimatedBlob.tsx`** - 3D WebGL animated sphere for voice visualization
- **`BubbleWidget.tsx`** - Floating circular widget with chat/voice/fullscreen buttons
- **`ChatMessage.tsx`** - Individual message rendering component
- **`MessageComposer.tsx`** - Message input with optional voice button
- **`ThreadList.tsx`** - Thread management and navigation interface
- **`VoiceBot.tsx`** - Voice interaction controls

#### **Composite Components** (`src/components/composite/`)
Complete interfaces built from core components:

- **`ChatWindow.tsx`** - Main chat interface with message rendering
- **`MinimizableChatWindow.tsx`** - Chat window with minimize/restore functionality
- **`ThreadedChatWindow.tsx`** - Chat with integrated thread management
- **`VoiceBotFullscreenLayout.tsx`** - Immersive 3-column voice experience
- **`FullscreenLayout.tsx`** - Generic fullscreen modal layout

#### **Main Entry Point**
- **`Genux.tsx`** - Primary SDK component that orchestrates all functionality

#### **Legacy Components Removed**
- ✅ **Removed duplicate `ChatWindow.tsx`** from root (kept composite version)
- ✅ **Commented out legacy components** (`ChatComposer.tsx`, `ChatMessage.tsx` in root)
- ✅ **Eliminated `VoiceBotClient.tsx`** (876 lines of redundant WebSocket logic)

### Component Hierarchy

```
Genux.tsx (Main orchestrator)
├── BubbleWidget (Floating interface)
│   ├── Chat button → MinimizableChatWindow
│   ├── Mic button → Voice connection
│   └── Fullscreen button → VoiceBotFullscreenLayout
│
├── MinimizableChatWindow (Windowed chat)
│   └── ChatWindow (Core chat interface)
│       ├── ChatMessage (Message rendering)
│       └── MessageComposer (Input interface)
│
└── VoiceBotFullscreenLayout (Immersive 3-column)
    ├── ThreadList (Left column - conversations)
    ├── AnimatedBlob (Center - 3D voice visualization)
    └── ChatWindow (Right column - chat interface)
```

### Data Flow Architecture

#### **Connection Management**
- **Single Source**: `useGenuxClient` hook manages WebSocket/WebRTC connections
- **ConnectionService**: Centralized service for all communication protocols
- **Message Types**: `chat`, `c1_token`, `chat_done`, `user_transcription`
- **Streaming**: Real-time message accumulation with ID tracking

#### **C1 Component Integration**
- **Primary Package**: `@thesysai/genui-sdk` for rich interactive content
- **ThemeProvider**: Required context for proper C1Component styling
- **Content Structure**: Messages support both `content` (text) and `c1Content` (C1Component XML)
- **Action Handling**: Built-in support for user interactions within C1Components

#### **Theme System**
- **GenUX Tokens**: Custom theme with `--genux-` prefix
- **Crayon Integration**: Uses `@crayonai/react-ui` ThemeProvider
- **CSS Variables**: Dynamic theme generation with `themeToCssVars()`

## Usage Patterns

### Basic Integration
```typescript
// Minimal setup - floating widget with voice
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  bubbleEnabled={true}
/>

// Chat-only interface (no voice features)
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  bubbleEnabled={false}
  disableVoice={true}
/>

// Full-page chat interface with voice
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  bubbleEnabled={false}
  allowFullScreen={true}
/>
```

### Component Customization
```typescript
// Override specific components and themes
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  options={{
    components: {
      ChatMessage: CustomChatMessage,
      ChatWindow: CustomChatWindow
    },
    theme: {
      colors: { primary: '#your-brand-color' }
    },
    crayonTheme: {
      colors: { primary: '#your-brand-color' }
    }
  }}
/>
```

### Headless Usage
```typescript
// Use the hook directly for custom interfaces
const client = useGenuxClient({
  webrtcURL: '/api/offer',
  websocketURL: 'wss://api.example.com/ws/messages'
});

// Access all state and functions
const {
  messages,
  sendText,
  startVoice,
  stopVoice,
  voiceState,
  isLoading,
  streamingContent,
  audioStream  // Important: Audio stream for voice responses
} = client;
```

**⚠️ CRITICAL: Audio Playback for Voice Features**

When using `useGenuxClient` directly (headless mode), you MUST manually handle audio playback:

```typescript
import { useRef, useEffect } from 'react';
import { useGenuxClient } from '@your-org/genux-sdk';

const MyCustomVoiceApp = () => {
  // Audio element ref - REQUIRED for voice playback
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const client = useGenuxClient({
    webrtcURL: '/api/offer',
    websocketURL: '/ws/messages'
  });

  // Connect audio stream to audio element - CRITICAL
  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);

  return (
    <>
      {/* Hidden audio element - MUST include for voice playback */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Your custom UI here */}
    </>
  );
};
```

The `Genux` component handles this automatically, but direct hook usage requires manual audio element management.

## Theme System

The GenUX SDK provides a comprehensive dual theme system that works seamlessly with rich content including tables, lists, markdown, code blocks, and all C1Components.

### Available Themes

```typescript
import { 
  lightTheme, 
  darkTheme, 
  defaultTheme,
  crayonLightTheme,
  crayonDarkTheme,
  crayonDefaultTheme 
} from '@your-org/genux-sdk';
```

### Theme Architecture

The SDK uses a **dual theme approach**:

1. **GenUX Theme** - Controls SDK component styling (chat bubbles, buttons, inputs)
2. **Crayon Theme** - Controls rich content styling (tables, markdown, code blocks)

### Quick Start with Themes

```typescript
// Import from the SDK
import { Genux, lightTheme, crayonLightTheme } from '@your-org/genux-sdk';

// Or import directly from theme file (for demos/development)
import { lightTheme, darkTheme, defaultTheme, crayonLightTheme, crayonDarkTheme, crayonDefaultTheme } from '@your-org/genux-sdk/theming/defaultTheme';

// Light theme for everything
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  options={{
    theme: lightTheme,           // GenUX components
    crayonTheme: crayonLightTheme // Rich content
  }}
/>

// Dark theme for everything  
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  options={{
    theme: darkTheme,
    crayonTheme: crayonDarkTheme
  }}
/>

// Default GenUX brand theme
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  options={{
    theme: defaultTheme,        // Uses GenUX brand colors (#667eea, #764ba2)
    crayonTheme: crayonDefaultTheme
  }}
/>
```

### Custom Theme Creation

```typescript
import { createTheme, toCrayonTheme } from '@your-org/genux-sdk';

// Create custom GenUX theme
const myTheme = createTheme({
  colors: {
    primary: '#your-brand-color',
    background: '#your-bg-color',
    // ... other overrides
  }
});

// Convert to Crayon-compatible theme
const myCrayonTheme = toCrayonTheme(myTheme);

<Genux
  options={{
    theme: myTheme,
    crayonTheme: myCrayonTheme
  }}
/>
```

### Comprehensive Theme Tokens Reference

```typescript
interface ThemeTokens {
  colors: {
    // Brand colors with states
    primary: string;              // Brand primary color
    primaryHover: string;         // Primary hover state
    primaryActive: string;        // Primary active state
    secondary: string;            // Secondary accent
    secondaryHover: string;       // Secondary hover state
    secondaryActive: string;      // Secondary active state
    
    // Background hierarchy
    background: string;           // Main background
    backgroundSecondary: string;  // Secondary background
    surface: string;              // Card/surface backgrounds
    surfaceHover: string;         // Surface hover state
    elevated: string;             // Elevated surfaces
    overlay: string;              // Modal overlays
    
    // Text hierarchy
    text: string;                 // Primary text
    textSecondary: string;        // Secondary text
    textTertiary: string;         // Tertiary text
    textInverse: string;          // Inverse text (white on dark)
    textDisabled: string;         // Disabled text
    
    // Interactive colors
    link: string;                 // Link text
    linkHover: string;            // Link hover state
    linkVisited: string;          // Visited links
    
    // Border colors
    border: string;               // Default borders
    borderHover: string;          // Border hover state
    borderFocus: string;          // Focused borders
    borderDisabled: string;       // Disabled borders
    
    // Semantic colors with variants
    error: string;                // Error text
    errorBackground: string;      // Error backgrounds
    errorBorder: string;          // Error borders
    success: string;              // Success text
    successBackground: string;    // Success backgrounds
    successBorder: string;        // Success borders
    warning: string;              // Warning text
    warningBackground: string;    // Warning backgrounds
    warningBorder: string;        // Warning borders
    info: string;                 // Info text
    infoBackground: string;       // Info backgrounds
    infoBorder: string;           // Info borders
    
    // Chat-specific colors
    chatUserBubble: string;       // User message background
    chatUserText: string;         // User message text
    chatAssistantBubble: string;  // Assistant message background
    chatAssistantText: string;    // Assistant message text
    chatTimestamp: string;        // Timestamp text
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
    // Font families
    fontFamily: string;
    fontFamilyMono: string;
    
    // Complete font size scale
    fontSize: {
      '3xs': string;  // 10px
      '2xs': string;  // 11px
      xs: string;     // 12px
      sm: string;     // 14px
      md: string;     // 16px
      lg: string;     // 18px
      xl: string;     // 20px
      '2xl': string;  // 24px
      '3xl': string;  // 30px
      '4xl': string;  // 36px
      '5xl': string;  // 48px
    };
    
    // Complete font weight scale
    fontWeight: {
      thin: number;      // 100
      light: number;     // 300
      regular: number;   // 400
      medium: number;    // 500
      semibold: number;  // 600
      bold: number;      // 700
      extrabold: number; // 800
      black: number;     // 900
    };
    
    // Line heights
    lineHeight: {
      tight: string;   // 1.25
      normal: string;  // 1.5
      relaxed: string; // 1.75
      loose: string;   // 2
    };
    
    // Letter spacing
    letterSpacing: {
      tight: string;   // -0.025em
      normal: string;  // 0
      wide: string;    // 0.025em
      wider: string;   // 0.05em
      widest: string;  // 0.1em
    };
    
    // Predefined text styles for consistency
    heading: {
      h1: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      h2: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      h3: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      h4: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      h5: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      h6: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
    };
    
    body: {
      large: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      medium: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      small: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
    };
    
    label: {
      large: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      medium: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
      small: { fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string; };
    };
    
    code: {
      fontSize: string;
      fontWeight: number;
      fontFamily: string;
      lineHeight: string;
      letterSpacing: string;
    };
  };
  
  shadows: {
    none: string;
    sm: string;      // Subtle shadow
    md: string;      // Default shadow
    lg: string;      // Prominent shadow
    xl: string;      // Large shadow
    '2xl': string;   // Extra large shadow
    inner: string;   // Inset shadow
  };
  
  effects: {
    backdropBlur: string;
    transition: string;
    transitionFast: string;
    transitionSlow: string;
  };
}
```

### Comprehensive Theme Coverage

The theme system now provides **complete, holistic coverage** for all UI elements:

#### **Typography Coverage**
- **Headings (H1-H6)**: Each level has specific fontSize, fontWeight, lineHeight, and letterSpacing
- **Body Text**: Large, medium, small variants for different content hierarchies
- **Labels**: Form labels and UI text in large, medium, small sizes
- **Code/Monospace**: Dedicated typography for code blocks with monospace font
- **Links**: Styled with hover and visited states

#### **Table Support**
Tables automatically inherit theme styles:
- **Headers**: Use heading or label typography styles
- **Body cells**: Use body text styles
- **Borders**: Use theme border colors
- **Hover states**: Use surfaceHover colors
- **Spacing**: Use theme spacing tokens

#### **List Support**
Lists are fully themed:
- **Typography**: Inherits body text styles
- **Spacing**: Uses theme spacing for list items
- **Nested lists**: Proper indentation with spacing tokens
- **Markers**: Styled with theme colors

#### **Complete Token Coverage**
- **47 Color Tokens**: Including hover, active, disabled states
- **10 Spacing Tokens**: From 0 to 64px
- **11 Border Radius Tokens**: From none to full circle
- **11 Font Sizes**: From 10px to 48px
- **9 Font Weights**: From thin (100) to black (900)
- **4 Line Heights**: From tight to loose
- **5 Letter Spacing Options**: From tight to widest
- **7 Shadow Options**: Including inner shadows
- **4 Transition Effects**: For smooth interactions

### Usage Examples

```typescript
// Corporate theme
const corporateTheme = createTheme({
  colors: {
    primary: '#1f4e79',      // Corporate blue
    secondary: '#6b7280',
    background: '#ffffff',
    surface: '#f8fafc',
  }
});

// Gaming theme
const gamingTheme = createTheme({
  colors: {
    primary: '#7c3aed',      // Purple
    secondary: '#ec4899',     // Pink
    background: '#0f0f0f',    // Dark
    surface: '#1a1a1a',
  }
});

// Healthcare theme  
const healthcareTheme = createTheme({
  colors: {
    primary: '#059669',       // Medical green
    secondary: '#0ea5e9',     // Trust blue
    background: '#ffffff',
    surface: '#f0fdf4',       // Light green tint
  }
});
```

### Why Dual Themes?

1. **Separation of Concerns**: GenUX controls its UI, Crayon controls rich content
2. **Consistency**: C1Components get proper styling regardless of GenUX theme
3. **Flexibility**: Customize each system independently or keep them synchronized
4. **Performance**: No theme conflicts or CSS specificity issues

## Backend Integration Requirements

### Required Endpoints
- **POST /api/offer** - WebRTC offer/answer exchange for voice
- **WebSocket /ws/messages** - Text chat and streaming responses

### Message Type Handlers
Backend must handle and respond to:
- `chat` - Text message from user
- `c1_token` - Streaming C1 component content (incremental)
- `chat_done` - End of stream marker
- `user_transcription` - Voice-to-text transcript
- `client_config` - UI framework preference from client
- `user_interaction` - Form/button interactions from framework-generated content

### Response Format
```json
// Standard C1 response
{
  "type": "text_chat_response",
  "content": "<content>{C1_XML}</content>",
  "id": "message-uuid",
  "isVoiceOverOnly": false
}

// HTML content response (for UI framework support)
{
  "type": "text_chat_response",
  "htmlContent": "<div>HTML content</div>",
  "contentType": "html",
  "id": "message-uuid"
}
```

### UI Framework Support Messages

**Client Configuration:**
```json
{
  "type": "client_config",
  "uiFramework": "tailwind" // or "chakra", "mui", "inline", etc.
}
```

**User Interactions:**
```json
{
  "type": "user_interaction",
  "interactionType": "form_submit", // or "button_click", "input_change"
  "context": {
    "formId": "user-registration",
    "formData": { "email": "user@example.com" },
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

## Package Management

This is a PNPM workspace with the following structure:
- **Root workspace** - Contains example app and workspace configuration
- **packages/genux-sdk** - SDK package for distribution
- **Backend** - Separate Python environment

### Key Dependencies
- **TheSys packages**: `@thesysai/genui-sdk: ^0.6.15` (C1 component rendering)
- **Crayon UI**: `@crayonai/react-ui: ^0.7.9` (base theme system)
- **Three.js**: `three: ^0.177.0` (3D animations in fullscreen mode)

## Voice Configuration

### Disable Voice Features (Chat-Only Mode)

The SDK supports complete removal of voice features for pure text-only experiences:

```typescript
// Pure chat-only - no voice UI or functionality
<Genux
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  disableVoice={true}
  options={{
    agentName: "Chat Assistant"
  }}
/>
```

**When `disableVoice={true}`:**
- ✅ **No voice buttons** - Mic button hidden from BubbleWidget and MessageComposer
- ✅ **No WebRTC initialization** - Better performance and no microphone permissions
- ✅ **No fullscreen mode** - Fullscreen button hidden (voice-focused feature)
- ✅ **No audio elements** - Audio playback components not rendered
- ✅ **Cleaner UX** - Pure text chat experience without voice distractions

**Use Cases:**
- Documentation and help centers
- Customer support chat widgets
- FAQ assistants
- Mobile experiences (avoids microphone permission prompts)
- Text-only workflows

### Voice-Enabled Features (Default)

When voice is enabled (default behavior):
- **BubbleWidget**: Shows mic button for voice input
- **MessageComposer**: Includes voice button in text input
- **Fullscreen Mode**: Available via `allowFullScreen={true}`
- **Audio Playback**: Hidden audio element for voice responses

## Performance Considerations

- **Bundle size target**: ≤ 100KB gzipped (monitored by `size-limit`)
- **Voice latency**: < 200ms from audio input to response (when enabled)
- **UI responsiveness**: 60fps animations and interactions
- **Memory management**: Proper audio stream disposal
- **Conditional loading**: Three.js only when fullscreen mode is used
- **Voice optimization**: No WebRTC initialization when `disableVoice={true}`

## Critical Development Notes

### Component Import Patterns
```typescript
// Correct - Use core components
import BubbleWidget from './core/BubbleWidget';
import { ChatMessage, MessageComposer, ThreadList } from './core';
import { ChatWindow, VoiceBotFullscreenLayout } from './composite';

// Wrong - Legacy paths (removed/commented)
import ChatWindow from './ChatWindow'; // ❌ Removed
import { FloatingWidget } from './core/FloatingWidget'; // ❌ Renamed to BubbleWidget
```

### Styling Integration
- Always import Crayon styles: `import '@crayonai/react-ui/styles/index.css'`
- Custom CSS must come after Crayon imports for proper override behavior
- Use CSS variables for theme consistency: `var(--genux-color-primary)` and `var(--crayon-brand-text)`

### WebSocket Connection Management
- ConnectionService uses connection IDs for debugging: `[WS:ws-{timestamp}-{random}]`
- Always check WebSocket state before sending: `webSocket.readyState === WebSocket.OPEN`
- Handle streaming state with message ID tracking for proper content accumulation

### Voice Implementation Details
- Requires HTTPS for getUserMedia() browser API
- WebRTC peer connection needs STUN servers configuration
- Data channels handle interim transcripts separate from audio streams

## Common Issues & Troubleshooting

### Import Errors
**Issue**: `Failed to resolve import "./core/FloatingWidget"` or `Failed to resolve import "./BubbleWidget"`
**Solution**: Use Core BubbleWidget. The root BubbleWidget was commented out and FloatingWidget was renamed.
```typescript
// Correct - Use Core version
import BubbleWidget from './core/BubbleWidget';
import { DefaultBubbleWidget } from './defaults';
```

### Multiple WebSocket Connections
**Issue**: Duplicate WebSocket connections causing messages to not sync between views
**Solution**: Ensure only one Genux component instance is active
```typescript
// Correct - Single instance
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  bubbleEnabled={true}
  allowFullScreen={true}
/>
```

### C1Component Styling Issues
**Issue**: C1Components appear unstyled in chat windows
**Solution**: Wrap C1Component with ThemeProvider
```typescript
// In ChatWindow.tsx
import { ThemeProvider } from '@crayonai/react-ui';

// When rendering C1Component
<ThemeProvider theme={{}}>
  <C1Component
    c1Response={message.c1Content}
    onAction={onC1Action}
    isStreaming={isStreamingActive}
  />
</ThemeProvider>
```

### Voice Permission Issues on Mobile
**Issue**: Mobile browsers prompt for microphone permissions even for chat-only use cases
**Solution**: Use `disableVoice={true}` for text-only experiences
```typescript
// Chat-only - no microphone permission prompts
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  disableVoice={true}
  options={{
    agentName: "Support Chat"
  }}
/>
```

### No Audio Playback When Using useGenuxClient Directly
**Issue**: Voice responses are received but no audio is heard when using `useGenuxClient` hook directly
**Root Cause**: The hook provides the audio stream but doesn't automatically create an audio element for playback
**Solution**: Manually add an audio element and connect the stream
```typescript
const MyVoiceApp = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const client = useGenuxClient({ webrtcURL: '/api/offer', websocketURL: '/ws/messages' });

  // Connect audio stream to audio element
  useEffect(() => {
    if (audioRef.current && client.audioStream) {
      audioRef.current.srcObject = client.audioStream;
    }
  }, [client.audioStream]);

  return (
    <>
      {/* Hidden audio element - REQUIRED for voice playback */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      {/* Your UI components */}
    </>
  );
};
```
**Note**: The `Genux` component handles this automatically. This is only needed for headless/custom implementations.

## Recent Updates (2025-07-09)

### Comprehensive Theme System Implementation

Added a complete dual theme system with light, dark, and default themes that work seamlessly with rich content:

#### **New Theme Exports**
- **lightTheme** - Clean, modern light theme for daytime use
- **darkTheme** - Optimized for low-light environments with proper contrast
- **defaultTheme** - Balanced theme using GenUX brand colors (#667eea, #764ba2)
- **crayonLightTheme** - Crayon-compatible light theme for rich content
- **crayonDarkTheme** - Crayon-compatible dark theme for rich content
- **crayonDefaultTheme** - Crayon-compatible default theme for rich content

#### **Key Features Added**
1. **Extended Color Palette**: Added `warning` and `info` colors to ThemeTokens
2. **Enhanced Typography**: Added `xxl` font size and `light`/`semibold` font weights
3. **Crayon Integration**: Seamless theme conversion with `toCrayonTheme()` utility
4. **Rich Content Support**: Full styling for tables, lists, markdown, code blocks, forms, and charts
5. **Brand Consistency**: All themes incorporate GenUX's signature gradient colors

#### **Implementation Details**
- **Dual Theme Architecture**: Separate themes for GenUX components and rich content
- **Type Safety**: Full TypeScript support for all theme properties
- **Backward Compatibility**: All existing themes continue to work
- **Performance Optimized**: No theme conflicts or CSS specificity issues

#### **New Demo Added**
- **Theme Showcase Demo** - Interactive demonstration of all three themes with real-time switching and rich content examples

#### **Files Modified**
- **theming/defaultTheme.ts**: Complete rewrite with new theme system
- **types/index.ts**: Extended ThemeTokens interface with new color and typography tokens
- **components/Genux.tsx**: Added crayonTheme prop support
- **components/composite/ChatWindow.tsx**: Enhanced with crayonTheme prop
- **components/composite/VoiceBotFullscreenLayout.tsx**: Added crayonTheme support
- **components/composite/MinimizableChatWindow.tsx**: Automatic theme prop forwarding
- **index.ts**: Exported all new theme utilities

### Audio Playback Fix for useGenuxClient

Fixed critical audio playback issue when using `useGenuxClient` hook directly:

#### **Root Cause**
The `useGenuxClient` hook provides the audio stream via `client.audioStream` but doesn't automatically handle audio playback. The `Genux` component includes a hidden audio element that connects to the stream, but direct hook usage bypassed this.

#### **Solution Applied**
Added comprehensive documentation and examples showing how to manually add audio playback:

```typescript
const audioRef = useRef<HTMLAudioElement>(null);
const client = useGenuxClient({ /* options */ });

// Connect audio stream to audio element
useEffect(() => {
  if (audioRef.current && client.audioStream) {
    audioRef.current.srcObject = client.audioStream;
  }
}, [client.audioStream]);

// Hidden audio element - REQUIRED for voice playback
<audio ref={audioRef} autoPlay style={{ display: 'none' }} />
```

#### **Files Updated**
- **CLAUDE.md**: Added troubleshooting section and headless usage warnings
- **example/src/demos/StandaloneVoiceBotDemo.tsx**: Fixed audio playback implementation

### Voice Input Enhancement

Enabled simultaneous voice and text input in fullscreen mode:

#### **Issue Fixed**
Previously, text input was disabled when voice was active, preventing multimodal interaction.

#### **Solution**
Removed `isVoiceActive` checks from MessageComposer component:
- Users can now type while voice is connected
- Send messages during voice sessions
- True multimodal experience in fullscreen mode

#### **Files Modified**
- **components/core/MessageComposer.tsx**: Removed voice state input blocking

## Previous Refactoring (2025-07-08)

### Major Cleanup Completed

The GenUX SDK underwent comprehensive refactoring to eliminate component conflicts and establish a unified architecture:

#### **Component Consolidation**
- **Removed Legacy Duplicates**: Eliminated duplicate `ChatWindow.tsx`, `ChatMessage.tsx`, `ChatComposer.tsx` from root
- **Moved Components**: `VoiceBotFullscreenLayout.tsx` → `composite/`, `AnimatedBlob.tsx` → `core/`
- **Fixed Import Conflicts**: Resolved `FloatingWidget` → `BubbleWidget` naming conflicts
- **Cleaned Exports**: Removed invalid exports from `index.ts` and `defaults/index.ts`

#### **Architecture Benefits**
1. **Single Source of Truth**: One implementation per component type
2. **Clear Separation**: Core (building blocks) vs Composite (complete interfaces)
3. **Better Developer Experience**: Consistent import paths and TypeScript support
4. **Reduced Bundle Size**: Eliminated 600+ lines of duplicate code
5. **Enhanced Maintainability**: Changes only need to be made in one location

#### **Files Affected**
- **Removed/Commented**: Legacy components in root directory
- **Moved**: `VoiceBotFullscreenLayout.tsx` to `composite/`
- **Moved**: `AnimatedBlob.tsx` to `core/`
- **Updated**: All import paths in `Genux.tsx` and other dependent components
- **Fixed**: Export statements in `index.ts` and `defaults/index.ts`

The refactoring maintains 100% functional compatibility while providing a much cleaner and more maintainable codebase.

### DisableVoice Feature Addition (2025-07-08)

Added comprehensive chat-only mode support through the `disableVoice` prop:

#### **Implementation Details**
- **GenuxProps**: Added `disableVoice?: boolean` prop
- **ConnectionService**: Made `webrtcURL` optional and added early return in `connectVoice()`
- **BubbleWidget**: Added `showVoiceButton` prop to conditionally render mic button
- **Component Chain**: Voice state properly propagated through Genux → ChatWindow → MessageComposer

#### **Features Added**
1. **Complete Voice Removal**: No voice UI elements when `disableVoice={true}`
2. **Performance Optimization**: No WebRTC initialization for chat-only mode
3. **Mobile Optimization**: No microphone permission requests
4. **Backward Compatibility**: Defaults to `false` (voice enabled)

#### **Files Modified**
- **types/index.ts**: Added `disableVoice` to GenuxProps
- **core/ConnectionService.ts**: Made webrtcURL optional, added voice check
- **core/BubbleWidget.tsx**: Added showVoiceButton prop and conditional rendering
- **components/Genux.tsx**: Added disableVoice logic and prop propagation
- **demos/ChatOnlyDemo.tsx**: Updated to use disableVoice={true}

This feature enables true chat-only experiences without any voice-related UI or functionality.

## UI Framework Support (2025-01-20)

### Overview

The GenUX SDK now supports backend-generated HTML content optimized for different CSS frameworks (Tailwind, Chakra UI, Material UI, etc.) with automatic interaction handling. This enables rich, interactive UI generation without complex frontend adapters.

### Key Features

1. **Framework Preference API** - Specify target UI framework via `uiFramework` option
2. **Global Interaction Handlers** - Automatic form/button event collection and handling
3. **Backend HTML Generation** - Generate framework-optimized HTML on the server
4. **Secure Content Rendering** - DOMPurify sanitization with framework class preservation

### Usage

```typescript
<Genux
  webrtcURL="/api/offer"
  websocketURL="/ws/messages"
  options={{
    uiFramework: 'tailwind', // or 'chakra', 'mui', 'antd', 'inline'
    onFormSubmit: (formId, formData) => {
      console.log('Form submitted:', formId, formData);
    },
    onButtonClick: (actionType, context) => {
      console.log('Button clicked:', actionType, context);
    },
    onInputChange: (fieldName, value) => {
      console.log('Input changed:', fieldName, value);
    }
  }}
/>
```

### Backend Integration

The backend can now generate framework-specific HTML and handle interactions:

```python
# Generate inline-styled HTML (default)
if message == "form":
    return {
        "type": "text_chat_response",
        "htmlContent": """
        <form onsubmit="window.genuxSDK.handleFormSubmit(event, 'my-form')">
          <input name="email" type="email" required />
          <button type="submit">Submit</button>
        </form>
        """,
        "contentType": "html"
    }
```

### Global SDK Object

The SDK exposes a global `window.genuxSDK` object with these methods:
- `handleFormSubmit(event, formId)` - Handle form submissions
- `handleButtonClick(event, actionType, context)` - Handle button clicks
- `handleInputChange(event, fieldName)` - Handle input changes
- `sendInteraction(type, context)` - Send custom interactions

### Testing

Use the debug route in the backend:
- Type **"form"** - Get an interactive registration form
- Type **"list"** - Get a clickable action list
- Type **"html"** - Get a styled HTML demo

### Demo

Run the **UI Framework Support** demo in the example app to see all features in action with real-time interaction logging.

## Latest Updates (2025-07-08)

### Simplified bubbleEnabled API

The SDK now provides a more intuitive API for fullscreen experiences:

#### **New Behavior**
- **`bubbleEnabled={true}`** → Floating widget with optional fullscreen modal
- **`bubbleEnabled={false}`** → **Immersive fullscreen voice experience by default**
- **`bubbleEnabled={false}, disableVoice={true}`** → Fullscreen chat fallback

#### **Removed voiceFirstMode**
The `voiceFirstMode` prop was removed as redundant since `bubbleEnabled={false}` now provides the same functionality with a cleaner API.

```typescript
// Before: Required voiceFirstMode for fullscreen voice experience
<Genux voiceFirstMode={true} />

// After: Simply use bubbleEnabled=false
<Genux bubbleEnabled={false} />
```

### Custom Component Overrides for Fullscreen Mode

Added comprehensive support for customizing all three components in fullscreen layout:

#### **API Structure**
```typescript
interface GenuxOptions {
  // Custom component overrides for fullscreen mode
  fullscreenComponents?: {
    ThreadList?: React.ComponentType<ThreadListProps>;
    VoiceBotUI?: React.ComponentType<VoiceBotUIProps>;
    ChatWindow?: React.ComponentType<ChatWindowProps>;
  };
  
  // Layout configuration for fullscreen mode
  fullscreenLayout?: {
    showThreadList?: boolean;
    showVoiceBot?: boolean;
    showChatWindow?: boolean;
    columnWidths?: string;
  };
}
```

#### **Usage Examples**

**Voice-Only Experience**
```typescript
<Genux
  bubbleEnabled={false}
  options={{
    fullscreenLayout: {
      showChatWindow: false,
      columnWidths: "300px 1fr"
    }
  }}
/>
```

**Chat-Only Experience**
```typescript
<Genux
  bubbleEnabled={false}
  disableVoice={true}
  options={{
    fullscreenLayout: {
      showVoiceBot: false,
      columnWidths: "300px 1fr"
    }
  }}
/>
```

**Custom Component Overrides**
```typescript
const MyCustomVoiceBot = (props: VoiceBotUIProps) => (
  <div className="my-branded-voice-ui">
    <MyLogo />
    <VoiceBotUI {...props} />
  </div>
);

<Genux
  bubbleEnabled={false}
  options={{
    fullscreenComponents: {
      VoiceBotUI: MyCustomVoiceBot
    },
    fullscreenLayout: {
      columnWidths: "280px 1fr 400px"
    }
  }}
/>
```

**Complete Custom Layout**
```typescript
<Genux
  bubbleEnabled={false}
  options={{
    fullscreenComponents: {
      ThreadList: MyCustomThreadList,
      VoiceBotUI: MyCustomVoiceBot,
      ChatWindow: MyCustomChatWindow
    },
    fullscreenLayout: {
      showThreadList: true,
      showVoiceBot: true,
      showChatWindow: true,
      columnWidths: "250px 500px 1fr"
    }
  }}
/>
```

#### **TypeScript Support**
All component props are fully typed:
```typescript
import type { 
  ThreadListProps, 
  VoiceBotUIProps, 
  ChatWindowProps 
} from '@your-org/genux-sdk';

const MyCustomChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onC1Action,
  agentName
}) => {
  // Handle both content types properly
  const renderMessage = (message: Message) => {
    if (message.role === 'assistant' && message.c1Content) {
      return (
        <ThemeProvider theme={{}}>
          <C1Component
            c1Response={message.c1Content}
            onAction={onC1Action}
            isStreaming={false}
          />
        </ThemeProvider>
      );
    }
    return message.content || 'No content available';
  };
  
  // Custom chat implementation
};
```

#### **Common Use Cases**
1. **Brand Customization**: Replace components with branded versions
2. **Voice-Only Apps**: Hide chat window entirely
3. **Chat-Only Apps**: Hide voice components
4. **Custom Layouts**: Adjust column widths and visibility
5. **Specialized UIs**: Create domain-specific interfaces

#### **Files Modified**
- **types/index.ts**: Added `fullscreenComponents` and `fullscreenLayout` to GenuxOptions
- **VoiceBotFullscreenLayout.tsx**: Added component override and layout configuration support
- **Genux.tsx**: Updated to pass fullscreen options to VoiceBotFullscreenLayout
- **Examples**: Added CustomFullscreenDemo showcasing all features

This provides maximum flexibility while maintaining a clean, intuitive API for fullscreen customization.