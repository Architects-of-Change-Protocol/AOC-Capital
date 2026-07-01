import type { OperationalTrajectoryForecast, PredictiveOperationalContext } from "./predictive-intelligence-types";
import { buildPredictionConfidence } from "./predictive-intelligence-confidence";

export function buildTrajectoryForecasts(context: PredictiveOperationalContext): OperationalTrajectoryForecast[] {
  const fragility = context.correlation.atmosphere.operationalFragility;
  const recovery = context.correlation.atmosphere.recoveryProbability;
  const pressure = context.continuity.unresolvedPressure.unresolvedCount;
  const base = fragility * 0.45 + (1 - recovery) * 0.4 + Math.min(1, pressure / 15) * 0.15;
  const state = base > 0.85 ? "collapse_risk" : base > 0.72 ? "critical" : base > 0.5 ? "degrading" : base > 0.3 ? "stable" : "improving";
  const domains = ["delivery","governance","stakeholder","procurement","financial","technical","overall"] as const;
  return domains.map((domain) => ({ domain, state, rationale: ["Deterministic trajectory based on fragility, recovery probability, and unresolved pressure", `Base score=${base.toFixed(2)}`], confidence: buildPredictionConfidence(0.6 + Math.min(0.35, context.correlation.convergencePatterns.length * 0.05), ["Multi-signal trajectory inference"], recovery < 0.4 ? [] : ["Higher recovery probability dampens collapse forecast"]), uncertainty: { reasons: recovery > 0.65 ? ["Recovery conditions could stabilize trend"] : [], dataGaps: [], confidenceDampers: pressure < 4 ? ["Limited unresolved pressure signal density"] : [], evidenceNeeded: ["More recent intervention outcomes"] } }));
}
