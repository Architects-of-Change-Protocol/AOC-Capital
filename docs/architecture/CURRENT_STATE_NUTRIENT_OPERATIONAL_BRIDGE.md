# Current State: Nutrient Ingestion & Operational Memory Bridge

## Branch

`claude/optimistic-clarke-YghMt`

## Starting Commit

`3f62662` — Add persistent operational runtime memory system (#230)

## Files Changed

### New source files

```
src/lib/operational-memory/nutrient-bridge/
├── nutrient-bridge-types.ts         — All bridge type contracts
├── nutrient-signal-classifier.ts    — 14-type deterministic classifier
├── nutrient-pressure-calculator.ts  — Pressure contribution scoring
├── nutrient-recurrence-detector.ts  — Rule-based recurrence detection
├── nutrient-to-memory-mapper.ts     — Nutrient → OperationalMemoryRecord mapper
├── nutrient-memory-linker.ts        — Link construction + Supabase persistence
├── nutrient-bridge-diagnostics.ts   — Diagnostic explanation builders
├── nutrient-bridge-manager.ts       — Public API orchestrator
└── index.ts                         — Public re-exports
```

### New migration

```
supabase/migrations/20260522100000_operational_memory_nutrient_links.sql
```

### New test

```
tests/nutrient-operational-bridge-contract.test.mjs
```

### New script

```
scripts/check-nutrient-operational-bridge.mjs
```

### New docs

```
docs/architecture/nutrient-ingestion-operational-bridge.md
docs/architecture/CURRENT_STATE_NUTRIENT_OPERATIONAL_BRIDGE.md  (this file)
```

### Modified files

```
package.json  — Added "check:nutrient-bridge" script
```

---

## Validations Executed

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm test` | Passed (bridge contract tests + all existing tests) |
| `npm run check:operational-memory` | Passed |
| `npm run check:nutrient-bridge` | Passed |

---

## Architectural Decisions

### 1. Scope impedance resolution

The vault uses `workspaceId` for tenant isolation while operational memory uses
`companyId`. The bridge requires `companyId` to be passed explicitly — it is not
derivable from `workspaceId` alone. All bridge inputs mandate both fields. Link
table stores both for cross-system queries.

### 2. New records for recurrence, not in-place mutation

When a nutrient is a recurrence of an existing record, a new operational memory
record is created with `parentRecordId` pointing to the existing record. The
existing record also gets the new nutrientId appended. This preserves the full
history without overwriting prior state.

### 3. Rule-based recurrence, not embeddings

All recurrence detection uses deterministic word overlap + nutrient type
compatibility rules. No embedding lookups. This keeps the system fast,
predictable, and auditable. The nutrient's own `recurrenceHint` field from the
vault digestive system is used as a primary signal.

### 4. Link table separate from operational_memory_records.nutrient_ids

The existing `nutrient_ids: string[]` in `operational_memory_records` provides
a quick lookup. The new `operational_memory_nutrient_links` table provides
richer metadata (link type, confidence, recurrence outcome, signal category)
and a unique constraint to prevent duplicate links.

### 5. Recovery signals actively close unresolved records

A `recovery_signal` nutrient that textually matches an existing unresolved
record triggers a `resolved_followup` outcome. The new record gets
`resolutionStatus: "resolved"` and `lineageType: "resolved_by"` pointing to the
original blocker/risk. This preserves the full resolution chain.

### 6. Policy-driven suppression (not hard-coded exclusions)

Low-confidence and informational nutrients are suppressed via configurable policy
(`NutrientBridgePolicy`) rather than hard-coded filters. Callers can override any
threshold. The default policy is conservative: minimum significance 0.35, minimum
confidence 0.45.

---

## Known Limitations

1. **No DB-backed existing records/links**: The bridge accepts `existingRecords`
   and `existingLinks` as optional inputs for recurrence detection. Callers must
   load these from the DB if they want full recurrence detection — the bridge
   itself does not query the DB for existing records. A future enhancement would
   auto-load these within the bridge.

2. **Text similarity is surface-level**: Word overlap on the first 120 characters
   may miss semantic similarity. This is intentional (embeddings-free by design)
   but means some recurrences may be classified as `new_record` if the summaries
   differ significantly in phrasing. The `recurrenceHint` field from the vault
   compensates for cases where the vault itself detected recurrence.

3. **No vault nutrient FK**: The `operational_memory_nutrient_links.nutrient_id`
   column references `vault_nutrients.id` but does not have a database-level FK
   because `vault_nutrients` uses workspace-level RLS and `operational_memory_*`
   uses company-level RLS. Referential integrity is enforced at the application
   layer.

4. **Integration not yet wired**: The bridge provides the integration surface
   (`bridgeNutrientsToOperationalMemory`, `bridgeSingleNutrientToOperationalMemory`)
   but is not yet called automatically from upload routes or copilot routes.
   The integration points are documented in the architecture doc. Manual wiring
   is the next step.

5. **No batch DB loading optimization**: For large digestion runs with many nutrients,
   each nutrient's recurrence detection compares against the in-memory
   `existingRecords` slice. For high-volume runs, callers should pre-load relevant
   records once and pass them to the bridge.

---

## Next Recommended Prompt

**Prompt 2.3 — Operational Continuity Retrieval Engine**

Build the retrieval engine that surfaces the most relevant operational memory
records for a given conversation context, incorporating:
- Pressure-weighted scoring
- Recency + unresolved penalty
- Lineage traversal (surface parent/child chains)
- Copilot context injection (pre-populate conversation with active blockers,
  escalations, and timeline pressure signals)
- Bridge integration (prioritize records that originated from vault nutrients)
- Workspace/project scope filtering
- Explainable retrieval scoring with diagnostic output
