# Portfolio Conflict Arbitration Runtime

## Purpose

Track 7.1 introduces a deterministic PMO-level runtime that continuously identifies and arbitrates cross-project portfolio conflicts. The runtime provides first-pass executive orchestration intelligence across resources, schedules, dependencies, budget, stakeholder load, and escalation channels.

## Conflict Taxonomy

The runtime classifies portfolio conflicts into eight deterministic types:

- `resource_contention`
- `timeline_collision`
- `dependency_conflict`
- `budget_pressure`
- `stakeholder_saturation`
- `priority_inversion`
- `technical_capacity_conflict`
- `escalation_bottleneck`

## Detection Model

`detectPortfolioConflicts()` evaluates all active projects and emits structured conflict candidates by applying fixed thresholds and deterministic overlap checks:

- Shared resource concurrency threshold breach
- Timeline overlap with shared resources
- Dependency ownership under upstream constraint
- Portfolio budget pressure above configured envelope
- Stakeholder approval saturation
- Priority inversion where lower-priority work consumes constrained resources
- Aggregate technical demand above engineering capacity threshold
- Escalation path concentration on a single executive owner

## Severity Scoring Methodology

`scoreConflictSeverity()` uses weighted deterministic scoring with these factors:

- Conflict breadth (number of impacted projects)
- Strategic priority intensity
- Delivery proximity to deadlines
- Dependency criticality
- Resource scarcity concentration
- Potential delivery impact
- Executive visibility requirement

Score bands map to:

- `low`
- `moderate`
- `high`
- `critical`

## Arbitration Decision Framework

`generateArbitrationStrategies()` emits 2-5 context-aware strategies for each conflict. Strategy families include:

- Resource redistribution
- Timeline resequencing
- Priority override
- Temporary staffing escalation
- Executive intervention scheduling
- Dependency fast-track
- Scope containment recommendation
- Budget reallocation proposal

Each option includes rationale, recommended actions, expected impact, and whether executive escalation is required.

## Executive Escalation Model

`generateExecutiveRecommendation()` only emits recommendations for `high` and `critical` conflicts. Escalation guidance is type-specific and routes to PMO, finance, steering committees, or cross-functional arbitration forums.

## Portfolio Health Scoring

`runPortfolioConflictArbitration()` computes a 0-100 portfolio health score where lower values indicate higher portfolio stress.

Health score inputs:

- Severity-weighted conflict penalties
- Conflict-to-project breadth stress penalty

The report returns:

- `totalProjects`
- `conflictsDetected`
- `criticalConflicts`
- `portfolioHealthScore`
- `conflicts[]`

## Runtime Integration Path (PMFreak PMO Dashboard)

1. Feed active project portfolio snapshots into `runPortfolioConflictArbitration()`.
2. Render conflict cards grouped by severity and taxonomy.
3. Surface arbitration options with actionability status.
4. Highlight executive recommendations for high/critical items.
5. Track portfolio health score trend in PMO executive dashboard telemetry.

## Future Extension Path

- Predictive conflict forecasting (lead-time risk projections)
- Portfolio simulation engine (scenario-based arbitration testing)
- Automated PMO intervention loops (closed-loop governance automation)
