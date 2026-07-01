# CURRENT STATE — Persistent Operational Runtime Memory

- Branch: `claude/vigilant-ramanujan-rFqGn`
- Starting commit: `9284ac2`

## Files changed

### New: `src/lib/operational-memory/`
- `runtime-memory-types.ts` — all operational memory type definitions
- `runtime-memory-scoping.ts` — multi-dimensional scope isolation (pure functions)
- `runtime-memory-lineage.ts` — operational causality chain construction (pure functions)
- `runtime-memory-signals.ts` — operational signal extraction from text (pure functions)
- `runtime-memory-ingestion.ts` — multi-source ingestion orchestration
- `runtime-memory-persistence.ts` — durable Supabase persistence layer
- `runtime-memory-retrieval.ts` — pressure-weighted operational continuity retrieval
- `runtime-memory-continuity.ts` — timeline reconstruction and continuity gap detection
- `runtime-memory-manager.ts` — public API surface
- `runtime-memory-diagnostics.ts` — retrieval and lineage diagnostics
- `index.ts` — public exports

### New: `supabase/migrations/`
- `20260522000000_operational_runtime_memory.sql` — `operational_memory_records` + `operational_intervention_records` tables with RLS

### New: `tests/`
- `operational-runtime-memory-contract.test.mjs` — 55 contract tests (all passing)

### New: `scripts/`
- `check-operational-memory-runtime.mjs` — 36-point validation script

### New: `docs/architecture/`
- `operational-runtime-memory.md` — full architecture documentation
- `CURRENT_STATE_OPERATIONAL_MEMORY.md` — this file

### Modified: `package.json`
- Added `"check:operational-memory"` script

## Validations executed

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pre-existing errors only (JSX in ui-core, node:crypto in vault/conversation-ingestion.ts — same pattern) |
| `npm run build` | Pre-existing: `next` binary not available in environment |
| `npm run lint:aoc-boundaries` | PASS |
| `npm test` | PASS — 682 tests (includes 55 new operational memory tests) |
| `npm run check:operational-memory` | PASS — 36/36 checks |

Pre-existing failures (not introduced by this PR):
- ESLint: package not installed in environment
- Next.js build: binary not available in environment
- TypeScript: `node:crypto` error across multiple vault files (same pattern in vault/conversation-ingestion.ts, existed before)
- TypeScript: JSX errors in src/ui-core/ and src/components/ (pre-existing)

## Operational cognition decisions

### Does NOT duplicate existing vault system
The vault digestive system extracts individual semantic nutrients with decay. The operational memory system builds ABOVE it:
- Vault nutrients → decay over time (freshness decreases)
- Operational memory records → unresolved weight INCREASES over time (3%/day)
- Vault nutrients are referenced via `nutrient_ids` array (evidence substrate)

### Causality lineage is self-referencing
`parent_record_id` FK on `operational_memory_records` is self-referencing, enabling arbitrary-depth causality chains. Cycle prevention uses a `visited` set.

### Unresolved pressure accumulation
Formula: `computedWeight = min(1.0, unresolvedWeight + ageDays × 0.03)`
For resolved/abandoned records: `computedWeight = unresolvedWeight × 0.1`
This means a 21-day-old unresolved blocker with base weight 0.7 reaches weight 1.0 (capped).

### Tenant isolation strategy
Consistent with `operational_memory_entries` domain: `company_id text not null` with `current_company_id() = company_id` RLS. Workspace-level scoping uses `workspace_id uuid` FK for sub-company filtering.

### Retrieval is deterministic
No AI inference in retrieval. Scoring is explicit: type base + resolution status modifier + recency + pressure bonus + continuity weight + delivery impact + scope match + intervention pressure.

### Intervention lineage tracking
`operational_intervention_records` table tracks all resolution attempts per memory record. Failed interventions contribute to `intervention_pressure` score (records that have been tried and failed are scored higher, reflecting real-world escalation pressure).

## Unresolved risks

1. **No automatic pressure weight recalculation** — `unresolved_weight` in the DB is static at ingestion time. The `computePressureWeight()` function calculates pressure dynamically at retrieval time using `ageDays`. If the system needs sorted-by-pressure DB queries, a background job would need to periodically update `operational_pressure_weight`.

2. **No cross-system record linkage** — `nutrient_ids` array links memory records to vault nutrients, but this is one-directional. There's no way to query "what memory records reference this nutrient" from the vault side.

3. **Intervention records require manual creation** — The ingestion layer creates memory records but does not automatically create intervention records. Intervention records must be created via `persistOperationalInterventionRecord()` explicitly.

4. **No deduplication across sessions** — The ingestion layer does not check for existing records with the same summary/scope before creating new ones. High-frequency signal sources could create duplicates.

## Future ingestion expansion

- `connector_signal` ingestion source is defined and reserved
- Jira ticket blocker signals → ingest as `blocker` records
- Slack message digests → ingest as `chat_conversation` records
- GitHub PR review signals → ingest as `dependency` or `blocker` records

## Future connector integration notes

The `OperationalIngestionSource` type includes `connector_signal` as a reserved value. When connectors are added:
1. Map connector events to `OperationalSignal` types via `extractOperationalSignals()` or a connector-specific extractor
2. Call `ingestOperationalMemory()` with `source: "connector_signal"`
3. Include `parentMemoryRecordId` if the connector signal continues an existing lineage

## Retrieval limitations

1. Maximum 48 records per retrieval call (configurable up to `MAX_LIMIT = 48`)
2. Stale resolved records (> 90 days) are suppressed from retrieval
3. Session-based retrieval (copilot session memory) is handled separately by `operational-continuity/retrieval-engine.ts` — the two systems are not yet unified
4. No semantic similarity — retrieval is purely deterministic rule-based ranking

## Next recommended prompt

**Prompt 2.2 — Nutrient Ingestion & Operational Signal Extraction Engine**

Build the bridge between:
- The vault digestive system (individual signal extraction)
- The operational memory system (continuity lineage)

Specifically:
- When vault digestion runs, automatically create linked `operational_memory_records` for high-significance nutrients
- Populate `nutrient_ids` array bidirectionally
- Detect when a new nutrient represents a recurrence of an existing memory record → update `interventionCount` and `lastObservedAt`
- Route escalation signals directly to `operational_memory_records` with `resolutionStatus: "escalated"`
- Wire the upload pipeline to automatically ingest operational memory records after document vault digestion
