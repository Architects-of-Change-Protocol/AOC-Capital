import type { InterventionCandidate, InterventionDiagnostic } from "./autonomous-intervention-types";
export function buildInterventionDiagnostics(candidates: InterventionCandidate[]): InterventionDiagnostic[] {
  return candidates.map((candidate) => ({ interventionId: candidate.interventionId, whyRecommended: `recommended_for_${candidate.target.domain}_pressure`, whyUrgent: `urgency_${candidate.urgency}_from_pressure_and_survivability`, whySequenced: "sequence_prioritizes_evidence_before_escalation", evidenceSummary: candidate.evidence.join(";"), mitigatedRisk: candidate.riskReduced.join(","), governanceGate: candidate.safety.classification, uncertaintyRemaining: candidate.uncertainty.join(",") || "bounded_uncertainty", ifFailsNext: candidate.fallbackHint }));
}
