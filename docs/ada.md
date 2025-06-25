
This is my system overview how data flows if you need. 

\# Ada Generative Interaction Agent – System Design Documentation

\_Last updated: 2025-06-21\_

\---

\## 1. System Overview & Architecture

Ada is a multimodal conversational agent that provides \*\*high-bandwidth interaction\*\* between users and their computer.  

It delivers:

\* \*\*Fast, low-latency speech-to-speech\*\* conversation (the \_Fast Path\_).  

\* \*\*Rich, adaptive visual/aural responses\*\* (the \_Slow Path\_) that can include tables, charts, carousels, accordions, or plain text depending on information type.

\### 1.1 High-Level Component Map

\`\`\`

 ┌────────────┐    audio       ┌───────────┐

 │   Client   │ ─────────────▶ │  Pipecat  │

 │ (Tauri/JS) │ &lt;───────────── │  WebRTC   │

 └────────────┘     audio      └───────────┘

        │ WS text/UI                        ▲

        ▼                                   │

 ┌─────────────────┐ REST/WS  ┌──────────┐  │

 │    FastAPI      │─────────▶│ Deepgram │  │

 │  API Gateway    │          └──────────┘  │

 │ (/api/\* + WS)   │ REST     ┌──────────┐  │

 └─────────────────┘─────────▶│  OpenAI  │  │

        ▲ REST                └──────────┘  │

        │                     ┌──────────┐  │

        │ REST                │ Cartesia │  │

        │                     └──────────┘  │

        │                                     Fast Path

        │                     ┌──────────┐

        └────────────────────▶│  MCP LLm │

                              └──────────┘

                                      │

                               REST/WS▼

                              ┌────────────┐

                              │  Thesys UI │

                              └────────────┘

                                       ▲

                       Slow Path        │

                                       WS

                              ┌─────────────────┐

                              │  MessageStore   │

                              └─────────────────┘

\`\`\`

\---

\## 2. Fast Path – Speech-to-Speech Pipeline

| Stage | Technology | Purpose | Latency Target |

|-------|------------|---------|----------------|

| Audio Capture | WebRTC (browser ↔ Pipecat) | Send raw Opus/PCM frames to backend | ≤ 25 ms frame |

| Automatic Speech Recognition (ASR) | Deepgram streaming | Convert speech to partial transcripts | &lt; 300 ms end-to-word |

| Conversation LLM | OpenAI GPT-4o | Generate preliminary textual reply; may contain tool calls | \~ 300 ms |

| Text-to-Speech (TTS) | Cartesia | Synthesize natural voice | \~ 150 ms |

| Audio Return | WebRTC | Deliver voiced reply while still streaming | real-time |

Characteristics & optimizations:

\* \*\*Duplex streaming\*\*: user keeps speaking while reply is produced.  

\* \*\*Transcript Coalescing\*\*: partial transcripts are combined using a \*\*3000 ms silence timeout\*\* to identify natural pauses.  

\* \*\*Duplicate Detection\*\*: voice responses are hashed; identical replies on slow path are discarded.  

\* \*\*End-to-end latency\*\*: \*\*\~200 ms\*\* median from user stop talking → audio starts.

\---

\## 3. Slow Path – UI Enhancement Pipeline

The Slow Path receives the raw LLM text and decides whether to produce richer output.

1\. \*\*Input\*\*: LLM text + optional tool-call JSON.

2\. \*\*MCP Client Agent\*\* (runs in backend):

   1\. \_ShouldEnhance?\_ Evaluate heuristics & user preferences.

   2\. \_Enhancement Generation\_: uses Thesys to build React‐friendly \*\*C1Components\*\* (tables, images, etc.).

   3\. \_Voice-Over Decision\_: generate TTS via Cartesia if UI element benefits from narration.

3\. \*\*Delivery\*\*:

   \* Enhanced UI diff is streamed to frontend over \*\*Message WS\*\*.

   \* Optional voice-over audio streamed over \*\*WebRTC\*\* (same channel as fast path).

Decision matrix (simplified):

| Scenario | Tool Call? | Enhancement Needed? | Voice-Over? |

|----------|------------|---------------------|-------------|

| Simple greeting (“Hello”) | No | No | No |

| “What’s the time?” | No | Plain text already fine | No |

| “List HP characters” | No | Yes → List → C1 table | No |

| Complex data query | Yes | Yes → Show tool results | Yes (explain data) |

\---

\## 4. REST API Endpoints

| Endpoint | Method | Purpose | Used By |

|----------|--------|---------|---------|

| `/api/voice/start` | POST | Reserve session, return WebRTC offer + auth | Client |

| `/api/voice/stop` | POST | Close voice session & flush buffers | Client |

| `/api/chat` | POST | Send user text or tool-call payload, get LLM reply stream | Client (fallback text) |

| `/api/tools/{tool}/invoke` | POST | Execute MCP tool (DB query, HTTP fetch …) | MCP Agent |

| `/api/transcript/coalesce` | POST | Submit partial ASR for merging | Pipecat |

| `/api/history` | GET | Fetch past messages for context window | Client |

| `/api/health` | GET | Liveness probe | K8s |

Rationale: minimal surface area—voice lifecycle, chat, tools, history, health. All others handled via WebSockets for low latency.

\---

\## 5. WebSocket Connections

| WS Channel | Direction | Data Types | Why separate? |

|------------|-----------|-----------|---------------|

| `voice-ws` | Duplex | Raw/encoded audio frames, TTS frames | Needs low-latency 20 ms pacing; isolated from text traffic |

| `message-ws` | Server→Client | JSON message chunks (LLM text, C1Component diffs) | Allows ordered rendering & retry without blocking audio |

| `control-ws` (optional) | Server→Client | Connection state, re-queue hints | Keeps UI responsive during reconnects |

WebSockets feature \*\*robust error handling & re-queuing\*\*—on disconnect, unsent messages are cached and replayed once the channel is back.

\---

\## 6. Enhancement & Voice-Over Decision Logic

Pseudo-code:

\`\`\`

if output.containsToolCall():

    enhance = true

    voiceOver = true

else if output.length &lt; SIMPLE_TEXT_THRESHOLD:

    enhance = false

    voiceOver = false

else if needsVisual(output):

    enhance = true

    voiceOver = false

else if mcpLLM.expandsOriginal():

    enhance = maybe

    voiceOver = outputWasVoiced ? maybe : true

\`\`\`

Heuristics:

\* `needsVisual` uses keyword spotting (“list”, “table”, “chart”) plus answer length.

\* User accessibility settings override (force voice-over, larger fonts, etc.).

\---

\## 7. Component Integration Details

| Component | Tech | Integration Notes |

|-----------|------|-------------------|

| \*\*Pipecat\*\* | Rust audio DSP | Embedded in Tauri; streams Opus frames to backend; reconnection logic with exponential back-off. |

| \*\*Deepgram\*\* | Cloud ASR | Server maintains persistent streaming socket; transcripts published to MessageStore for coalescing. |

| \*\*OpenAI GPT-4o\*\* | Cloud LLM | Called via `/api/chat`; temperature & top-p adaptive to latency. |

| \*\*Cartesia\*\* | Custom TTS | REST synth endpoint; streams response bytes to `voice-ws`. |

| \*\*Thesys\*\* | UI Generator | Takes LLM text/tool-call JSON → returns React component tree serialized as C1Components. |

| \*\*MessageStore\*\* | In-memory w/ Redis fallback | Central pub/sub for voice, text, UI; guarantees ordering across fast/slow paths. |

\---

\## 8. Message Flow Patterns & Optimizations

1\. \*\*Dual-Path Delivery\*\*  

   \* Fast path audio first → user hears response almost immediately.  

   \* Slow path UI follows, usually &lt; 300 ms later.

2\. \*\*Latency Reduction\*\*  

   \* Removed redundant front-end hydration, cut UI latency from \*\*1.8–3.5 s → \~200 ms\*\*.  

   \* Smart duplicate detection prevents double rendering of identical fast/slow messages.

3\. \*\*Streaming Strategy\*\*  

   \* Audio frames: 20 ms packets; back-pressure aware.  

   \* Text/UI frames: 512 byte JSON chunks; progressive rendering.

4\. \*\*Resilience\*\*  

   \* WebSocket reconnect with resume token; any un-ACKed message re-queued.  

   \* Message IDs monotonic per session; enables at-least-once delivery semantics.

5\. \*\*State Management\*\*  

   \* `MessageStore` (Redux-like) holds canonical chat; `ChatMessageRenderer` subscribes and paints consistent UI.

\---

\### Appendix A – Glossary

\* \*\*ASR\*\* – Automatic Speech Recognition  

\* \*\*TTS\*\* – Text-to-Speech  

\* \*\*C1Component\*\* – Rich UI element (table, chart, etc.) rendered by Ada client  

\* \*\*MCP\*\* – “Multi-Channel Processor” agent responsible for enhancements  

\---

\_End of file\_
