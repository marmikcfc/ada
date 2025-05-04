<!-- projectbrief.md -->

# Project Brief

## North‑Star Goal  
Deliver a local‑first AI developer assistant that **saves ≥2 hours/day** by automating test writing, debugging, PR review and documentation tasks.

## Core Requirements  
1. **Fully local shell** – Tauri desktop app ships as a single Rust binary (≤15 MB). :contentReference[oaicite:0]{index=0}  
2. **Remote inference, zero retention** – Calls OpenAI endpoints under the ZDR programme; all payloads deleted in ≤30 days. :contentReference[oaicite:1]{index=1}  
3. **Tri‑partitioned memory** – Semantic, episodic, procedural memories stored in Supabase Postgres + pgvector. :contentReference[oaicite:2]{index=2}  
4. **Task orchestration** – LangChain Plan‑and‑Execute planner schedules agents; queue persisted in SQLite. :contentReference[oaicite:3]{index=3}  
5. **Privacy & secrets** – Tokens kept in OS keyring via `tauri‑plugin‑store`. :contentReference[oaicite:4]{index=4}  
6. **Conflict‑safe writes** – Git LFS locking prevents concurrent agent clashes. :contentReference[oaicite:5]{index=5}  

## Success Metrics  
| Metric | Target @ 12 weeks |
|--------|------------------|
| Daily active users | ≥50 |
| Avg. time saved/dev/day | ≥120 min |
| Open PRs auto‑generated | ≥60 % accepted w/out edits |
| Crash‑free sessions | ≥99 % |

## Scope (MVP)  
* One repo, one Slack workspace integration  
* Agents: Tester + PR‑Reviewer (others stubbed)  
* Mac (arm64/x64) binaries only  

Out‑of‑scope: self‑hosted model weights, Windows builds, multi‑tenant billing.

