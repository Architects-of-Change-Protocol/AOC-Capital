# Conversational Runtime Architecture Note (pre-implementation)

## Current runtime conversation architecture
- UX shell exists in `src/features/command-center/command-center-client.tsx` with domain cards, suggested prompts, trust/evidence sidebar, but no live runtime chat execution yet.
- Live conversational endpoint is `POST /api/copilot` with governance + attestation checks, runtime authorization, and AI provider routing.
- Context inputs include project memory (`readProjectMemory`), runtime authority context (`getRuntimeAuthorityView`), and operational continuity (`buildContinuityContext`).
- Contract verification exists (`CopilotRequestContract`, `CopilotResponseContract`, `verifyAiResponse`).
- Supplemental continuity API exists at `GET /api/copilot/memory` for unresolved blockers/risks/stakeholder pressure.

## Existing data available to conversation
- Runtime-scoped governance context (workspace/project/action) from AOC runtime authorization paths.
- Persisted operational memory entries (unresolved concerns, decisions, blockers).
- Cross-signal intelligence endpoints in shell (`execution-risk`, `stakeholders`, `interventions`, `coordination`, `operational-live`).
- Response verifier confidence score and sanitized facts/assumptions.

## Existing domain reasoning availability
- Domain-like inputs exist (risk, stakeholders, intervention, coordination), but routing into conversation generation is weak.
- Methodology routing (PMI/Agile/Hybrid/PMO) exists, but operational domain routing is limited.

## Gaps and risk points
- No deterministic bounded conversation state per workspace/project/session.
- Conversational continuity is mostly inferred from memory tables, not active recent dialogue context.
- Trust semantics are partially implicit (verifier logs) rather than explicit in user-facing response structure.
- Command center shell currently stores draft only, which can imply intelligence depth without live cognition execution.
- Hallucination risk remains when low evidence exists and model is asked for decisive narrative.
