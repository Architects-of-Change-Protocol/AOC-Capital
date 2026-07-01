# Executive Decision Simulation Runtime

**Track:** 7.3 — Portfolio / Executive Orchestration Runtime  
**Status:** Active  
**Depends on:** Track 7.1 (Portfolio Conflict Arbitration), Track 7.2 (Portfolio Load Balancing)  
**Prepares:** Track 7.4 (PMO Intervention Automation Runtime)

---

## Purpose

The Executive Decision Simulation Runtime allows PMFreak to evaluate a proposed executive decision against the active project portfolio before it is approved or executed. It produces a deterministic impact projection, a set of tradeoffs, a decision recommendation, and a confidence score — equivalent to a senior PMO decision briefing.

**Core question answered:** "What happens if leadership approves this decision?"

---

## Decision Taxonomy

Ten decision types are supported:

| Type | Description |
|---|---|
| `resource_reallocation` | Move capacity from one project to another |
| `timeline_delay` | Defer a project milestone or delivery date |
| `timeline_acceleration` | Pull forward a project timeline |
| `budget_hold` | Block a purchase order or freeze budget |
| `budget_release` | Approve previously held or additional funding |
| `scope_reduction` | Remove features or deliverables from a project |
| `scope_expansion` | Add features or deliverables to a project |
| `priority_override` | Elevate one project's priority above others |
| `temporary_capacity_addition` | Add surge staffing or contractor capacity |
| `executive_escalation` | Route a blocked decision to an executive sponsor |

---

## Baseline Calculation Model

`calculatePortfolioBaseline()` in `decision-impact-analyzer.ts` accepts the portfolio's project array and computes:

- **averageHealthScore** — mean of per-project health scores
- **totalResourceLoad** — sum of per-project resource load
- **totalTimelinePressure** — sum of per-project timeline pressure
- **totalBudgetExposure** — sum of per-project budget exposure
- **totalStakeholderLoad** — sum of per-project stakeholder load
- **totalDependencyRisk** — sum of per-project dependency risk
- **totalEscalationLoad** — sum of per-project escalation load
- **portfolioStressScore** — composite 0–100 score

The portfolio stress score formula blends the average of all stress dimensions across projects (60% weight) with the health inversion (40% weight):

```
dimensionAvg = (totalLoad across all 6 dimensions) / (projectCount × 6)
portfolioStressScore = clamp(dimensionAvg × 0.6 + (100 − avgHealth) × 0.4, 0, 100)
```

This is bounded to `[0, 100]` and is fully deterministic.

---

## Simulation Methodology

`simulateExecutiveDecision()` in `decision-simulation-engine.ts` produces a `DecisionImpactProjection` by:

### Step 1: Extract Decision Magnitude

A `magnitude` scalar `M ∈ [0, 1]` is extracted from the decision's delta fields:

| Decision Type | Magnitude Source | Normalization |
|---|---|---|
| `resource_reallocation` | `resourceDelta` | ÷ 50 |
| `timeline_delay/acceleration` | `timelineDeltaDays` | ÷ 30 |
| `budget_hold/release` | `budgetDelta` | ÷ 1,000,000 |
| `scope_reduction/expansion` | `scopeDelta` | ÷ 50 |
| `priority_override` | `priorityDelta` | ÷ 10 |
| `temporary_capacity_addition` | `capacityDelta` | ÷ 50 |
| `executive_escalation` | `escalationDelta` | ÷ 5 |

If no relevant delta is provided, `M` defaults to `0.5` (moderate impact).

### Step 2: Apply Impact Base Multipliers

Each decision type has a fixed impact base table (`IMPACT_BASE`) with per-dimension direction and magnitude:

- `h` — health impact base (positive = improves health)
- `rl` — resource load base
- `tp` — timeline pressure base
- `be` — budget exposure base
- `sl` — stakeholder load base
- `dr` — dependency risk base
- `el` — escalation load base

### Step 3: Scale to Portfolio

```
scale = affectedProjectCount / totalProjectCount

healthDelta             = round(scale × M × h, 1)          // average-based
resourceLoadDelta       = round(affectedCount × M × rl, 1)  // total-based
timelinePressureDelta   = round(affectedCount × M × tp, 1)
budgetExposureDelta     = round(affectedCount × M × be, 1)
stakeholderLoadDelta    = round(affectedCount × M × sl, 1)
dependencyRiskDelta     = round(affectedCount × M × dr, 1)
escalationLoadDelta     = round(affectedCount × M × el, 1)
```

### Step 4: Derive Portfolio Stress Delta

```
portfolioStressDelta = round(
  −healthDelta × 0.35
  + (resourceLoadDelta / n) × 0.15
  + (timelinePressureDelta / n) × 0.15
  + (budgetExposureDelta / n) × 0.10
  + (stakeholderLoadDelta / n) × 0.10
  + (dependencyRiskDelta / n) × 0.10
  + (escalationLoadDelta / n) × 0.05
)
```

### Step 5: Derive Risk Level

