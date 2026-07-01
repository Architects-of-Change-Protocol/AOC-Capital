# Quality Governance Agent

## Purpose
The Quality Governance Agent is a deterministic runtime cognition layer that evaluates delivery quality integrity and produces deterministic intervention actions.

## Quality cognition model
The domain synthesizes five quality signals:
- Baseline quality drift
- Defect pressure
- Acceptance readiness
- Technical debt risk
- Validation confidence

## Signal definitions
- **BaselineQualityDriftSignal**: weighted quality drift percentage across criteria slippage, validation erosion, and acceptance divergence.
- **DefectPressureSignal**: defect velocity, regression recurrence, and defect escape amplification with explicit instability detections.
- **AcceptanceReadinessSignal**: readiness score based on criteria completion, evidence completeness, validation cycle success, and regression closure.
- **TechnicalDebtSignal**: debt accumulation, volatility coupling, and deferred remediation exposure.
- **ValidationConfidenceSignal**: deterministic confidence score from validation coverage gap, failed cycles, and confidence drift.

## Deterministic rules
- Severity states are fixed: `healthy`, `watch`, `elevated`, `critical`.
- Baseline drift thresholds are fixed:
  - `<5`: healthy
  - `<12`: watch
  - `<20`: elevated
  - `>=20`: critical
- No AI/LLM scoring is used.
- Intervention ordering is stable by urgency score, priority, then recommendation key.

## Intervention philosophy
The intervention system emits deterministic recommendations to protect runtime quality:
- OPEN_QUALITY_ESCALATION
- TRIGGER_VALIDATION_SWEEP
- BLOCK_ACCEPTANCE_PROMOTION
- FORCE_DEFECT_REMEDIATION
- SURFACE_TECH_DEBT_REBASELINE
- PROTECT_RELEASE_QUALITY

Each intervention includes deterministic `priority`, `urgencyScore`, `rationale`, and `recommendedWindowHours`.

## Runtime integration path
`createQualityGovernanceAssessment()` orchestrates all quality engines and emits:
- `overallSeverity`
- `qualityHealthScore`
- `interventionQueue`
- `executiveSummary`

The runtime summary format is:
`Quality posture is X. Drift Y%, acceptance readiness Z, defect pressure A, technical debt B.`
