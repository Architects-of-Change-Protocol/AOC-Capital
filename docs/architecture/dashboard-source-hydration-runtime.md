# Dashboard Source Hydration Runtime (Track 8.5)

## Purpose
This runtime adds persistence-oriented hydration under the dashboard API boundary so source signals can be saved, recovered, validated, freshness-scored, and safely consumed without coupling UI layers to storage.

## Snapshot contract
Snapshots follow `DashboardSourceSnapshot` with tenant/workspace/portfolio scope, source kind, payload, generation metadata, and schema/runtime versions.

## Source kinds
- `executive_dashboard_report`
- `intervention_report`
- `decision_simulation_reports`
- `conflict_report`

## Freshness scoring
`calculateSourceFreshness()` marks snapshots as missing/invalid/stale/fresh and assigns deterministic scores. Expired snapshots are stale with score 25.

## Completeness scoring
Hydration requires `executive_dashboard_report`; other sources are optional-but-expected:
- 100: all four present and valid
- 70: executive present with gaps in optional sources
- 40: executive missing but optional sources present
- 0: no valid sources

## Risk model
- `low`: executive report fresh and completeness >= 70
- `moderate`: executive report stale and completeness >= 70
- `high`: executive missing while optional sources exist
- `critical`: no valid sources or invalid executive source

## In-memory store role
`createInMemoryDashboardSnapshotStore()` provides deterministic runtime behavior with source-keyed latest-snapshot semantics. This is intentionally storage-interface based for future backends.

## Why Supabase/Vault is deferred
Track 8.5 establishes interfaces and deterministic behavior first; infrastructure-specific concerns are deferred to Track 8.8 to avoid coupling runtime behavior to external persistence decisions.

## Hydration resolver behavior
`hydrateDashboardSourceData()` loads latest snapshots, validates them, computes freshness/completeness/risk, maps source payloads into API-ready source data, and emits warnings.

## Recovery plan behavior
`buildDashboardHydrationRecoveryPlan()` derives fallback mode (`none|partial|empty`) and recovery actions for missing/stale sources.

## API runtime integration path
The hydration runtime can be introduced as an internal source provider to Track 8.2’s source resolver without changing the response builder contract. Integration remains optional and non-breaking.

## Future persistence architecture
- Supabase snapshot store
- Company vault storage
- Tenant-scoped persistence policies
- Hydration cache invalidation
- Background refresh jobs
- Source lineage and audit trails
- Dashboard ETag/cache header support
- Recovery automation orchestration
