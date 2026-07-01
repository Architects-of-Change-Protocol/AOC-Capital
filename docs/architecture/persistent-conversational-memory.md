# PMFreak Persistent Conversational Project Memory System

## Objective
Turn PMFreak from a chat-only assistant into a project-aware operating layer that continuously accumulates execution memory.

## Architecture proposal

### 1) Memory domains
- **Project memory**: objective, phase, milestones, blockers, risks, commitments, dependencies, unresolved issues.
- **Stakeholder memory**: role, influence, ownership, sentiment/pressure patterns, political relevance, decision authority.
- **Decision memory**: what was decided, by whom, when, impacted systems, unresolved consequences.

### 2) Pipeline
1. **Ingestion**: chat messages + uploaded docs/events.
2. **Extraction**: LLM prompt pack converts raw text to typed memory deltas.
3. **Merge**: deterministic conflict resolver upserts into project-scoped snapshot.
4. **Summarize**: produce compact ambient context payload for fast UI rendering.
5. **Retrieve**: inject scoped memory into assistant prompts and right-panel surfaces.

### 3) Retrieval strategy
- **Primary**: exact `project_id` snapshot.
- **Secondary**: most recent decisions and blockers from same company for cross-project signal.
- **Fallback**: empty-state coaching strings to preserve conversational UX.

### 4) UI integration points
- Copilot right panel (`/copilot`) pulls `/api/copilot/memory` and shows:
  - active blockers
  - recent decisions
  - stakeholder pressure
  - critical risks
  - AI-detected concerns
- Keep chat primary; panel is ambient and passive.

### 5) File + conversation fusion
- On upload completion, run extraction on parsed document text.
- Emit `memory_delta` events with source metadata (`conversation`, `meeting-notes`, `contract`, `email`, etc).
- Merge deltas into `project_memory_snapshots` and refresh ambient panel data.

## Memory models (initial)
Defined in `src/lib/memory/organization-memory.ts`:
- `MemoryProjectState`
- `StakeholderMemory`
- `DecisionMemory`
- `ProjectMemorySnapshot`

## Suggested storage schema (production)
- `memory_events`
  - id, company_id, project_id, source_type, source_ref, extracted_delta (jsonb), confidence, created_at
- `project_memory_snapshots`
  - project_id (pk), company_id, project_name, project_state (jsonb), stakeholders (jsonb), decisions (jsonb), detected_concerns (jsonb), updated_at
- `stakeholder_edges`
  - project_id, from_stakeholder, to_stakeholder, relation_type, weight, evidence_event_id

## Code-level implementation plan
1. Add extractor service `src/lib/memory/extractors/*.ts` for chat/docs.
2. Add merge engine `src/lib/memory/merge.ts` with deterministic dedupe + recency precedence.
3. Add event writer + snapshot projector.
4. Inject memory context into `/api/copilot` system/user prompt blocks.
5. Add confidence thresholds and human-review flags for low-confidence political inferences.
6. Add observability: extraction latency, merge conflicts, snapshot freshness, retrieval hit rate.

## Roadmap
- **Phase 1 (now)**: typed memory models, ambient endpoint, copilot panel integration.
- **Phase 2**: extraction + merge pipeline wired to chat + upload.
- **Phase 3**: stakeholder graph, timeline/dependency correlation, proactive escalation alerts.
- **Phase 4**: org-scale governance (retention, PII controls, audit/event replay).

## Scalability recommendations
- Use append-only event log + async projector workers.
- Keep prompt context bounded via recency windows + token budgets.
- Cache snapshots per project with short TTL (15-60s) for low-latency UI.
- Partition events by `company_id` and `project_id` for multitenant isolation.
- Add backfill/reprojection jobs to recover from extractor/prompt version updates.
