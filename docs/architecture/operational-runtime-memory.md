# Operational Runtime Memory

## Philosophy

A normal AI chat remembers messages. PMFreak must remember operational reality.

The operational runtime memory system persists:
- blockers and their causal ancestry
- escalations and their intervention history
- commitments and their resolution status
- delivery pressure that accumulates over time
- stakeholder continuity and disengagement patterns
- decision lineage and what they affected
- unresolved tension that outlasts sessions

This is not generic chat history. It is operationally-scoped continuity memory.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         Operational Memory Manager               │
│   (public API: ingest, retrieve, reconstruct)    │
└────────────────────┬────────────────────────────┘
                     │
    ┌────────────────┼───────────────────┐
    │                │                   │
    ▼                ▼                   ▼
Ingestion        Retrieval          Continuity
Layer            Engine             Engine
    │                │                   │
    ▼                ▼                   ▼
Signal           Pressure           Timeline
Extraction       Weighting         Reconstruction
    │                │                   │
    └────────────────┴───────────────────┘
                     │
                     ▼
             Persistence Layer
             (Supabase tables)
                     │
                     ▼
        operational_memory_records
        operational_intervention_records
                     │
                     ▼
             Vault Nutrients
             (evidence substrate)
```

## Layers

### Operational Memory Types (`runtime-memory-types.ts`)

Defines all domain types. Key concepts:

**OperationalMemoryRecord** — the core unit of operational cognition. Unlike vault nutrients which decay, a record's `unresolvedWeight` can increase over time.

**OperationalMemoryScope** — multi-dimensional isolation:
- `companyId` — tenant boundary (never crossed)
- `workspaceId` — workspace boundary
- `projectId` — project boundary
- `conversationId`, `interventionId`, `stakeholderId`, `eventId` — sub-dimensions

**OperationalMemoryWeights** — five scoring dimensions:
- `continuityWeight` — how important to operational continuity
- `operationalPressureWeight` — current pressure level
- `escalationWeight` — escalation severity
- `unresolvedWeight` — increases if item stays unresolved (3%/day)
- `deliveryImpactWeight` — impact on delivery

**OperationalCausalityChain** — a traversal from a root operational event through all descendants, showing where pressure originated and where it propagated.

### Scope Isolation (`runtime-memory-scoping.ts`)

Pure functions for scope validation and isolation. Never crosses company boundaries.

`assertScopeIsolation()` throws if a record from company A is accessed by company B. Called in the retrieval engine before returning any item.

### Causality Lineage (`runtime-memory-lineage.ts`)

The system preserves operational causality — the causal chain from an originating signal through all its descendants.

`buildCausalityChain(root, allRecords)` — traverses from a root record through all children, cycle-safe, up to configurable depth.

`reconstructLineageAncestry(record, allRecords)` — traces a record back to its root, returning ancestors in order.

Example lineage:
```
Procurement delay (root)
  └─ caused_by ─→ Delivery blocker
      └─ escalates_to ─→ Executive escalation
          └─ resolved_by ─→ Emergency approval (failed)
                            └─ triggers ─→ Timeline compression (unresolved)
