import type { CrossDomainCorrelationContext, CrossDomainCorrelationRequest, CrossDomainCorrelationResult, CrossDomainSignal } from "./cross-domain-correlation-types";
import { FINANCIAL_HINTS } from "./cross-domain-correlation-financial";
import { TECHNICAL_HINTS } from "./cross-domain-correlation-technical";
import { STAKEHOLDER_HINTS } from "./cross-domain-correlation-stakeholder";
import { DELIVERY_HINTS } from "./cross-domain-correlation-delivery";
import { GOVERNANCE_HINTS } from "./cross-domain-correlation-governance";
import { PROCUREMENT_HINTS } from "./cross-domain-correlation-procurement";
import { suppressCorrelationNoise } from "./cross-domain-correlation-noise-control";
import { detectConvergencePatterns } from "./cross-domain-correlation-patterns";
import { modelRiskPropagation } from "./cross-domain-correlation-risk-propagation";
import { buildCorrelationClusters } from "./cross-domain-correlation-clusters";
import { buildCorrelatedAtmosphere } from "./cross-domain-correlation-atmosphere";
import { buildCorrelationDiagnostics } from "./cross-domain-correlation-diagnostics";
import { buildCorrelationGraph } from "./cross-domain-correlation-graph";
import { detectSystemicInstability } from "./cross-domain-correlation-convergence";
import { buildCrossDomainWeights } from "./cross-domain-correlation-weighting";

const DOMAIN_RULES = [
  ["financial", FINANCIAL_HINTS], ["technical", TECHNICAL_HINTS], ["stakeholder", STAKEHOLDER_HINTS], ["delivery", DELIVERY_HINTS], ["governance", GOVERNANCE_HINTS], ["procurement", PROCUREMENT_HINTS],
] as const;

function classifyDomain(summary: string): CrossDomainSignal["domain"] {
  const text = summary.toLowerCase();
  for (const [domain, hints] of DOMAIN_RULES) if (hints.some((h)=>text.includes(h))) return domain;
  return "delivery";
}

function normalizeSignals(context: CrossDomainCorrelationContext): CrossDomainSignal[] {
  return context.records.map((record) => {
    const domain = classifyDomain(`${record.summary} ${record.detail ?? ""}`);
    const unresolved = record.resolutionStatus === "unresolved";
    return { id: record.id, domain, sourceType: "memory", severity: Math.min(1, record.weights.continuityWeight), confidence: Math.min(1, record.confidence), unresolved, pressureContribution: Math.min(1, record.weights.operationalPressureWeight + (unresolved ? 0.1 : 0)), recurrence: 1, stakeholderReferences: record.scope.stakeholderId ? [record.scope.stakeholderId] : [], timelineImpact: record.recordType === "timeline_signal" ? 0.9 : 0.4, deliveryImpact: domain === "delivery" ? 0.9 : 0.5, governanceImpact: domain === "governance" ? 0.9 : 0.4, observedAt: record.lastObservedAt, summary: record.summary, lineageReference: record.parentRecordId ?? undefined };
  });
}

export function buildCrossDomainCorrelationResult(request: CrossDomainCorrelationRequest, context: CrossDomainCorrelationContext): CrossDomainCorrelationResult {
  const normalizedSignals = suppressCorrelationNoise(normalizeSignals(context), context.nowMs).slice(0, request.limit ?? 48);
  const convergencePatterns = detectConvergencePatterns(normalizedSignals);
  const propagation = modelRiskPropagation(normalizedSignals);
  const clusters = buildCorrelationClusters(normalizedSignals, convergencePatterns);
  const atmosphere = buildCorrelatedAtmosphere(clusters, propagation);
  const diagnostics = buildCorrelationDiagnostics(convergencePatterns, clusters, propagation);
  const lineage = buildCorrelationGraph(normalizedSignals, clusters);
  const systemic = detectSystemicInstability(convergencePatterns);
  const weights = buildCrossDomainWeights(normalizedSignals);
  const byDomain = Object.fromEntries(weights.map((w)=>[w.domain, w.weight])) as CrossDomainCorrelationResult["confidence"]["byDomain"];
  return {
    normalizedSignals,
    clusters,
    convergencePatterns,
    instabilityIndicators: [{ type: "systemic_instability", severity: systemic.severity, score: systemic.score, rationale: "Derived from converging multi-domain degradation patterns." }],
    pressureSummary: { totalPressure: normalizedSignals.reduce((sum,s)=>sum+s.pressureContribution,0), unresolvedSignals: normalizedSignals.filter((s)=>s.unresolved).length, recurrenceDensity: normalizedSignals.reduce((sum,s)=>sum+s.recurrence,0)/Math.max(1,normalizedSignals.length), propagationSeverity: atmosphere.propagationSeverity },
    atmosphere,
    propagation,
    escalationChains: propagation.map((p, idx)=>({ id: `escalation-${idx+1}`, signalIds: normalizedSignals.filter((s)=>s.domain===p.fromDomain || s.domain===p.toDomain).map((s)=>s.id), propagationPath: [p.fromDomain, p.toDomain], escalationDensity: p.pressureTransfer, atmosphereImpact: p.pressureTransfer })),
    diagnostics,
    confidence: { overall: Object.values(byDomain).reduce((a,b)=>a+b,0)/6, byDomain },
    lineage,
    narratives: clusters.map((c)=>({ narrative: c.operationalNarrative, signalIds: c.signalIds, explainability: `Cluster ${c.clusterId} built from deterministic domain mapping and convergence thresholding.`, causalityChain: c.domains })),
  };
}
