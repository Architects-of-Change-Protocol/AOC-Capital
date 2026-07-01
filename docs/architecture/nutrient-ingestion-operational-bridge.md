# Nutrient Ingestion & Operational Signal Extraction Engine

## Purpose

The Nutrient-Operational Memory Bridge connects PMFreak's vault digestive system
(which extracts structured semantic nutrients from raw documents and conversations)
with the operational runtime memory system (which tracks durable, pressure-aware
operational records with causality lineage).

Without this bridge, nutrients extracted by vault digestion live in isolation —
rich evidence extracted from uploads and conversations never influences the
operational memory that drives copilot responses, pressure detection, and
continuity tracking.

With this bridge, high-significance vault nutrients automatically become
operational memory records, preserving their evidence lineage, recurrence
history, and pressure contribution.

---

## Module Location

```
src/lib/operational-memory/nutrient-bridge/
├── nutrient-bridge-types.ts         — All type contracts
├── nutrient-signal-classifier.ts    — Nutrient → signal classification
├── nutrient-pressure-calculator.ts  — Pressure contribution scoring
├── nutrient-recurrence-detector.ts  — Rule-based recurrence detection
├── nutrient-to-memory-mapper.ts     — Nutrient → OperationalMemoryRecord
├── nutrient-memory-linker.ts        — Bidirectional link construction + persistence
├── nutrient-bridge-diagnostics.ts   — Diagnostic explanation builders
├── nutrient-bridge-manager.ts       — Public API orchestrator
└── index.ts                         — Public exports
```

---

## Nutrient-to-Memory Mapping

Each vault nutrient type maps deterministically to an operational memory record type:

| VaultNutrientType | OperationalMemoryRecordType | Signal Category | Unresolved | Base Pressure |
|---|---|---|---|---|
| `blocker_signal` | `blocker` | blocker | ✓ | 0.90 |
| `risk_signal` | `risk` | risk | ✓ | 0.65 |
| `dependency_signal` | `dependency` | dependency | ✓ | 0.60 |
| `decision_signal` | `decision` | unresolved_decision | ✓ | 0.50 |
| `commitment_signal` | `commitment` | commitment | ✓ | 0.50 |
| `delivery_drift_signal` | `delivery_pressure` | delivery_pressure | ✓ | 0.75 |
| `financial_impediment_signal` | `delivery_pressure` | procurement_pressure | ✓ | 0.85 |
| `governance_gap_signal` | `governance_gap` | governance_gap | ✓ | 0.70 |
| `escalation_signal` | `escalation` | escalation | ✓ | 0.88 |
| `timeline_pressure_signal` | `timeline_signal` | timeline_pressure | ✓ | 0.80 |
| `stakeholder_signal` | `stakeholder_signal` | stakeholder_alignment | ✗ | 0.45 |
| `recovery_signal` | `recovery` | weak_signal | ✗ | 0.05 |
| `ambiguity_signal` | `risk` | weak_signal | ✗ | 0.30 |
| `contradiction_signal` | `risk` | risk | ✓ | 0.55 |

The mapping is enforced in `nutrient-signal-classifier.ts` via `NUTRIENT_TYPE_MAP`.

---

## Recurrence Model

Recurrence detection is fully rule-based. No embeddings are used.

### Outcomes

| Outcome | When |
|---|---|
| `new_record` | No comparable existing record found in scope |
| `recurrence` | Matched an existing unresolved record by type + text similarity |
| `escalation` | Escalation signal or confirmed recurrence with high-pressure match |
| `duplicate_noise` | Nutrient already linked to an existing record |
| `resolved_followup` | `recovery_signal` matched an unresolved record |

### Algorithm

1. **Duplicate check**: If the nutrient ID is already in `existingLinks`, return `duplicate_noise`.
2. **Scope filter**: Only compare against records with the same `workspaceId` + `projectId`.
3. **Recovery signal**: If `recovery_signal`, find matching unresolved record by text overlap → `resolved_followup`.
4. **Escalation signal**: If `escalation_signal`, find compatible unresolved records → `escalation`.
5. **Type + text match**: Find records with a compatible record type that are unresolved, compute word overlap.
6. **Recurrence hint**: If `confirmed_recurrence`, lower the text similarity threshold.
7. If no match above threshold → `new_record`.

Text similarity uses normalized word overlap (stop words filtered, first 120 chars).

---

## Duplicate Suppression Model

Nutrients are suppressed (not promoted to memory) when any of the following
policy conditions are met:

| Condition | Skip Reason |
|---|---|
| `classification.confidence < policy.minimumConfidence` | `low_confidence` |
| `nutrient.scoring.significanceScore < policy.minimumSignificanceScore` | `below_significance_threshold` |
| `actionability === "informational"` + low significance | `informational_only` |
| `nutrient.nutrientType === "ambiguity_signal"` + `first_occurrence` | `ambiguity_signal_suppressed` |
| Nutrient ID already processed in the same bridge run | `duplicate_recent` |
| Nutrient belongs to a different workspace | `out_of_scope` |
| Nutrient already has a memory record link | `already_linked` |

### Default Policy

```typescript
{
  minimumSignificanceScore: 0.35,
  minimumConfidence: 0.45,
  suppressInformationalOnly: true,
  suppressAmbiguityWithoutRecurrence: true,
  dedupWindowMs: 15 * 60 * 1000,  // 15 minutes
}
```

---

## Pressure Calculation

