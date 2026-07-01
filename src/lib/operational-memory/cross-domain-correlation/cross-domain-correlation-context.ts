import { loadOperationalInterventionRecords, loadOperationalMemoryRecords } from "../runtime-memory-persistence";
import type { CrossDomainCorrelationContext, CrossDomainCorrelationRequest } from "./cross-domain-correlation-types";

export async function buildCrossDomainCorrelationContext(request: CrossDomainCorrelationRequest): Promise<CrossDomainCorrelationContext> {
  const records = await loadOperationalMemoryRecords(request.scope, { limit: 256 });
  const groups = await Promise.all(records.map((r)=>loadOperationalInterventionRecords(r.id, request.scope.companyId)));
  return { records, interventions: groups.flat(), nowMs: Date.parse(request.now ?? new Date().toISOString()) };
}
