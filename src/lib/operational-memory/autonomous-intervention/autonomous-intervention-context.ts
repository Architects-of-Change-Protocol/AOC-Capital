import { retrieveOperationalContinuity } from "../continuity-retrieval/continuity-retrieval-manager";
import { retrieveCrossDomainCorrelation } from "../cross-domain-correlation/cross-domain-correlation-manager";
import { retrievePredictiveOperationalIntelligence } from "../predictive-intelligence/predictive-intelligence-manager";
import { retrieveCriticalPathIntelligence } from "../critical-path-intelligence/critical-path-manager";
import type { AutonomousInterventionRequest, AutonomousInterventionContext } from "./autonomous-intervention-types";

export async function buildAutonomousInterventionContext(request: AutonomousInterventionRequest): Promise<AutonomousInterventionContext> {
  const [continuity, correlation, predictive, criticalPath] = await Promise.all([
    retrieveOperationalContinuity({ scope: request.scope, limit: request.limit, now: request.now }),
    retrieveCrossDomainCorrelation({ scope: request.scope, limit: request.limit, now: request.now }),
    retrievePredictiveOperationalIntelligence({ scope: request.scope, limit: request.limit, now: request.now }),
    retrieveCriticalPathIntelligence({ scope: request.scope, limit: request.limit, now: request.now }),
  ]);
  const evidence = [...predictive.diagnostics.map((d) => d.summary), ...criticalPath.diagnostics.map((d) => d.summary), ...correlation.diagnostics.map((d) => d.summary)].slice(0, 12);
  return {
    request,
    nowMs: request.now ? Date.parse(request.now) : Date.now(),
    evidence,
    criticalPathCollapseRisk: 1 - criticalPath.survivability.survivabilityScore,
    recoveryProbability: correlation.atmosphere.recoveryProbability,
    milestoneSurvivability: criticalPath.survivability.survivabilityScore,
    stakeholderSilenceLevel: continuity.stakeholderContinuity.filter((s) => s.silence).length / Math.max(1, continuity.stakeholderContinuity.length),
    unresolvedPressure: continuity.unresolvedPressure.unresolvedCount / Math.max(1, continuity.prioritizedOperationalRecords.length),
    bottleneckSeverity: criticalPath.bottlenecks.reduce((m, b) => Math.max(m, b.propagationSeverity), 0),
    systemicInstability: correlation.atmosphere.systemicInstability,
    governanceErosion: correlation.atmosphere.governanceErosion,
  };
}
