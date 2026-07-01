# Cost Governance Agent

## Purpose
The Cost Governance Agent provides deterministic runtime financial governance for PMFreak. It continuously computes cost health and emits machine-actionable interventions for the operational synthesis layer.

## Financial cognition model
The model synthesizes five deterministic signals:
- Baseline drift signal (actual/projection/authorization/scope-cost divergence)
- Burn-rate anomaly signal (velocity, acceleration, unstable pattern)
- Forecast confidence signal (EAC confidence score 0-100)
- Procurement risk signal (latency/dependency/sequence/coupling plus scenario flags)
- Billing readiness signal (realization readiness and collection risk)

## Deterministic rules
- No LLM or probabilistic scoring is used.
- Every score is computed from static formulas.
- Severity is always one of: `healthy`, `watch`, `elevated`, `critical`.
- Forecast severity mapping is fixed:
  - 100-85 healthy
  - 84-65 watch
  - 64-40 elevated
  - <40 critical

## Signal synthesis
`createCostGovernanceAssessment()` orchestrates all signal engines and then computes:
- `overallSeverity` (max severity across all signals)
- `financialHealthScore` (weighted deterministic composite)
- `interventionQueue` (stable deterministic priority/urgency ordering)
- `executiveSummary` (runtime-safe, non-generative sentence)

## Intervention philosophy
Interventions are deterministic recommendations designed for fast operational actuation:
- OPEN_FINANCIAL_ESCALATION
- REQUEST_PO_EXPEDITE
- TRIGGER_BILLING_ALIGNMENT
- SURFACE_FORECAST_REBASELINE
- ESCALATE_VENDOR_DEPENDENCY
- PROTECT_MARGIN_WINDOW

Each intervention includes deterministic priority, urgency score, rationale, and recommended response window in hours.
