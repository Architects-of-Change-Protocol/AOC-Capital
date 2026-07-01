import type { InterventionCandidate, InterventionSequence } from "./autonomous-intervention-types";
export function buildInterventionSequence(candidates: InterventionCandidate[]): InterventionSequence {
  const ordered = [...candidates].sort((a,b)=>a.type.includes("followup")?-1:b.type.includes("followup")?1:0);
  return { orderedSteps: ordered.map((c, i) => ({ stepId: `step-${i+1}`, candidateId: c.interventionId, type: c.type, rationale: `sequence_${c.type}`, dependencyStepIds: i===0?[]:[`step-${i}`], urgency: c.urgency, expectedOutcome: c.fallbackHint })), sequencingRationale: ["stakeholder_followup_before_escalation", "governance_evidence_before_executive_path"] };
}
