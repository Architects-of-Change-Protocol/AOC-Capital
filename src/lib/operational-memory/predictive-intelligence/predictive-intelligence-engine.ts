import type { PredictiveOperationalContext, PredictiveOperationalResult } from "./predictive-intelligence-types";
import { collectPredictionEvidence } from "./predictive-intelligence-evidence";
import { buildTrajectoryForecasts } from "./predictive-intelligence-trajectories";
import { buildScenarioProjections } from "./predictive-intelligence-scenarios";
import { buildPredictedOutcomes, buildPredictiveRiskClusters } from "./predictive-intelligence-risk-forecast";
import { estimateInterventionImpact } from "./predictive-intelligence-intervention-impact";
import { buildPredictiveNarratives } from "./predictive-intelligence-narratives";
import { buildPredictiveDiagnostics } from "./predictive-intelligence-diagnostics";

export function buildPredictiveOperationalResult(context: PredictiveOperationalContext): PredictiveOperationalResult {
  const evidenceBundles = collectPredictionEvidence(context);
  const trajectoryForecasts = buildTrajectoryForecasts(context);
  const scenarioProjections = buildScenarioProjections(context);
  const predictedOutcomes = buildPredictedOutcomes(context);
  const interventionImpactEstimates = estimateInterventionImpact(context);
  const riskClusters = buildPredictiveRiskClusters(context);
  const predictiveNarratives = buildPredictiveNarratives(context);
  const uncertaintyNotes = trajectoryForecasts.map((t) => t.uncertainty);
  const confidenceScores = trajectoryForecasts.map((t) => t.confidence);
  const summary = { topRisk: predictedOutcomes[0]?.outcomeType ?? "none", interventionWindow: "immediate" as const, explainability: "Deterministic forecasting grounded in continuity and cross-domain evidence." };
  const result: PredictiveOperationalResult = { predictedOutcomes, trajectoryForecasts, scenarioProjections, evidenceBundles, confidenceScores, uncertaintyNotes, interventionImpactEstimates, riskClusters, predictiveNarratives, diagnostics: [], trendSignals: [{ signal: "recovery_probability", direction: "falling", strength: 0.7, evidenceReferences: ["correlated-atmosphere"] }], summary };
  result.diagnostics = buildPredictiveDiagnostics(result);
  return result;
}