```

### Signal Extraction (`runtime-memory-signals.ts`)

Pattern-based extraction of operational signals from text. Six signal types:

- **risk** — delivery, financial, governance, stakeholder, technical, timeline
- **pressure** — unresolved blockers, pending escalations, silent stakeholders, procurement delays, approval gaps, timeline compression, hidden dependencies
- **stakeholder** — active, disengaged, silent, escalated, unavailable
- **dependency** — internal, external, vendor, upstream, downstream
- **escalation** — team, management, executive, external
- **timeline** — deadline approaching, milestone at risk, schedule drift, date conflict, delivery delay

All extraction is deterministic rule-based pattern matching. No AI inference in signal extraction.

### Ingestion Layer (`runtime-memory-ingestion.ts`)

Accepts operational content from multiple sources:
- `chat_conversation` — copilot conversations
- `operational_summary` — structured summaries
- `uploaded_document` — file uploads
- `ai_intervention` — AI-generated interventions
- `manual_note` — human-entered notes
- `escalation_event` — formal escalation events
- `governance_event` — approval/delegation events
- `connector_signal` — future external connectors

Validates scope → extracts signals → builds records → persists durably.

### Persistence Layer (`runtime-memory-persistence.ts`)

Writes to `operational_memory_records` and `operational_intervention_records` in Supabase. Falls back gracefully if Supabase is unavailable. Tenant-safe: all writes include `company_id` which is enforced by RLS.

### Retrieval Engine (`runtime-memory-retrieval.ts`)

Operational continuity reconstruction — NOT generic search.

Scoring formula per record:
```
score = type_base + status_modifier + recency + pressure_bonus + continuity_bonus + delivery_bonus + scope_bonus + intervention_pressure
```

Key behaviors:
- **Unresolved pressure accumulates**: `unresolvedWeight += ageDays × 0.03` (3% per day)
- **Resolved records suppressed**: pressure weight × 0.1 for resolved items
- **Escalated records priority**: +20 to base score
- **Scope isolation enforced**: records from other tenants are silently suppressed

`retrieveOperationalPressure()` returns only items with `computedPressureWeight >= 0.6`, sorted by pressure descending.

`retrieveInterventionLineage()` returns the full intervention history for a memory record.

### Continuity Engine (`runtime-memory-continuity.ts`)

**Timeline Reconstruction** — builds a chronological timeline of all operational events, with their interventions, sorted by first observation time.

**Continuity Gap Detection** — identifies operational gaps:
- `missing_resolution` — blocker unresolved > 7 days
- `stale_escalation` — escalation unresolved > 3 days
- `silent_stakeholder` — stakeholder signal unresolved > 5 days
- `unresolved_dependency` — dependency unresolved > 5 days

**Continuity Score** — `0..1` scalar representing operational clarity. Penalized by unresolved blockers and escalations.

### Diagnostics Layer (`runtime-memory-diagnostics.ts`)

Explains why things were retrieved and why pressure is high:

- `diagnoseRetrievalItem()` — explains priority reason and pressure
- `diagnoseLineage()` — explains causal ancestry, unresolved ancestors
- `diagnosePressureWeighting()` — shows initial weight, computed weight, increase
- `diagnoseContinuityGap()` — explains gap and recommends action
- `generateContinuityDiagnosticsReport()` — full diagnostic bundle

## Database Schema

### `operational_memory_records`

Core operational memory records. Self-referencing via `parent_record_id` for causality chains.

Key columns:
- `company_id text` — tenant isolation (RLS: `current_company_id() = company_id`)
- `parent_record_id uuid` — causality lineage FK (self-reference)
- `lineage_type` — causal relationship to parent
- `resolution_status` — unresolved | in_progress | resolved | escalated | abandoned
- `continuity_weight`, `operational_pressure_weight`, `escalation_weight`, `unresolved_weight`, `delivery_impact_weight` — five scoring dimensions
- `nutrient_ids jsonb` — links back to vault nutrients

### `operational_intervention_records`

History of resolution attempts. FK to `operational_memory_records`.

Key columns:
- `outcome` — succeeded | failed | partial | pending | abandoned
- `failure_reason` — why an intervention failed

## Relationship to Vault Digestive System

The vault digestive system extracts individual semantic nutrients from raw material. Vault nutrients decay over time via `decayProfile`.

The operational memory system builds ABOVE the vault:
- Uses vault nutrients as evidence substrate (`nutrient_ids` array)
- Adds causality lineage between records
- Inverts decay for unresolved items (pressure increases, not decreases)
- Adds intervention tracking
- Adds timeline reconstruction

They are complementary layers — the vault provides signals, operational memory provides continuity.

## Tenant Isolation

- All writes include `company_id` (text, extracted from JWT via `current_company_id()`)
- All reads filter on `company_id`
- `assertScopeIsolation()` throws on cross-company access in retrieval
- Workspace-level scoping uses `workspace_id` FK to `workspaces` table
- Cross-workspace access throws in `assertScopeIsolation()` when both workspaces are non-null and different

## Retrieval Philosophy

This is not vector search. This is operational causality reconstruction.

Priority order:
1. Escalated records (highest base score)
2. Unresolved blockers (high base, pressure accumulates)
3. Unresolved risks (pressure accumulates)
4. Unresolved dependencies
5. Pending commitments
6. Stakeholder signals (if critical path)

Items more than 90 days old AND resolved are suppressed from retrieval.

## Future Expansion

- **Connector signals** — `connector_signal` ingestion source reserved for external integrations (Jira, Slack, GitHub, etc.)
- **Semantic enrichment** — vault nutrients could be linked more explicitly to memory records via `nutrient_ids`
- **Pattern promotion** — unresolved records that recur could be promoted to vault learned patterns
- **Cross-project signals** — currently scoped per-project; future multi-project correlation via `coordination-intelligence.ts`
