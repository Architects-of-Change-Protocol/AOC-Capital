# Executive Dashboard Aggregation Runtime (Track 7.5)

## Purpose

The Executive Dashboard Aggregation Runtime consolidates outputs from all Track 7 portfolio intelligence runtimes into one deterministic, executive-ready portfolio dashboard report. It provides a single PMO/executive command view across portfolio health, active conflicts, load balancing status, decision simulations, and PMO interventions.

This runtime does not re-detect conflicts, re-run simulations, or create new interventions. It is a pure aggregation and prioritization layer that renders fragmented portfolio intelligence into a coherent executive signal.

## Aggregation model

Pipeline:
1. Accept structured input from Track 7.1–7.4 runtime outputs.
2. Generate health summary from portfolio-level health score.
3. Generate conflict summary from arbitration report.
4. Generate load summary from load balancing report.
5. Generate decision summary from simulation reports.
6. Generate intervention summary from PMO intervention report.
7. Aggregate and rank top portfolio risks across all sources.
8. Generate executive recommendation bundle (decisions needed, attention areas, recommendation, summary).
9. Return fully composed `PortfolioExecutiveDashboardReport`.

## Input contract

`PortfolioDashboardInput` accepts:

- `portfolio` (required): Core portfolio health metrics — health score, project counts, average project health.
- `conflictReport` (optional): Output from Track 7.1 Portfolio Conflict Arbitration Runtime.
- `loadBalancingReport` (optional): Output from Track 7.2 Portfolio Load Balancing Runtime.
- `decisionSimulationReports` (optional): Array of outputs from Track 7.3 Executive Decision Simulation Runtime.
- `interventionReport` (optional): Output from Track 7.4 PMO Intervention Automation Runtime.

All optional sections produce zeroed or fallback summaries when absent, enabling the runtime to operate with partial data.

## Summary engine responsibilities

### Health Summary Engine (`health-summary-engine.ts`)

Maps portfolio health score to a risk level using threshold bands:
- `>= 80` → low
- `65–79` → moderate
- `45–64` → high
- `0–44` → critical

Produces a human-readable summary appropriate for executive briefing.

### Conflict Summary Engine (`conflict-summary-engine.ts`)

Aggregates conflict report data into counts, conflict type frequency ranking, and escalation counts. A conflict is classified as requiring executive escalation when its severity is `high` or `critical`, or when an `executiveRecommendation` is present.

### Load Summary Engine (`load-summary-engine.ts`)

Extracts balancing score, operational risk level, projected improvement, and top recommended actions from the load balancing report. Falls back to portfolio health score when no load report is provided.

### Decision Summary Engine (`decision-summary-engine.ts`)

Categorizes decision simulation recommendations:
- `approve` and `approve_with_conditions` → approval count
- `escalate` → escalation count
- `reject` → rejection count

Computes average confidence score across all simulations.

### Intervention Summary Engine (`intervention-summary-engine.ts`)

Aggregates PMO intervention totals, critical counts, escalation counts, intervention type frequency, and owner lane frequency. Frequency rankings are deterministic (alphabetical tiebreaker on equal counts).

## Risk prioritization model

`generateTopPortfolioRisks()` draws from five sources:

| Source | Condition |
|---|---|
| Portfolio | `portfolioHealthScore < 65` |
| Conflict | Conflict severity `high` or `critical` |
| Load | Operational risk level `high` or `critical` |
| Decision | Projection risk level `high` or `critical` |
| Intervention | Urgency `critical` or `high` |

Risks are sorted by:
1. Risk level (critical → high → moderate → low)
2. Source priority (portfolio → conflict → load → decision → intervention)

Maximum 10 risks returned.

## Executive recommendation model

`generatePortfolioExecutiveRecommendation()` produces four outputs:

### Top decisions needed

Decisions are conditionally populated based on the summaries:
- Critical interventions exist → "Approve PMO intervention plan for critical projects"
- Executive conflict escalations → "Resolve executive arbitration on portfolio conflicts"
- High/critical load risk → "Authorize resource rebalancing plan"
- Escalated decision simulations → "Decide whether to accept portfolio stress increase from simulated decisions"
- Delivery rebaseline intervention detected → "Confirm delivery rebaseline for strained projects"
- Financial intervention detected → "Authorize financial/logistics unblock actions"

### Executive attention areas

Each area is activated by a specific signal:

| Area | Signal |
|---|---|
| `portfolio_health` | Health score < 65 |
| `delivery_conflict` | Critical conflicts > 0 |
| `resource_capacity` | Load risk high or critical |
| `financial_exposure` | Financial/budget intervention present |
| `timeline_pressure` | Delivery rebaseline intervention present |
| `stakeholder_alignment` | Stakeholder alignment intervention present |
| `dependency_blocker` | Dependency unblock intervention present |
| `executive_decision` | Escalated decision simulations > 0 |
| `pmo_intervention` | Critical interventions > 0 |

### Portfolio recommendation

Derived from health risk level:
- `low` → "Maintain current governance cadence and continue monitoring portfolio signals."
- `moderate` → "Proceed with targeted PMO follow-up and monitor emerging portfolio pressure."
- `high` → "Activate PMO intervention plan and review portfolio load balancing actions."
- `critical` → "Trigger immediate executive portfolio review and approve critical intervention actions."

### Executive summary

Format: `"Portfolio health is [riskLevel] with [X] active projects, [Y] conflicts, [Z] PMO interventions, and [N] top risks requiring attention. Recommended action: [portfolioRecommendation]"`

## Dashboard output contract

`PortfolioExecutiveDashboardReport`:

| Field | Type | Description |
|---|---|---|
| `generatedAt` | string | ISO 8601 timestamp |
| `healthSummary` | `PortfolioHealthSummary` | Portfolio health state |
| `conflictSummary` | `PortfolioConflictSummary` | Active conflict overview |
| `loadSummary` | `PortfolioLoadSummary` | Load balancing state |
| `decisionSummary` | `PortfolioDecisionSummary` | Decision simulation overview |
| `interventionSummary` | `PortfolioInterventionSummary` | PMO intervention overview |
| `topRisks` | `PortfolioRiskPriority[]` | Up to 10 prioritized risks |
| `topDecisionsNeeded` | `string[]` | Executive action items |
| `executiveAttentionAreas` | `PortfolioExecutiveAttentionArea[]` | Active attention signals |
| `portfolioRecommendation` | string | Governance-level recommendation |
| `executiveSummary` | string | One-paragraph executive brief |

## Integration with Track 7.1, 7.2, 7.3, and 7.4

| Runtime | Output field mapped to input |
|---|---|
| Track 7.1 Portfolio Conflict Arbitration | `conflictReport` |
| Track 7.2 Portfolio Load Balancing | `loadBalancingReport` |
| Track 7.3 Executive Decision Simulation | `decisionSimulationReports[]` |
| Track 7.4 PMO Intervention Automation | `interventionReport` |

All four fields are optional. The runtime degrades gracefully when any upstream report is unavailable.

## Future extension path

- PMO dashboard UI widgets driven by `PortfolioExecutiveDashboardReport`
- Portfolio executive briefing export (PDF, email digest)
- Weekly automated executive summary scheduled via cron
- Board-level portfolio heatmap visualization from attention areas and risk priorities
- Tenant-specific scoring weights (custom risk thresholds per organization)
- Trend comparison against prior reporting cycles using time-series snapshots of `PortfolioExecutiveDashboardReport`