Pressure contribution (0..1) drives `operationalPressureWeight` in created records.

**Pressure increases when:**
- Nutrient type is a blocker, escalation, or financial impediment
- `recurrenceHint === "confirmed_recurrence"` (+0.15)
- `actionability === "actionable"` (+10%)
- Severity is critical or high

**Pressure decreases when:**
- `nutrient.nutrientType === "recovery_signal"` (fixed: 0.05)
- `actionability === "informational"` (×0.45)
- `freshness < 0.3` (×0.70) — decayed signal
- `ambiguityLevel === "highly_ambiguous"` (×0.60)

---

## Lineage Preservation

When a nutrient becomes a memory record:

| Recurrence Outcome | parentRecordId | lineageType |
|---|---|---|
| `new_record` | null | null |
| `recurrence` | existing record ID | `related_to` |
| `escalation` | existing record ID | `escalates_to` |
| `resolved_followup` | existing record ID | `resolved_by` |

Additionally:
- `nutrientIds: [nutrient.id]` on the new record (vault link)
- Existing matched records get the new nutrientId appended via `updateOperationalMemoryRecordForRecurrence`
- The `sourceRef` is set to `nutrient_bridge:{nutrientId}` for traceability
- `firstObservedAt` is set to `nutrient.createdAt` (not now) — preserves original evidence timestamp

---

## Bidirectional Link Table

A dedicated link table `operational_memory_nutrient_links` stores rich metadata about each link:

```sql
operational_memory_nutrient_links
  id                          uuid PK
  company_id                  text NOT NULL
  workspace_id                uuid NOT NULL (FK → workspaces)
  project_id                  uuid NULL    (FK → projects)
  nutrient_id                 uuid NOT NULL
  operational_memory_record_id uuid NOT NULL (FK → operational_memory_records)
  link_type                   text ('promoted_from' | 'recurrence_match' | ...)
  confidence                  numeric(5,4)
  created_at                  timestamptz
  metadata                    jsonb
```

**Unique constraint**: one nutrient ↔ one record link (prevents duplicate links).

**Note on scope**: The vault uses `workspace_id`-based tenant isolation while
operational memory uses `company_id`. The link table stores both, with RLS
enforced via `current_company_id() = company_id` (consistent with operational
memory) plus `workspace_id` FK for vault-side queries.

---

## Bridge Diagnostics

Every processed nutrient produces a `NutrientBridgeDiagnostic` that explains:

| Reason | Explanation |
|---|---|
| `promoted_to_memory` | Why the nutrient was promoted (type, severity, significance, recurrence) |
| `classified_as_recurrence` | Which existing record was matched and why |
| `skipped_low_confidence` | Confidence value and ambiguity level |
| `skipped_informational` | Actionability + significance values |
| `skipped_duplicate` | Which prior link prevented promotion |
| `skipped_below_threshold` | Significance score vs. policy threshold |
| `suppressed_ambiguity` | Why ambiguity signal was suppressed |
| `confidence_downgraded` | Original vs. adjusted confidence and ambiguity level |
| `pressure_increased` | Pressure delta and contributing factors |

---

## Tenant Isolation

Every bridge call requires both `companyId` (for operational memory) and
`workspaceId` (for vault nutrition) to be provided explicitly.

- Records are scoped to `{ companyId, workspaceId, projectId }`
- Nutrients from different workspaces are rejected with `out_of_scope`
- Recurrence matching is scoped to the same workspace + project
- The link table uses `company_id` for RLS, `workspace_id` for vault queries
- No cross-workspace or cross-company data access is possible

---

## Integration Points

### Where to call the bridge

The bridge is designed to be called after vault digestion completes. The
primary integration point is:

```typescript
// After digestVaultMaterial() returns:
import { bridgeNutrientsToOperationalMemory } from "@/lib/operational-memory/nutrient-bridge";

const digestionResult = await digestVaultMaterial(context, rawMaterial);

await bridgeNutrientsToOperationalMemory({
  nutrients: digestionResult.nutrients,
  companyId,        // Required — get from workspace membership
  workspaceId: context.workspaceId,
  projectId: context.projectId,
  existingRecords,  // Optional: pre-loaded for recurrence detection
  existingLinks,    // Optional: pre-loaded for duplicate suppression
});
```

### Safe integration locations

1. **After vault digestion** (`src/lib/vault/digestive/index.ts` completion)
2. **Upload processing** (`src/app/api/upload/route.ts` post-digestion)
3. **Conversation ingestion** (`src/lib/vault/conversation-ingestion.ts` completion)
4. **Copilot route** (`src/app/api/copilot/route.ts` after operational summary)

Each integration point should pass `companyId` obtained from the authenticated
workspace membership — it is not derivable from `workspaceId` alone.

---

## Future Connector Signals

The bridge is designed to receive signals from future connector integrations
(Jira, Slack, GitHub, Salesforce) by accepting `VaultNutrient` objects. When
connector signals are implemented:

1. Map connector events to `VaultRawMaterial` with appropriate types
2. Run through `digestVaultMaterial()` to extract nutrients
3. Call the bridge with `ingestionSource: "connector_signal"`
4. The bridge handles all recurrence, lineage, and pressure logic identically

---

## Validation

```bash
npm run check:nutrient-bridge    # Structural validation (no DB required)
npm run check:operational-memory # Verify operational memory runtime
npm test                         # Full test suite including bridge contracts
```
