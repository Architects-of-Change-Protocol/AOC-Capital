import type { PredictiveOperationalRequest, PredictiveOperationalContext } from "./predictive-intelligence-types";
import { retrieveOperationalContinuity } from "../continuity-retrieval/continuity-retrieval-manager";
import { retrieveCrossDomainCorrelation } from "../cross-domain-correlation/cross-domain-correlation-manager";
export async function buildPredictiveOperationalContext(request: PredictiveOperationalRequest): Promise<PredictiveOperationalContext> {
  const [continuity, correlation] = await Promise.all([
    retrieveOperationalContinuity(request),
    retrieveCrossDomainCorrelation(request),
  ]);
  return { continuity, correlation, nowMs: request.now ? Date.parse(request.now) : Date.now() };
}
