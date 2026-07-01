import type { PredictiveDiagnostic, PredictiveOperationalResult } from "./predictive-intelligence-types";
export function buildPredictiveDiagnostics(result: PredictiveOperationalResult): PredictiveDiagnostic[] {
  return [
    { summary: "Predictions generated from continuity + correlation evidence.", reasons: [`outcomes=${result.predictedOutcomes.length}`, `scenarios=${result.scenarioProjections.length}`] },
    { summary: "Confidence bounded by uncertainty and data freshness controls.", reasons: result.uncertaintyNotes.flatMap((u)=>u.confidenceDampers) },
  ];
}
