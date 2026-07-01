# Intervention Efficacy Learning

Deterministic backend layer that learns which intervention categories **appear correlated** with recovery under strict workspace/project scope.

## Persistence tables
- `vault_interventions`: core record, outcome, efficacy/confidence, fatigue summary, metadata.
- `vault_intervention_evidence`: per-intervention evidence lineage rows.
- `vault_intervention_outcomes`: snapshot of outcome reasons + deltas over time.

## RLS model
All three tables use `workspace_id` scoping + `public.is_workspace_member(workspace_id)` policies for select/insert/update. This prevents cross-workspace intervention memory reads.

## Write semantics
`persistInterventions` writes core rows plus evidence/outcome rows. Metadata stores:
- target signals
- outcome reasons
- time-to-effect + recurrence
- severity/confidence deltas
- fatigue profile
- `detectionMethod: "rule_based"`

Persistence is graceful-fallback: if Supabase/tables are unavailable, cognition remains in-memory and returns `method: "none"` with an error string.

## Read semantics
`loadInterventionHistory` supports workspace-required queries with optional project/pattern/type/outcome/fatigue/since filters, ordered by `attemptedAt` descending.

`getInterventionMemoryContext` returns deterministic organizational memory fields:
- totals/distributions
- efficacy averages by intervention type
- fatigue and repeated-failure loops
- recovered counts
- repeated pattern links
- recommended escalation shifts
- evidence summaries

## Fatigue accumulation across runs
When historical intervention memory is available, repeated attempts and failed attempts are accumulated for the same workspace+project+pattern+intervention type. Repeated stalled/failed loops increase fatigue and escalation recommendations.

## Limitations
- Correlation only; no causality claims.
- Rule-based lexical detection only.
- No autonomous intervention execution.
- No global memory across workspaces.

## Future Copilot integration
This persistence layer is designed to feed future decision-support copilots with deterministic, explainable intervention memory context — not autonomous actions.
