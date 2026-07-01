import type { PredictiveTrajectoryNarrative, PredictiveOperationalContext } from "./predictive-intelligence-types";
import { buildPredictionConfidence } from "./predictive-intelligence-confidence";
export function buildPredictiveNarratives(context: PredictiveOperationalContext): PredictiveTrajectoryNarrative[] {
  return [{
    narrative: "Delivery delay is likely in the short term because unresolved procurement pressure is propagating into delivery compression while stakeholder continuity shows decision latency.",
    evidenceReferences: [context.correlation.clusters[0]?.clusterId ?? "none", context.continuity.riskClusters[0]?.clusterId ?? "none"],
    confidence: buildPredictionConfidence(0.69, ["Propagation + stakeholder continuity evidence"], []),
  }];
}
