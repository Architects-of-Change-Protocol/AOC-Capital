# Vault Learned Pattern Layer — Architecture

## Why This Layer Exists

The Vault Digestive System extracts semantic signals (nutrients) from individual artifacts. Each digestion run is independent — it knows nothing about what was digested before.

The Learned Pattern Layer adds longitudinal memory. It analyzes nutrients **across multiple digestion runs** to detect when the same type of operational problem keeps recurring. This transforms isolated signals into durable, evidence-backed patterns that persist over time.

**Before this layer:**
> "This artifact contains a blocker signal."

**After this layer:**
> "This project has a recurring blocker pattern that has appeared 4 times across 3 weeks, involving Cisco vendor dependencies, with increasing trajectory."

## How Nutrients Become Learned Patterns

### Pipeline

```
VaultNutrients (many runs) ──→ RecurrenceDetection ──→ SignalGroups ──→ PromotionRules ──→ VaultLearnedPattern
                                                                      ──→ PatternScoring  ──→
                                                                      ──→ EvidenceBuilder ──→
```

### Step 1: Recurrence Detection (`recurrence-engine.ts`)

The engine groups nutrients by recurrence signals using two complementary strategies:

**Specific-Theme Grouping**: Groups nutrients of the same type with similar theme words (Jaccard similarity ≥ 0.4) across 2+ digestion runs. Detects "the same specific issue recurring."

**Project-Type Aggregate Grouping**: Groups all nutrients of the same type within the same workspace+project, requiring 3+ occurrences from 3+ digestion runs. Detects "this project keeps having this type of problem."

When both strategies fire for the same type+scope, the specific-theme group is preferred (more precise insight).

**Safety invariant**: Within-run duplicates (same `digestionRunId`) are never counted as longitudinal recurrence. The `duplicateMergeCount` field captures within-run compression; the pattern layer looks for recurrence across different `digestionRunId` values.

### Step 2: Promotion Rules (`promotion-rules.ts`)

Each `SignalGroup` is evaluated against deterministic rules. Rules are type-specific with conservative thresholds:

| Pattern Type | Primary Signal | Threshold |
|---|---|---|
| `recurring_blocker_pattern` | `blocker_signal` | 3+ occurrences, 2+ runs, severity ≥ medium |
| `recurring_dependency_pattern` | `dependency_signal` | 3+ occurrences, 2+ runs |
| `financial_friction_pattern` | `financial_impediment_signal` | 2+ occurrences, 2+ runs |
| `governance_degradation_pattern` | `governance_gap_signal` | 2+ occurrences, 2+ runs |
| `escalation_trajectory_pattern` | `escalation_signal` | 2+ occurrences, 2+ runs |
| `stakeholder_pressure_pattern` | `stakeholder_signal` | 3+ occurrences, 2+ runs |
| `delivery_drift_pattern` | `delivery_drift_signal` or `timeline_pressure_signal` | 2+ occurrences, 2+ runs |
| `ambiguity_accumulation_pattern` | `ambiguity_signal` | 3+ occurrences, 2+ runs |
| `chronic_risk_pattern` | `risk_signal` | 3+ occurrences, 3+ runs, 3+ days time span |
| `recovery_pattern` | `recovery_signal` after blockers | 1+ recovery after 2+ blockers |

Financial and governance thresholds are lower (2+) because these signal types are inherently high-severity and persistent.

### Step 3: Pattern Scoring (`pattern-scoring.ts`)

Scores are fully deterministic and reproducible:

**recurrenceStrength** = `0.4 × min(1, occurrences/6) + 0.4 × min(1, runs/5) + 0.2 × min(1, timeSpanDays/14)`

**evidenceStrength** = `0.6 × avg(nutrient_confidence) + 0.4 × min(1, distinctArtifacts/5)`

**confidence** = `0.6 × recurrenceStrength + 0.4 × evidenceStrength`

**severity** = highest severity across all contributing nutrients (conservative: worst-case reporting)

**trajectory** = derived from severity trend across the time-ordered signal sequence (`increasing`, `stable`, `decreasing`, `intermittent`)

**status** = `emerging` (< 3 runs) → `confirmed` (3+ runs) → `chronic` (5+ occurrences from 4+ runs)

## Recurrence vs. Duplication

These are distinct concepts:

| Concept | Source | Storage | Meaning |
|---|---|---|---|
| **Duplication** | Same artifact | `duplicateMergeCount` | Same signal extracted multiple times from one text |
| **Recurrence** | Different artifacts/runs | `VaultLearnedPattern` | Same type of signal appearing repeatedly over time |

