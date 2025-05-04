## Critical Implementation Paths
Agent spawn – Tokio async runtime launches sandboxed Rust process (no blocking UI). 
tokio.rs

Memory fetch – Gateway embeds top‑k semantic + episodic memories into the OpenAI prompt (k‑NN via pgvector). 
Microsoft Learn

Secret retrieval – UI calls Tauri store, decrypts token, signs HTTP request. 


# Tech Context

## 1 Stack Overview  
| Layer | Tech | Notes |
|-------|------|-------|
| Desktop shell | **Tauri v2** | Rust back‑end, React‑TS front‑end. :contentReference[oaicite:17]{index=17} |
| Async runtime | **Tokio 1.37** | Non‑blocking task execution. :contentReference[oaicite:18]{index=18} |
| Secrets | **tauri‑plugin‑store** | Cross‑platform OS keyring. :contentReference[oaicite:19]{index=19} |
| Backend DB | **Supabase Postgres + pgvector** | Vector search & RLS. :contentReference[oaicite:20]{index=20} |
| LLM API | **OpenAI GPT‑4o (ZDR)** | Remote inference, no data training. :contentReference[oaicite:21]{index=21} |
| Planner | **LangChain Plan‑and‑Execute** | JSON DAG output. :contentReference[oaicite:22]{index=22} |
| PII Redaction | **Phileas** CLI | Optional local pre‑filter. :contentReference[oaicite:23]{index=23} |
| SCM | **Git + Git LFS** | File‑locking. :contentReference[oaicite:24]{index=24} |

## 2 Development Setup  
1. `rustup +nightly`, `cargo install tauri-cli`  
2. `pnpm install` in `src-tauri/ui` for React front‑end  
3. `supabase login && supabase db push` for schema bootstrap  
4. `.env` template includes `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`  

## 3 Technical Constraints  
* **Offline mode** – inference requires internet; cache prompts but disable agents gracefully.  
* **Disk budget** – limit vector index to ≤2 GB per repo (~2 M embeddings). :contentReference[oaicite:25]{index=25}  
* **API quotas** – soft‑fail when OpenAI rate‑limit hits 90 % of cap.  

## 4 Dependencies  
```toml
# Cargo.toml (excerpt)
tokio = { version = "1.37", features = ["full"] }
tauri = "2"
tauri-plugin-store = "2"
reqwest = { version = "0.12", features = ["json", "gzip"] }
```

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.41.0",
    "langchain": "^0.2.11"
  }
}
```
## Tool Usage Patterns
Supabase – vector upsert on every successful agent run; nightly vacuum & re‑index job.

OpenAI – stream completions; set user param to session ID for audit.

Cloudflare Worker (optional) – reverse‑proxy OpenAI, enable Regional Tiered Cache. 


---

### How to proceed
1. Copy each code block into its own `.md` file in the repo.  
2. Review the “Technical Constraints” section and adjust quotas for your actual beta cohort.  
3. Next step could be a **`docker‑compose.yml`** and a bare‑bones Tauri scaffold—let me know if you’d like that drafted.
::contentReference[oaicite:27]{index=27}