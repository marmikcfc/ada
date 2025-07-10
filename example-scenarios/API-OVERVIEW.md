# Genux SDK — Integration & API Overview  
_A quick-scan reference that maps what you can do with Genux to the example projects inside `example-scenarios/`._

---

## 1. 30-second cheat-sheet

| Scenario | Import | JSX one-liner | What you get |
|----------|--------|---------------|--------------|
| **Drop-in widget** | `GenuxChatWidget` | `<GenuxChatWidget webrtcURL="/api/webrtc" websocketURL="/api/ws" />` | Floating bubble → chat window with voice & text |
| **Brandable widget** | `GenuxChatWidget` + `components`/`theme` overrides | See *widget-overrides* | Same UX, your colors & custom sub-components |
| **Headless / composable** | `useGenuxCore` | No pre-built UI | Build every element yourself |
| **Chat primitives** | `MessageList`, `Composer`, `ThreadSidebar` … | Compose primitives | LEGO-style assembly of a chat app |
| **Custom templates** | `CustomTemplateRenderer` + `registerTemplate` | `[TEMPLATE:<id>]` messages | Render arbitrary HTML+CSS with JSON |
| **Multi-modal** | `VideoOutput`, `VoiceInput`, etc. | Include/exclude per prop | Avatar video, voice-only, text-only … your mix |

---

## 2. Core Hook: `useGenuxCore()`

```ts
const {
  /* State */
  messages, threads, streamingContent,
  isLoading, voiceState, avatarState,

  /* Actions */
  sendText, startVoice, stopVoice,
  selectThread, createThread, deleteThread,

  /* Template API */
  registerTemplate, getTemplateData,

  /* Low-level */
  clearMessages, onError
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
  enableVoice: true,
  enableVideo: false,
  enableThreads: false,
  disableC1Rendering: false,
  templates: [{ id, html, css }]
});
```

**Think of it as the “brain”**—all other integration layers call this or wrap it.

---

## 3. UI Layers in order of opinionation

1. **`GenuxChatWidget`** – 2-line install (example *widget-basic*)  
2. **`components`/`theme` overrides** – skin the widget (*widget-overrides*)  
3. **Primitives** – bricks to build any layout (*chat-primitives-basic*)  
4. **Headless** – only the core hook, zero UI (*headless-composable*)

> **Rule of thumb**  
> - _Need speed?_ Start at layer 1.  
> - _Need brand?_ Layer 2.  
> - _Need designer freedom?_ Layer 3.  
> - _Need absolute control?_ Layer 4.

---

## 4. Template Rendering Workflow

```mermaid
sequenceDiagram
User→Genux: "[TEMPLATE:recipe] tiramisu"
Genux→Backend: request
Backend→Genux: JSON payload ↩︎
Genux→TemplateRenderer: bind(data, html, css)
TemplateRenderer→DOM: Rendered card
```

Key API:

```ts
registerTemplate('recipe', recipeHTML, recipeCSS);
...
<CustomTemplateRenderer templateId="recipe" data={recipeJSON}/>
```

See *5-custom-templates/recipe-template* & *markdown-template*.

---

## 5. Multi-modal Building Blocks

| Module | Example folder | Purpose |
|--------|----------------|---------|
| `VoiceInput` / `VoiceOutput` | _voice-only_ | Mic capture / TTS playback |
| `VideoOutput`               | _video-avatar_ | 3-D avatar with lip-sync |
| `ScreenInput` (coming)      | *screen-interaction* | Element highlighting, screen rec |
| `UIOutput` (C1Component)    | everywhere   | Interactive generative UI |

Enable via `useGenuxCore` flags:

```tsx
<GenuxCore enableVoice enableVideo={false} enableText />
```

---

## 6. Decision Matrix

| Need / Constraint | Recommended pattern | Folder |
|-------------------|---------------------|--------|
| “Just give me a chat bubble” | Widget basic | `1-widget-basic` |
| “Match my design system”     | Widget overrides | `2-widget-overrides` |
| “Pixel-perfect custom UI”    | Chat primitives | `4-chat-primitives-basic` |
| “I have my own renderer”     | Custom templates | `5-custom-templates/*` |
| “Avatar should talk”         | Multi-modal video | `6-multi-modal/video-avatar` |
| “Voice only kiosk”           | Multi-modal voice | `6-multi-modal/voice-only` |

---

## 7. Extending beyond chat

Current examples stop at chat. Upcoming modules (road-map):

| Module | ETA | Use case |
|--------|-----|----------|
| `ScreenInput` / `SpatialOutput` | Q4-2025 | Wix-style “move this button left” |
| `VideoInput`                    | Q4-2025 | Gesture & webcam understanding |
| `AROverlayOutput`               | 2026 | AR on-screen highlights |

Architecture is **plugin-ready**; new input/output pairs drop into `GenuxCore`.

---

## 8. Quick troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Table renders unstyled | Missing `@crayonai/react-ui/styles/index.css` | Import once, ensure not tree-shaken |
| Voice icon spins forever | WebRTC signalling blocked | Check `webrtcURL` & CORS |
| Avatar static | `enableVideo` off or wrong `avatarUrl` | Set `enableVideo` & validate URL |
| Custom template blank | JSON keys mismatch placeholders | Match template keys exactly |

---

### Happy building!  
For questions join us on Discord `#genux-sdk` or open an issue.
