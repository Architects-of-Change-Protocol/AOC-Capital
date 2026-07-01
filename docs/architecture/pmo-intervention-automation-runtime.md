# PMO Intervention Automation Runtime

**Track:** 7.4 — Portfolio / Executive Orchestration Runtime  
**Status:** Active  
**Depends on:** Track 7.1 (Portfolio Conflict Arbitration), Track 7.2 (Portfolio Load Balancing), Track 7.3 (Executive Decision Simulation)  
**Prepares:** Human approval workflows, task/workflow adapters, PMO dashboard queue

---

## Purpose

The PMO Intervention Automation Runtime converts portfolio intelligence signals — produced by Tracks 7.1, 7.2, and 7.3 — into concrete, prioritized PMO interventions. It answers the question:

**"What should the PMO do next?"**

Each intervention is deterministically assigned an urgency level, an owner lane, a required evidence set, and a recommended cadence. The result is an automation-safe, auditable PMO action plan ready for executive review or task adapter handoff.

---

## Intervention Taxonomy

Twelve intervention types are supported:

| Type | Description |
|---|---|
| `financial_impediment` | Unblock a financial hold — PO, payment, or invoice issue |
| `executive_arbitration` | Route a high-severity conflict or blocked decision to executive review |
| `resource_reassignment` | Rebalance capacity across projects under resource pressure |
| `client_input_request` | Formally request missing client inputs needed for delivery |
| `scope_freeze` | Freeze scope changes until ambiguity is resolved |
| `dependency_unblock` | Resolve a blocking dependency preventing delivery |
| `vendor_logistics_followup` | Follow up on vendor ETA, shipment, or logistics confirmation |
| `technical_validation_session` | Convene a session to resolve technical uncertainty |
| `stakeholder_alignment` | Align stakeholders on decisions or competing priorities |
| `risk_control_review` | Review risk controls for an approved-with-conditions decision |
| `delivery_rebaseline` | Rebaseline a delivery timeline due to schedule pressure or deferred decision |
| `escalation_cadence` | Establish a regular escalation cadence for at-risk projects under executive scrutiny |

---

## Detection Model

`detectPMOInterventions()` in `intervention-detector.ts` processes `PMOInterventionInput` and produces a deduplicated list of `PMOInterventionCandidate` objects.

Detection sources:

### A — Project-Level Blockers

Blockers are matched against financial keyword sets (`payment`, `invoice`, `purchase order`, `po not`, `budget hold`, etc.). A match triggers a `financial_impediment` candidate for the affected project.

### B — Missing Client Inputs

If a project has non-empty `missingInputs`, or `clientDependency === true` with `healthScore < 60`, a `client_input_request` is raised.

### C — Scope Uncertainty

Blockers and risks are matched against scope keywords (`scope ambiguity`, `undefined scope`, `discovery gap`, etc.). If the source also matches technical keywords (`technical`, `architecture`, `engineering`, etc.), a `technical_validation_session` is created; otherwise `scope_freeze`.

### D — Pending Dependencies

Any project with `pendingDependencies.length > 0` triggers a `dependency_unblock`.

### E — Vendor/Logistics Dependency

A `vendor_logistics_followup` is raised when `vendorDependency === true` or when a blocker matches vendor/logistics keywords (`logistics`, `shipment`, `delivery`, `eta`, `vendor`, etc.).

### F — Resource Pressure

If `resourcePressure >= 75`, a `resource_reassignment` is raised for the project.

### G — Timeline Pressure

If `timelinePressure >= 80`, a `delivery_rebaseline` is raised for the project.

### H — Stakeholder Pressure

If `stakeholderPressure >= 75`, a `stakeholder_alignment` is raised for the project.

### I — Executive Visibility

If `executiveVisibility === true` and `healthScore < 60`:
- If the project is blocked (`status === 'blocked'` or `blockers.length > 0`) or `healthScore < 40`: `executive_arbitration`
- Otherwise: `escalation_cadence`

### J — Conflict Signals (Track 7.1)

If a conflict signal has severity `high` or `critical`, an `executive_arbitration` is raised for the involved projects.

### K — Load Balancing Signals (Track 7.2)

If `operationalRiskLevel` is `high` or `critical`, both a `resource_reassignment` and `escalation_cadence` are raised across the full portfolio.

### L — Decision Simulation Signals (Track 7.3)

| Recommendation | Intervention |
|---|---|
| `escalate` | `executive_arbitration` |
| `approve_with_conditions` | `risk_control_review` |
| `defer` | `delivery_rebaseline` |

### Deduplication

Candidates are deduplicated by the composite key `type::sorted(affectedProjects)`. The first matching candidate is kept; subsequent identical keys are discarded. This ensures each unique intervention target produces exactly one candidate.

---

## Priority/Urgency Model

`assignInterventionUrgency()` in `priority-engine.ts` evaluates a candidate against the full input context to assign a `PMOInterventionUrgency` value.

### Critical

- Minimum project health in affected set < 40
- A conflict signal with `critical` severity touches the candidate's projects
- Portfolio health < 40 and candidate spans multiple projects
- Executive visibility + blocked status + type is `executive_arbitration`
- `financial_impediment` on a project with priority ≤ 2

### High

- Minimum project health in affected set < 60
- Any pressure dimension (resource, timeline, stakeholder) ≥ 80
- A conflict signal with `high` severity touches the candidate's projects
- Affected project has `clientDependency === true` with `healthScore < 70`
- Affected project has `vendorDependency === true` with `timelinePressure ≥ 70`

### Medium

- Risks exist but project is not blocked
- Missing inputs exist
- Pending dependencies exist but project health ≥ 60

