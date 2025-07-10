# Genux SDK – Example Integration Scenarios
_A living catalogue of how developers can embed Generative-UX into their products._

---

## 0. Folder Guide
Each sub-folder under `example-scenarios/` is a **fully runnable** mini-app (Vite or Next).  
Clone the repo, `pnpm install`, then:

```bash
cd example-scenarios/widget-basic
pnpm dev
```

All scenarios share the same backend stub (`../../backend`) so you can focus purely on the UI surface.

---

## 1. Widget-Only (2-line install)
**Folder:** `widget-basic/`

| Who is this for? | “Drop-in chat bubble, zero config.” |
|------------------|------------------------------------|
| Typical sites    | Marketing pages, help-centres      |

### Key points
* Single `<GenuxChatWidget/>` import
* Auto-handles voice & text
* Bubble → ChatWindow flow identical to legacy Genux

---

## 2. Widget + Overrides (brandable)
**Folder:** `widget-overrides/`

| Who is this for? | “I like the widget but need my branding.” |
|------------------|-------------------------------------------|
| SaaS dashboards  | Product tours, in-app help                |

Features demonstrated:
* Custom `ChatButton`
* Tailwind theme tokens override
* Replace default `MessageBubble`

---

## 3. Headless / Fully Composable
**Folder:** `headless-composable/`

| Who is this for? | “I want complete control of the DOM.” |
|------------------|---------------------------------------|
| Design-heavy apps | Agencies, e-commerce landing pages   |

What you’ll see:
```tsx
const { messages, sendMessage } = useGenuxCore({...});
<MessageList messages={messages}/>
<MyCustomComposer onSend={sendMessage}/>
```
*No widget, no built-in composer – you supply everything.*

---

## 4. Chat Primitives Starter
**Folder:** `chat-primitives-basic/`

Showcases the **primitive components** shipped by Genux:

| Primitive | File | Purpose |
|-----------|------|---------|
| `<MessageList/>` | `ui/MessageList.tsx` | Renders generic message array |
| `<Composer/>` | `ui/Composer.tsx` | Text box + mic button |
| `<ThreadSidebar/>` | `ui/ThreadSidebar.tsx` | Thread list & CRUD |

Compose them any way you like.

---

## 5. Custom Template Rendering (No C1Component)
### 5a. Recipe Card
**Folder:** `template-custom-recipe/`

* Sends **JSON** payload  
  ```json
  { "image": "...", "header": "Tiramisu", "steps": [...] }
  ```
* Applies developer-defined `RecipeCard.html + .css`
* Ideal for content-heavy verticals (news, food, travel)

### 5b. Markdown Doc
**Folder:** `template-custom-md/`

* Accepts markdown string
* Renders with your own renderer
* Shows how to bypass C1Component completely

---

## 6. Multi-Modality Switches
### 6a. Voice-Only
`multi-modal/voice-only/` – disables composer, auto-starts STT

### 6b. Video Avatar Chat  
`multi-modal/video-avatar/` – adds `<VideoOutput avatarUrl="..."/>`

Developers toggle modalities via simple props:

```tsx
<GenuxCore
  enableVoice
  enableVideo
  enableText={false}
/>
```

---

## 7. Screen Interaction Prototype
**Folder:** `screen-interaction/` (experimental)

Demonstrates:
* `<ScreenInput highlightOnHover />`
* LLM receives bounding-box JSON
* Returns UI manipulation suggestions

---

## How to Contribute a New Scenario
1. Copy `template-basic/`
2. Add `README.md` describing the goal
3. Keep dependencies minimal
4. Submit PR – CI will spin up & snapshot visual regressions

---

## Roadmap Alignment
| Milestone | Scenarios | Release |
|-----------|-----------|---------|
| **Chat v2** | 1-4 | Q3-2025 |
| **Screen / Spatial** | 5-7 | Q4-2025 |
| **AR/VR** | TBD | 2026 |

---

*Questions?* Open an issue or ping us on Discord (#genux-sdk).  
Happy building!
