import type { PredictionConfidenceScore } from "./predictive-intelligence-types";
export function buildPredictionConfidence(score: number, rationale: string[], dampers: string[]): PredictionConfidenceScore {
  const normalized = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  const label = normalized >= 0.85 ? "very_high" : normalized >= 0.65 ? "high" : normalized >= 0.4 ? "medium" : "low";
  return { score: normalized, label, rationale, dampers };
}
