<!-- productContext.md -->

# Product Context

## Why It Exists  
Developers still lose 30‑40 % of their day to glue work not tackled by code‑completion tools.  Meeting notes live in Fireflies, tasks in ClickUp, and fixes in GitHub—but no system binds them into a **continuous memory & automation loop**.

## Problems Solved  
| Pain | Impact | Solution vector |
|------|--------|-----------------|
| Context scattered across tools | 15‑20 min search tax per task | Semantic memory & unified search (Supabase pgvector) :contentReference[oaicite:6]{index=6} |
| Debugging flakey tests | Hours per sprint | Dedicated Debugger agent, reproducible envs |
| Tedious PR reviews | Slows merge train | Auto‑commenting PR‑Reviewer agent |
| Secrets management agony | Security risk | Native keyring via Tauri store :contentReference[oaicite:7]{index=7} |

## How It Works (Happy Path)  
1. User presses **“Generate Tests”** → Cursor plugin sends task + session ID to Task‑Manager.  
2. Planner LLM decomposes into steps; locks affected files (Git LFS). :contentReference[oaicite:8]{index=8}  
3. Tester agent writes tests, updates episodic memory.  
4. PR‑Reviewer comments; developer reviews & merges.  
5. Semantic facts (e.g., “project uses Jest”) are cached for future prompts.  

## User‑Experience Goals  
* **< 60 s** from click to first streamed token.  
* Inline diff viewer with “Accept / Reject” buttons.  
* Cost meter + latency badge per agent call.  
* Vault export / import for secrets.

