<!-- systemPatterns.md -->

# System Patterns

## 1 System Architecture  

```mermaid
flowchart LR
  UI[Cursor Plug‑In / React UI] -->|WS+JSON| Gateway
  Gateway --> Planner[(Plan‑and‑Execute LLM)]
  subgraph Core
    Planner --> Queue[Task Queue (SQLite)]
    Queue --> AgentsTester[Tester Agent]
    Queue --> AgentsPR[PR Reviewer]
    AgentsTester --> Git[Git Repo + LFS Lock] 
    AgentsPR --> Git
    AgentsTester --- Mem[(Supabase pgvector)]
    AgentsPR --- Mem
  end


| Decision                             | Rationale                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| **Tauri over Electron**              | Smaller binary, Rust safety, no Node runtime. ([GitHub][1], [A Java geek][2]) |
| **Remote OpenAI vs. local LLM**      | Faster to ship; ZDR covers privacy for MVP. ([OpenAI Platform][3])            |
| **Supabase cloud**                   | Managed Postgres, pgvector, RLS out‑of‑box. ([Supabase][4], [Supabase][5])    |
| **Git LFS locks**                    | File‑level concurrency control without bespoke DB. ([GitHub][6])              |
| **Cloudflare Regional Tiered Cache** | Optional latency cut for APAC users. ([Cloudflare Blog][7])                   |

[1]: https://github.com/tauri-apps/tauri?utm_source=chatgpt.com "tauri-apps/tauri: Build smaller, faster, and more secure ... - GitHub"
[2]: https://blog.frankel.ch/opinion-tauri/?utm_source=chatgpt.com "My opinion on the Tauri framework - A Java geek"
[3]: https://platform.openai.com/docs/guides/your-data?utm_source=chatgpt.com "Data controls in the OpenAI platform"
[4]: https://supabase.com/docs/guides/ai/rag-with-permissions?utm_source=chatgpt.com "RAG with Permissions | Supabase Docs"
[5]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[6]: https://github.com/git-lfs/git-lfs/blob/main/docs/proposals/locking.md?utm_source=chatgpt.com "git-lfs/docs/proposals/locking.md at main - GitHub"
[7]: https://blog.cloudflare.com/introducing-regional-tiered-cache/?utm_source=chatgpt.com "Reduce latency and increase cache hits with Regional Tiered Cache"


## Design Patterns
CQRS – read-heavy semantic search path vs. write‑heavy episodic appends.

Saga / Compensating action – if an agent fails mid‑write, rollback via git reset --hard HEAD.

Command Bus – each agent exposes start/checkProgress/cancel methods for uniform orchestration.

