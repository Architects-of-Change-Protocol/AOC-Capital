import type { PredictiveOperationalContext, PredictionEvidenceBundle } from "./predictive-intelligence-types";
import { applyPredictiveNoiseControls } from "./predictive-intelligence-noise-control";
export function collectPredictionEvidence(context: PredictiveOperationalContext): PredictionEvidenceBundle[] {
  const continuity = context.continuity.prioritizedOperationalRecords.slice(0, 8).map((candidate, i) => ({ evidenceId: `continuity-${i}`, source: "continuity" as const, reference: candidate.record.id, summary: candidate.record.summary, confidence: Math.max(0.35, Math.min(0.95, candidate.score / 100)) }));
  const propagation = context.correlation.propagation.slice(0, 8).map((prop, i) => ({ evidenceId: `propagation-${i}`, source: "correlation" as const, reference: `${prop.fromDomain}->${prop.toDomain}`, summary: prop.causalNarrative, confidence: Math.max(0.35, Math.min(0.9, prop.pressureTransfer)), domain: prop.toDomain }));
  return applyPredictiveNoiseControls([...continuity, ...propagation]);
}
