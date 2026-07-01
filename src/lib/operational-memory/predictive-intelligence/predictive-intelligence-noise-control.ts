import type { PredictionEvidenceBundle } from "./predictive-intelligence-types";
export function applyPredictiveNoiseControls(evidence: PredictionEvidenceBundle[]) {
  const dedup = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.source}:${item.reference}`;
    if (dedup.has(key) || item.confidence < 0.25) return false;
    dedup.add(key);
    return true;
  });
}
