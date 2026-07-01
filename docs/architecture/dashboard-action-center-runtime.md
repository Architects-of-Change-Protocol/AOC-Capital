# Dashboard Action Center Runtime (Track 8.7)

## Purpose
Deterministic runtime that converts dashboard intelligence into proposed, prioritized actions without UI or side effects.

## Action generation model
`generateDashboardActions` creates actions from risks, interventions, decisions, alerts, refresh plans, hydration recovery, and warnings. It then derives missing-input, dependency, and financial follow-up actions.

## Input sources
- Dashboard view model (`consumption` outputs)
- Cache refresh runtime outputs
- Hydration runtime outputs
- PMO intervention automation outputs

## Action taxonomy
Includes refresh, risk, PMO intervention, executive decision, alert escalation, hydration recovery, warning acknowledgement, and derived blocker/financial actions.

## Owner lane model
`assignDashboardActionOwnerLane` maps action type to owner lane with PMO intervention override when source owner lane is already specific.

## Execution lane model
`assignDashboardActionExecutionLane` maps action type to governance/recovery/refresh lanes.

## SLA model
`assignDashboardActionSLA` sets SLA by priority and applies type-specific cadence overrides.

## Escalation routing model
`buildDashboardActionEscalationRoute` determines required escalation and deterministic route/reason.

## Priority + deduplication model
`assignDashboardActionPriority` maps signals to low/medium/high/critical. `prioritizeDashboardActions` enriches, deduplicates (`type+source+sourceId+title`), and sorts.

## Runtime orchestration
`runDashboardActionCenter` executes generation, enrichment, sorting, metrics, next-action selection, and executive summary composition.

## Integration with Tracks 8.1–8.6
Consumes existing runtime outputs and remains read-only/pure so it can sit behind existing dashboard API/consumption layers without changing those tracks.

## Future extension path
- Action approval workflow
- Task adapter integration
- Jira/Linear/Atenea/Asana adapters
- Email/chat draft generation
- Executive approval queue
- Action lifecycle persistence
- Action audit trail
- Dashboard action UI
- SLA breach detection
