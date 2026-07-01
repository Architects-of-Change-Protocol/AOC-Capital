# Adaptive Severity & Confidence Engine

## Why static scoring is insufficient
Static severity/confidence captures artifact-local intensity but misses longitudinal operational behavior (recurrence, escalating trajectories, and absent recovery). This engine adds deterministic post-pattern adaptation.

## Deterministic model
Adaptive scoring is computed from learned pattern attributes and peer pattern context:
- recurrence count and run spread
- trajectory direction
- chronic/recovering status
- contradiction indicators from evidence excerpts
- recovery pattern presence

No LLMs, embeddings, or randomization are used.

## Outputs
For each learned pattern, PMFreak computes:
- `adaptiveSeverity`
- `adaptiveConfidence`
- `operationalUrgency` (0-100)
- `relevance` (0-100)
- `escalationLikelihood` (0-100)

Plus explainability and evolution metadata:
- severity/confidence reasons
- severity/confidence history
- contradiction profile
- recovery profile

## Contradiction and recovery handling
Contradictions and recoveries suppress confidence/severity gradually, preserving operational memory and lineage rather than hard resetting pattern risk.

## Persistence model
Adaptive outputs are persisted in learned pattern `metadata`:
- adaptive severity/confidence
- confidence/severity history
- contradiction/recovery counters
- trajectory strength

This remains workspace/project scoped and compatible with current RLS.
