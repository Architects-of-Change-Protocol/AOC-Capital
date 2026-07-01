# Dashboard Manual Task Push Runtime (Track 8.12)

## Purpose
Deterministic, explicitly user-triggered runtime that accepts projected task payloads from Track 8.11, validates push eligibility, constructs execution-ready envelopes, simulates manual push outcomes, and returns deterministic push reports — without performing any external writes or live API calls.

## Manual trigger boundary
Every push attempt requires `manualTriggerConfirmed: true` in the `DashboardManualPushRequest`. If this flag is absent or false, all projections are ineligible and no envelopes are built. This is a hard gate that cannot be bypassed by any downstream component.

This design ensures that no external task creation can happen accidentally or through automated paths. The caller must express explicit intent on every invocation.

## Dry-run vs ready mode

| Mode | Envelope `executionStatus` | Simulation `status` | `simulatedExternalId` | External writes |
|---|---|---|---|---|
| `dry_run` | `simulated` | `simulated` | `simulated:{adapter}:{actionId}` | None |
| `ready` | `ready` | `ready` | `undefined` | None |

`dry_run` fully simulates the push flow and returns a synthetic external ID for inspection, but creates nothing externally. `ready` marks envelopes as ready for connector execution by Track 8.15, but does not trigger that execution itself.

Neither mode performs external writes. Live writes require Track 8.15 Live Adapter Connectors.

## Eligibility model
`evaluateManualPushEligibility` applies the following rules to each `DashboardTaskProjection`:

**Ineligible if any of:**
- `manualTriggerConfirmed` is false
- `projection.valid` is false
- `projection.payload` is missing
- `requestedAdapters` is set and does not include `projection.adapter`
- `requestedActionIds` is set and does not include `projection.actionId`
- `projection.errors` is non-empty

**Warnings forwarded:**
- All `projection.warnings` carry forward
- `email_queue` adapter always appends: "Email queue projection requires human review before sending."

Eligibility is fully deterministic and stateless. The same input always produces the same eligibility verdict.

## Envelope model
A `DashboardManualPushEnvelope` is built only for eligible projections. The envelope ID follows the format:

```
manual-push:{adapter}:{actionId}:{Date.parse(createdAt)}
```

This ID is deterministic given a fixed timestamp and projection identity, which enables idempotency checking in future lifecycle tracking (Track 8.14).

The envelope carries the full `DashboardProjectedTaskPayload` from Track 8.11 without modification — the push runtime does not mutate projections.

## Simulation model
`simulateManualTaskPush` processes each envelope:

- `dry_run` envelopes: assigned `simulatedExternalId = "simulated:{adapter}:{actionId}"` and message confirming no external task was created
- `ready` envelopes: no `simulatedExternalId`, message confirming readiness for explicit connector execution

Simulations are purely informational and contain no side effects.

## Report contract
`DashboardManualPushReport` provides:

- `totalProjections` — total input projections
- `eligibleCount` / `ineligibleCount` — eligibility breakdown
- `envelopeCount` — envelopes built
- `simulatedCount` — envelopes in `simulated` state (dry_run only)
- `skippedCount` — projections not converted to envelopes
- `envelopes` — full envelope list
- `simulations` — simulation outcome per envelope
- `warnings` — aggregated from request level and eligibility
- `executiveSummary` — single human-readable sentence describing the outcome

## Why no external writes yet
Track 8.12 is intentionally a closed simulation boundary. External writes require:
- **Approval gates** (Track 8.13) to ensure human sign-off before any task is created
- **Lifecycle persistence** (Track 8.14) to record push attempts and outcomes durably
- **Credential management and live connectors** (Track 8.15) for actual API calls

Skipping these tracks would create un-auditable, un-recoverable external tasks. The simulation layer allows full validation of the push pipeline before any production risk is introduced.

## Integration with Track 8.11
Track 8.12 consumes `DashboardTaskProjection[]` produced by `runDashboardTaskAdapterRuntime` (Track 8.11). The projection report from 8.11 can be used directly: pass `report.projections` as `request.projections`.

Track 8.12 does not re-project actions — it operates on already-projected payloads. This preserves the adapter isolation model from Track 8.11: each projection is evaluated and enveloped independently.

## Future path

**Track 8.13 — Approval Workflow Runtime**
Gate envelope execution behind an approval state machine. Envelopes in `ready` state become the input to approval requests. Approved envelopes advance to execution; rejected envelopes are archived.

**Track 8.14 — Task Lifecycle Persistence**
Persist envelopes, eligibility decisions, simulations, and push outcomes to durable storage. Enable idempotency via envelope IDs. Track retry attempts and failure states.

**Track 8.15 — Live Adapter Connectors**
Replace simulation with real API calls per adapter. Credentials managed per adapter kind. `ready` envelopes become the execution contract handed to connectors. Track 8.12 envelopes are the stable interface — connectors implement against the envelope model, not against raw projections.
