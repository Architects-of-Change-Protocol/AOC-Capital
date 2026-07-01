# Dashboard Task Adapter Runtime (Track 8.11)

## Purpose
Deterministic adapter layer that projects Dashboard Action Center actions into adapter-specific external task payloads. Remains projection-only with no live writes, no credentials, and no external side effects.

## Adapter projection model
`runDashboardTaskAdapterRuntime` accepts a `DashboardTaskProjectionRequest` (actions + target adapters) and returns a `DashboardTaskProjectionReport`. Every action is projected against every adapter (cartesian product), producing one `DashboardTaskProjection` per action-adapter pair.

## Capability matrix
Each adapter declares a `DashboardTaskAdapterCapability` record that governs which payload fields are populated.

| Adapter | Priority | Assignee | Due Date | Labels | Description | Escalation Metadata | Evidence | Execution Lane |
|---|---|---|---|---|---|---|---|---|
| jira | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| linear | ✓ | ✓ | — | ✓ | ✓ | — | — | — |
| asana | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| clickup | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| email_queue | — | — | — | — | ✓ | ✓ | — | — |
| atenea | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ |
| internal_runtime | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Validation model
`validateDashboardTaskProjection` enforces: non-empty title, non-empty description, known adapter. `internal_runtime` bypasses error validation and is always considered valid. `email_queue` emits an assignee-omitted warning. Validation is fully deterministic and stateless.

## Projection flow
1. Normalize request (default to empty arrays)
2. For each action × adapter: validate → if invalid return error projection; if valid build payload
3. Aggregate projections into report with success/failure counts and executive summary

## Priority mapping
`critical → highest`, `high → high`, `medium → medium`, `low → low`

## Description enrichment
Each projected payload description includes: action description, rationale, owner lane, execution lane, escalation state, escalation reason (if applicable), and evidence requirements (if any). This makes every projected task self-contained without requiring back-reference to the source dashboard.

## Labels
Adapters supporting labels receive: `priority:{priority}`, `lane:{executionLane}`, `owner:{ownerLane}`.

## Metadata block
Every payload carries a `metadata` record with: `actionId`, `executionLane`, `ownerLane`, `escalationRequired`, `evidenceRequiredCount`, `source`. This preserves PMFreak provenance for future lifecycle tracking.

## Why no live writes yet
Track 8.11 is intentionally read-only. The projection layer must be proven stable and deterministic before any execution path is opened. Live writes require approval workflows (Track 8.13) and credential management (Track 8.15) to be in place first.

## Atenea adapter rationale
Atenea is PMFreak's native orchestration surface. It supports PMFreak-specific constructs (execution lane, evidence requirements, escalation metadata) that generic trackers do not model. It does not support assignee because Atenea routes by execution lane, not individual assignment.

## Multi-adapter orchestration
Projections are cartesian: every action is projected to every requested adapter independently. Adapters are isolated — a failed projection on one adapter does not affect others. This allows partial pushes in future execution tracks.

## Future execution path
- **Track 8.12** — Manual Task Push Runtime: operator-triggered push of a single projection to a target adapter
- **Track 8.13** — Approval Workflow Runtime: gate projection execution behind approval state machine
- **Track 8.14** — Task Lifecycle Persistence: persist projection state and track push outcomes
- **Track 8.15** — Live Adapter Connectors: real API integrations with credential management per adapter
