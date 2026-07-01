# Runtime Operational Planning Architecture Note (v1)

## Existing operational guidance architecture
- **Intervention layer** (`intervention-engine.ts`) already detects delivery instability, operational drift, escalation need, and emits intervention recommendations with rationale.
- **Cross-signal + adaptive layer** (`adaptive-operational-intelligence.ts`, `coordination-orchestrator.ts`) already provides deterministic trajectory/recurrence signals and ordered coordination actions.
- **Conversational layer** (`/api/copilot`) surfaces diagnosis, immediate action, and follow-ups with trust notes.

## Gaps mapped
- **Sequencing gaps**: recommendations are mostly single actions; execution order and dependencies are not persisted as a living structure.
- **Continuity gaps**: action follow-through is not represented as evolving plan health; recommendations are regenerated each turn with weak lifecycle continuity.
- **Execution gaps**: accountability is partial and not consistently attached to each operational action.
- **Intervention-to-execution gap**: intervention severity/escalation signals do not consistently produce bounded multi-step operational response structures.

## v1 Runtime Operational Planning architecture
- Introduce lightweight `RuntimeOperationalPlan` objects grounded in intervention + coordination evidence.
- Generate a small set of high-value plans (max 3) to avoid recommendation noise.
- Include ordered operational sequence with priority, ownership suggestion, dependencies, and escalation triggers.
- Add bounded adaptive updates (stabilizing/degrading/blocked shifts) with explicit explanation strings.
- Keep evidence lineage explicit via `generatedFrom` and `supportingEvidence`.

## Integration points
- **Generator module**: `src/lib/runtime-operational-plans.ts`.
- **Conversational runtime integration**: copilot response now includes `operationalPlans` and exposes plan sequence in shell.
- **UI shell integration**: copilot domain includes `operational_plans` and renders active plan snippets with sequence/ownership.

## Integrity guards
- No cross-project plan mixing: plan generation scoped by current selected project snapshot.
- No fake progress inference: status changes are strictly signal-driven from deterministic risk/intervention context.
- No workflow-engine sprawl: plans are static data structures with bounded adaptive annotations only.
