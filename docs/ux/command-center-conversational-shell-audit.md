# Command Center UX Architecture Note (Pre-Refactor)

## Current crowding drivers
- Command Center emphasized many same-weight metric cards, causing scan overload.
- Multiple dense widget grids surfaced simultaneously (risk, stakeholder, drift, recovery, live activity, commentary).
- Low separation between primary decision flow and secondary telemetry.

## Reusable assets
- Runtime-safe scoped SWR intelligence fetches already exist in `CommandCenterClient`.
- Existing route-level context integrity (project/workspace scoping, invalid project handling) is already enforced in `command-center/page.tsx`.
- `OperationalShell` + `ContextScopeBar` already preserve top-level runtime context and navigation continuity.

## Must stay visible
- Active project scope and workspace-scoped context.
- Trust/error states (auth-denied and endpoint-unavailable signaling).
- Refresh/latest-sync understanding.

## Move behind domain navigation
- Secondary module-level views (executive, stakeholders, projects, memory, vault).
- Lower-priority deep telemetry currently rendered as full-width cards.

## Shift into contextual evidence panel
- Source lineage and trust labels.
- Top risk/pressure/coordination signals.
- Intervention counts and confidence markers.

## APIs that can power the shell now
- `/api/intelligence/execution-risk`
- `/api/intelligence/stakeholders`
- `/api/intelligence/interventions`
- `/api/intelligence/coordination`
- `/api/intelligence/operational-live`
