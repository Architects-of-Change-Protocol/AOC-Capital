import type { InterventionCandidate, InterventionNarrative } from "./autonomous-intervention-types";
export function buildInterventionNarratives(candidates: InterventionCandidate[]): InterventionNarrative[] {
  return candidates.map((candidate) => ({ interventionId: candidate.interventionId, confidence: candidate.confidence, evidence: candidate.evidence, narrative: `Recommend ${candidate.type.replaceAll("_", " ")} ${candidate.urgency === "immediate" ? "immediately" : "before the next cycle"} because ${candidate.evidence[0] ?? "operational pressure persists"} and expected pressure reduction is ${candidate.expectedImpact.expectedPressureReduction.toFixed(2)}.` }));
}
