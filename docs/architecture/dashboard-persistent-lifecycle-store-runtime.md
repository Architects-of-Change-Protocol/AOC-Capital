# Dashboard Persistent Lifecycle Store Runtime (Track 8.18)

Provides deterministic durable lifecycle persistence abstraction with Supabase and Vault/BYOS contract adapters.

## Purpose
Startup hydration, event replay, reconciliation, and health diagnostics for lifecycle durability across restarts.

## Persistence boundary
Only lifecycle records/events and lineage; no approval mutations, no auth changes, no connector execution, no API routes.

## Adapters
- Supabase adapter for durable record/event tables.
- Vault/BYOS contract wrapper for future pluggable providers.

## Storage model
- Records: canonical lifecycle projection.
- Events: append-style lineage with dedupe by event id.

## Semantics
- Hydration loads scoped ordered records/events and warns on missing lineage.
- Replay rebuilds projection from deterministic event order.
- Reconciliation replaces drifted stored projection with replay projection.
- Health reports provider readiness.

## Recovery model
Runtime pipeline: hydrate → replay → reconcile → health → report.

## Integration with 8.14
Extends task lifecycle store shape without modifying approval logic/authorization.

## Distributed durability path
Prepares Track 8.19, 8.20, 8.21, and 8.22 by isolating persistence and recovery contracts.
