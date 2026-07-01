import type { ExecutiveCommandContext } from "./executive-command-context";
import type { ExecutiveCapacitySignal, ExecutiveEscalationSummary, ExecutivePortfolioHealth, ExecutiveStabilizationPriority, ExecutiveSurvivabilitySummary } from "./executive-command-types";

export function buildExecutiveStabilizationPriorities(context: ExecutiveCommandContext, survivability: ExecutiveSurvivabilitySummary, escalation: ExecutiveEscalationSummary, portfolio: ExecutivePortfolioHealth, capacity: ExecutiveCapacitySignal): ExecutiveStabilizationPriority[] {
  const candidates = [
    { id: "governance-clarity", action: "unblock governance ambiguity", s: 1 - survivability.operationalSurvivability, p: portfolio.instability, e: escalation.governanceCongestion, g: 0.9 },
    { id: "escalation-relief", action: "reduce escalation saturation", s: 1 - survivability.recoverySurvivability, p: escalation.executiveSaturation, e: escalation.overload, g: 0.7 },
    { id: "pm-capacity", action: "reduce PM overload", s: capacity.pmOverload, p: capacity.coordinationSaturation, e: capacity.escalationBurden, g: 0.5 }
  ];
  return candidates.map((c) => ({ id: c.id, action: c.action, survivabilityImpact: c.s, propagationSeverity: c.p, escalationSaturation: c.e, portfolioInstability: portfolio.instability, governanceErosion: c.g, priorityScore: Number((c.s * 0.3 + c.p * 0.25 + c.e * 0.2 + portfolio.instability * 0.15 + c.g * 0.1).toFixed(3)), evidence: context.evidence, confidence: 0.68, uncertainty: ["bounded_by_modular_inputs"], causality: ["deterministic_weighted_prioritization"], governanceBoundaries: context.governanceBoundaries, survivabilityRationale: ["prioritizes highest stabilization leverage"] })).sort((a, b) => b.priorityScore - a.priorityScore);
}
