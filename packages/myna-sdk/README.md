# Myna SDK – Drop-in Voice & Chat Assistant for the Web

**Myna** turns Ada’s dual-path interaction engine into a _100 kB_ (gz) JavaScript/TypeScript SDK that any SaaS product can embed as a floating widget, an onboarding coach, or a fully bespoke voice interface.

---

## ① Installation

```bash
# npm
npm i myna-sdk

# pnpm
pnpm add myna-sdk

# yarn
yarn add myna-sdk
```

Myna ships **ESM**, **CJS** and **`.d.ts`** bundles – pick whichever your bundler prefers.  
Peer deps: `react >= 16.8`, `react-dom`.

---

## ② Quick Start – 3 lines

```tsx
import { Myna } from 'myna-sdk';

export default function App() {
  return (
    <Myna
      webrtcURL="/api/offer"
      websocketURL="wss://api.my-backend.com/ws/messages"
    />
  );
}
```

The default export renders a **floating chat button** (bottom-right).  
Clicking the button expands a fully-featured chat+voice window.  
Nothing to configure server-side apart from exposing the 2 endpoints above.

---

## ③ `<Myna/>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `webrtcURL` | `string` | – | HTTP POST endpoint for SDP offer/answer (voice path). |
| `websocketURL` | `string` | – | WS endpoint for chat / streaming messages. |
| `bubbleEnabled` | `boolean` | `true` | If `false` the full chat window renders inline (no floating bubble). |
| `showThreadManager` | `boolean` | `false` | Toggle conversation list sidebar. |
| `options` | `MynaOptions` | `{}` | See below. |

### `MynaOptions`

```ts
type MynaOptions = {
  visualization?: {
    provider: 'default' | 'custom' | 'none';
    render?: (
      msg: AssistantMessage,
      ctx: VisualizationContext
    ) => React.ReactNode;
  };
  designSystem?: 'default' | 'shadcn';
  theme?: Partial<ThemeTokens>;
  mcpEndpoints?: { name: string; url: string; apiKey?: string }[];
  components?: Partial<ComponentOverrides>;
  agentName?: string; // header label
  logoUrl?: string;   // header avatar
};
```

Use `components` to inject your own `ChatButton`, `ChatWindow`, etc.  
Use `theme` or `designSystem="shadcn"` for visual consistency.

---

## ④ Headless API – `useMynaClient`

```ts
import { useMynaClient } from 'myna-sdk';

const {
  sendText,            // (msg: string) => void
  startVoice,          // () => void
  stopVoice,           // () => void
  messages,            // Message[]
  connectionState,     // 'connected' | ...
  voiceState,          // 'connected' | ...
  isLoading, isVoiceLoading, isEnhancing,
  streamingContent, streamingMessageId, isStreamingActive,
  audioStream,         // MediaStream | null
} = useMynaClient({
  webrtcURL: '/api/offer',
  websocketURL: 'wss://…/ws/messages',
  autoConnect: true,
});
```

Build any UI you like – tables, 3-D canvases, toasts – while the hook handles reconnection logic, streaming assembly, voice device negotiation, etc.

---

## ⑤ Connection Service Events

`ConnectionService` under the hood emits:

| Event | Payload |
|-------|---------|
| `state_changed` | `'connected' \| 'connecting' \| …` |
| `voice_state_changed` | same as above _or_ `'user-stopped' / 'bot-started'` |
| `message_received` | `Message` |
| `streaming_started` / `streaming_chunk` / `streaming_done` | `{ id, content }` |
| `transcription` | `{ text, final }` |
| `enhancement_started` | void |
| `audio_stream` | `MediaStream` |

Subscribe via `connectionService.on(Event, cb)`.

---

## ⑥ Theming & Design Systems

```tsx
import {
  Myna,
  createTheme,
  darkTheme,
  themeToCssVars,
} from 'myna-sdk';

const brandTheme = createTheme({
  colors: { primary: '#6366f1' }, // indigo
  borderRadius: { lg: '1rem' },
});

<Myna
  webrtcURL="…"
  websocketURL="…"
  options={{ theme: brandTheme }}
/>;
```

`themeToCssVars()` lets you dump tokens into global/style-tag variables for CSS overrides.

---

## ⑦ Examples

### 1 · Floating Widget

```tsx
<Myna
  webrtcURL="/api/offer"
  websocketURL={makeWsURL()}
  options={{ agentName: 'Support Bot', logoUrl: '/logo.svg' }}
/>
```

### 2 · Inline Chat (no bubble)

```tsx
<Myna
  webrtcURL="/api/offer"
  websocketURL={makeWsURL()}
  bubbleEnabled={false}
/>
```

### 3 · Custom UI (Headless)

See **`packages/myna-sdk/examples/headless-custom.tsx`** for a 100-line complete replica using Tailwind.

---

## ⑧ Build / Bundle Size

`tsup` builds **esm** + **cjs** bundles with `size-limit` CI guard:  
**≤ 100 kB gzipped** for default export (verified every PR).

---

## ⑨ Troubleshooting & FAQ

| Problem | Fix |
|---------|-----|
| “Mic permission denied” | Ask user to allow mic; fallback to text only. |
| Widget doesn’t appear | Check that React is bundled once, verify peer dep versions. |
| No voice playback | Ensure `/api/offer` reachable over HTTPS/WSS, firewall allows UDP. |
| CORS errors | Add `Access-Control-Allow-Origin: *` (or your domain) on backend. |

---

## ⑩ Roadmap (public)

- **Offline ASR/TTS** (was out-of-scope MVP).  
- **Mobile wrappers** (React Native, Capacitor).  
- **Analytics hooks** (`onMessage`, `onOpen`, `onClose`).  
- **Vue / Svelte bindings** via thin wrappers.

[LICENSE](./LICENSE) • MIT    |   © 2025 Myna Team
