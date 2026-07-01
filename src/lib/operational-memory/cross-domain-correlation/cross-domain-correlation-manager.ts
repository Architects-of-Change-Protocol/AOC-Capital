import { buildCrossDomainCorrelationContext } from "./cross-domain-correlation-context";
import { buildCrossDomainCorrelationResult } from "./cross-domain-correlation-engine";
import { assertCrossDomainGovernanceScope } from "./cross-domain-correlation-governance";
import type { CrossDomainCorrelationRequest } from "./cross-domain-correlation-types";

export async function retrieveCrossDomainCorrelation(request: CrossDomainCorrelationRequest) { assertCrossDomainGovernanceScope(request); return buildCrossDomainCorrelationResult(request, await buildCrossDomainCorrelationContext(request)); }
export async function retrieveOperationalConvergence(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).convergencePatterns; }
export async function retrieveSystemicInstability(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).instabilityIndicators; }
export async function retrievePropagationChains(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).propagation; }
export async function retrieveCorrelationClusters(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).clusters; }
export async function retrieveOperationalFragility(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).atmosphere.operationalFragility; }
export async function retrieveRecoveryProbability(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).atmosphere.recoveryProbability; }
export async function retrieveCollapseIndicators(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).atmosphere.collapseProbability; }
export async function retrieveCorrelatedOperationalNarratives(request: CrossDomainCorrelationRequest) { return (await retrieveCrossDomainCorrelation(request)).narratives; }