A composite risk score is calculated from the decision type's base risk, portfolio stress delta, and absolute magnitudes of dependency risk, stakeholder load, and escalation load changes:

```
riskScore = typeBaseRisk
          + portfolioStressDelta
          + |dependencyRiskDelta| × 0.5
          + |stakeholderLoadDelta| × 0.4
          + |escalationLoadDelta| × 0.3
```

| Risk Score | Risk Level |
|---|---|
| ≥ 20 | `critical` |
| ≥ 12 | `high` |
| ≥ 5 | `moderate` |
| < 5 | `low` |

---

## Tradeoff Generation Model

`generateDecisionTradeoffs()` in `tradeoff-engine.ts` returns 2–3 tradeoffs per decision type from a static, pre-authored template bank (`TRADEOFF_TEMPLATES`). Each tradeoff contains:

- A specific title describing the tension
- A `positiveImpact` statement
- A `negativeImpact` statement
- A `severity` level
- The list of affected projects

Tradeoffs are deterministic and type-specific. No inference or dynamic generation is performed.

---

## Recommendation Logic

`generateDecisionRecommendation()` in `recommendation-engine.ts` applies a priority-ordered decision tree:

| Condition | Recommendation |
|---|---|
| `riskLevel === 'critical'` AND `affectedProjects ≥ 3` | `escalate` |
| `riskLevel === 'critical'` AND `healthDelta < 0` | `reject` |
| `healthDelta < −5` AND `portfolioStressDelta > 8` | `reject` |
| `healthDelta > 0` AND `stress ≤ 0` AND risk is low/moderate | `approve` |
| `healthDelta > 0` AND risk is moderate/high | `approve_with_conditions` |
| `stress > 0` AND `stress ≤ 12` AND `healthDelta ≥ −3` | `defer` |
| `riskLevel === 'high'` AND `stress > 5` | `escalate` |
| Default | `approve_with_conditions` |

Each recommendation includes a generated rationale string referencing the specific delta values and tradeoff counts.

---

## Confidence Scoring

`calculateDecisionConfidence()` in `decision-confidence-engine.ts` returns a score from 0–100 representing how much structured information supports the recommendation.

Starting from a base of 70, adjustments include:

| Factor | Adjustment |
|---|---|
| All relevant delta fields present | +8 |
| Missing relevant delta fields | −8 |
| Source/target project IDs specified | +4 |
| Affected projects explicitly listed | +3 |
| Portfolio stress score < 40 (stable) | +8 |
| Portfolio stress score < 60 | +4 |
| Portfolio stress score > 85 (critical) | −12 |
| Portfolio stress score > 70 | −6 |
| Impact magnitude ≥ 15 (clear impact) | +5 |
| Impact magnitude < 3 (unclear impact) | −8 |
| Risk level = `low` | +6 |
| Risk level = `high` | −6 |
| Risk level = `critical` | −12 |
| Tradeoffs ≥ 3 | +4 |
| Tradeoffs < 2 | −4 |
| Per critical tradeoff | −4 |
| Broad impact (>60% of portfolio) with elevated risk | −5 |

---

## Runtime Orchestration

`runExecutiveDecisionSimulation()` in `executive-decision-simulation-runtime.ts` orchestrates the full pipeline:

```
1. calculatePortfolioBaseline(portfolio)
2. simulateExecutiveDecision(input)
3. generateDecisionTradeoffs(input, projection)
4. generateDecisionRecommendation(input, baseline, projection, tradeoffs)
5. calculateDecisionConfidence(input, baseline, projection, tradeoffs)
6. buildExecutiveSummary(...)
→ return ExecutiveDecisionSimulationReport
```

The executive summary format:

```
Decision "<title>" is recommended as <recommendation> because <rationale>.
Expected portfolio stress delta: ±N. Confidence: N.
```

---

## Integration with Track 7.1 and 7.2

The Executive Decision Simulation Runtime shares the same portfolio project model as Tracks 7.1 and 7.2, enabling layered analysis:

- **Track 7.1** (Conflict Arbitration) detects active conflicts in the portfolio. Decision simulation can be applied on top of conflict state to evaluate whether a decision resolves or amplifies existing conflicts.
- **Track 7.2** (Load Balancing) identifies redistribution opportunities. Decision simulation validates whether a proposed executive decision improves or degrades the load-balanced state.

These runtimes operate independently and compose naturally: run conflict arbitration first to understand the current state, then simulate a decision to evaluate its impact on that state.

---

## Future Extension Path

| Extension | Description |
|---|---|
| Multi-decision simulation | Simulate a sequence of decisions and evaluate their combined portfolio impact |
| Scenario comparison | Run N alternative decisions side-by-side and rank by net portfolio improvement |
| Executive what-if dashboard | Surface simulation results in the PMFreak UI for real-time decision support |
| Monte Carlo simulation layer | Optional probabilistic simulation wrapping the deterministic engine for sensitivity analysis |
| AI narrative layer | LLM-generated executive briefing on top of the deterministic projection output |

The deterministic core runtime must remain stable. Probabilistic or AI layers should wrap it without modifying the underlying calculation model.