### Low

- No elevated signals — preventive or governance-only intervention

---

## Ownership Lane Model

`assignInterventionOwnerLane()` in `ownership-engine.ts` applies a deterministic type-to-lane mapping:

| Intervention Type | Owner Lane |
|---|---|
| `financial_impediment` | `finance_lead` |
| `executive_arbitration` | `pmo_director` |
| `resource_reassignment` | `pmo_director` |
| `client_input_request` | `project_manager` |
| `scope_freeze` | `project_manager` |
| `dependency_unblock` | `technical_lead` |
| `vendor_logistics_followup` | `logistics_lead` |
| `technical_validation_session` | `technical_lead` |
| `stakeholder_alignment` | `project_manager` |
| `risk_control_review` | `project_manager` |
| `delivery_rebaseline` | `project_manager` |
| `escalation_cadence` | `pmo_director` |

---

## Evidence Model

`generateRequiredEvidence()` in `evidence-engine.ts` returns a deterministic list of four evidence items per intervention type, covering documentation, confirmation, and approval artifacts required before the intervention can be closed.

Examples:

- `financial_impediment`: Purchase order status, vendor payment confirmation, internal approval record, financial blocker description
- `executive_arbitration`: Portfolio conflict summary, impacted projects list, decision options, recommendation rationale
- `dependency_unblock`: Dependency list, blocking owner, required unblock action, target unblock date

---

## Cadence Model

`generateRecommendedCadence()` in `cadence-engine.ts` assigns a follow-up cadence string based on intervention type and urgency. Type-specific overrides take priority over urgency-based defaults.

### Type-Specific Overrides

| Condition | Cadence |
|---|---|
| `financial_impediment` + critical/high | Daily finance/logistics checkpoint until PO/payment blocker is resolved |
| `vendor_logistics_followup` | Every 48 hours until ETA is confirmed and delivery risk is controlled |
| `client_input_request` + high/critical | Daily client follow-up until required inputs are received |
| `executive_arbitration` | Immediate executive review followed by 48-hour decision checkpoint |
| `scope_freeze` | Freeze scope changes until validation session and decision record are completed |

### Urgency-Based Defaults

| Urgency | Cadence |
|---|---|
| `critical` | Daily checkpoint until unblocked |
| `high` | Every 48 hours until controlled |
| `medium` | Twice weekly follow-up |
| `low` | Weekly governance review |

---

## Automation Plan Generation

`generatePMOInterventionPlan()` in `automation-plan-engine.ts` accepts the fully enriched candidate list and the input context, then:

1. Sorts interventions by urgency (critical → high → medium → low), with ties broken by the lowest project priority number in the affected set
2. Produces an `expectedPortfolioImpact` string summarising critical, high, and escalation counts
3. Produces an `executiveSummary` in the format:

```
PMFreak detected [N] PMO interventions across [M] active projects,
including [K] critical items. Recommended action: prioritize [top type]
for [top project(s)].
```

The plan is stable: same input always produces the same ordered output.

---

## Runtime Orchestration

`runPMOInterventionAutomation()` in `pmo-intervention-automation-runtime.ts` is the single entry point.

### Pipeline

```
PMOInterventionInput
  → detectPMOInterventions()           // raw candidates
  → assignInterventionUrgency()        // per candidate, with full input context
  → assignInterventionOwnerLane()      // deterministic type→lane mapping
  → generateRequiredEvidence()         // evidence checklist per type
  → generateRecommendedCadence()       // follow-up schedule per type+urgency
  → escalationRequired flag            // true if urgency critical/high or pre-flagged
  → generatePMOInterventionPlan()      // sorted, summarised action plan
  → PMOInterventionAutomationReport    // final output
```

### Output

`PMOInterventionAutomationReport` contains:

- `totalInterventions` — count of all interventions
- `criticalInterventions` — count of critical-urgency interventions
- `escalationCount` — count of interventions flagged for escalation
- `recommendedPlan` — the full sorted `PMOInterventionPlan`
- `interventions` — the flat list with all enrichments applied

---

## Integration with Tracks 7.1, 7.2, and 7.3

The runtime consumes signal outputs from all three prior tracks via `PMOInterventionInput`:

| Source | Signal Field | Interventions Triggered |
|---|---|---|
| Track 7.1 Conflict Arbitration | `conflictSignals` | `executive_arbitration` on high/critical severity |
| Track 7.2 Load Balancing | `loadBalancingSignals` | `resource_reassignment` + `escalation_cadence` on high/critical risk |
| Track 7.3 Decision Simulation | `decisionSimulationSignals` | `executive_arbitration`, `risk_control_review`, or `delivery_rebaseline` by recommendation |

Project-level signals from the portfolio context are detected independently of upstream track outputs, so the runtime can operate standalone or as the final stage of the full Track 7 pipeline.

---

## Future Extension Path

The runtime is designed as a closed-loop recommendation engine. Future extension points:

- **Human approval workflow** — PMO director review gate before interventions are actioned
- **Task creation adapter** — Automatic ticket creation in Jira, Linear, or Asana from approved interventions
- **Email/chat draft generation** — Pre-drafted escalation messages for Slack or email based on cadence and owner lane
- **PMO dashboard queue** — Intervention backlog UI showing urgency, status, and evidence checklist
- **Intervention lifecycle tracking** — Status transitions (`proposed → approved → in_progress → completed`)
- **Atenea integration** — Route interventions to the Atenea operational intelligence layer for autonomous follow-up
- **Audit trail** — Append-only intervention log for governance and retrospective analysis