A nutrient with `duplicateMergeCount = 3` was mentioned 4 times in one artifact. That is **not** longitudinal recurrence — it's within-artifact compression.

Longitudinal recurrence requires different `digestionRunId` values.

## Persistence Model

Two tables:

**`vault_learned_patterns`** — one row per detected pattern:
- Workspace-scoped (`workspace_id`)
- Optional project scope (`project_id`)
- Pattern type, title, summary, status, trajectory, confidence, severity
- Evidence metadata in `metadata` JSONB column
- RLS: `is_workspace_member(workspace_id)`

**`vault_learned_pattern_evidence`** — one row per contributing nutrient/residue:
- References `pattern_id` (cascades on delete)
- Contains `excerpt`, `evidence_timestamp`, `contribution_reason`
- Nullable `nutrient_id`, `residue_id` (future-proof for other evidence sources)
- RLS: `is_workspace_member(workspace_id)`

The persistence layer follows the same graceful-fallback pattern as `digestive/persistence.ts`: if Supabase tables don't exist or are unavailable, patterns remain in-memory and no error is thrown.

## Context Retrieval

`getLearnedPatternContext()` is the primary integration point. It returns a `PatternContext` object suitable for injection into:
- Copilot prompts (context priming)
- Executive synthesis reports
- Intervention engine triggers
- Project health dashboards

The context object contains pre-categorized pattern lists:
- `topActivePatterns` — top 5 active patterns ranked by operational significance
- `chronicRisks` — patterns with status `chronic` or type `chronic_risk_pattern`
- `recurringBlockers` — `recurring_blocker_pattern` patterns
- `recentRecoveries` — `recovery_pattern` patterns
- `risingEscalations` — `escalation_trajectory_pattern` with `increasing` trajectory
- `governanceDegradation` — `governance_degradation_pattern` patterns
- `unresolvedAmbiguity` — `ambiguity_accumulation_pattern` patterns
- `evidenceSummaries` — top 3 evidence excerpts per pattern for brief display
- `readinessSignal` — `none | emerging | active | critical` signal for dashboards

Patterns are ranked by `severity × confidence × recurrenceCount`.

## AOC/Runtime Governance Alignment

This layer follows all existing governance principles:

- **No AI/LLMs**: All detection is rule-based and deterministic
- **Tenant isolation**: Every pattern is workspace-scoped; nutrients from different workspaces are never combined
- **Authorization boundary**: Callers must verify workspace/project access before calling any service function
- **RLS enforcement**: Both persistence tables use `is_workspace_member()` helper
- **Evidence lineage**: Every pattern preserves references to the original nutrients that triggered it
- **Auditability**: `promotionReason` on every pattern explains deterministically why it was created

## Limitations

1. **No semantic similarity**: Pattern grouping uses keyword Jaccard similarity, not semantic embeddings. Two blockers described in different words won't cluster into one specific-theme group (though the project-level aggregate will still catch them).

2. **No temporal decay on patterns**: Patterns are not decayed over time in this version. The `status` field (`emerging` → `confirmed` → `chronic`) tracks lifecycle but doesn't expire patterns automatically.

3. **No pattern merging**: If a pattern is detected multiple times (e.g., same project's data analyzed twice), duplicate patterns may be created. The persistence layer uses upsert on `id`, but the in-memory layer creates new IDs each time.

4. **Recovery detection is coarse**: `recovery_pattern` is triggered when any `recovery_signal` appears after any 2+ blocker/risk signals in the same project. It doesn't verify thematic alignment between the recovery and the specific blockers.

5. **In-memory only for now**: Until migration `20260520010000` is applied to Supabase, patterns are computed on-demand but not persisted between sessions.

## Future Extensions

- **Semantic clustering** via embeddings: Would improve specific-theme grouping across differently-worded signals
- **Pattern decay**: Auto-mark patterns as `stale` when no reinforcing signals appear for N days
- **Pattern merging**: Deduplicate patterns across analysis runs using stable `groupKey` hashing
- **Cross-project patterns**: Workspace-level patterns (e.g., "this vendor causes problems in 3 projects") with explicit cross-project flag
- **Contradiction detection**: Alert when a new `recovery_signal` appears in a project with an active `chronic_risk_pattern`
- **Adaptive thresholds**: Per-workspace calibration based on historical false positive/negative rates
