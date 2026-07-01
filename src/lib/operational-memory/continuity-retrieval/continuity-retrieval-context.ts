import type { OperationalContinuityContext, OperationalContinuityRequest } from "./continuity-retrieval-types";
import { loadOperationalMemoryRecords, loadOperationalInterventionRecords } from "../runtime-memory-persistence";

export async function buildContinuityContext(
  request: OperationalContinuityRequest,
): Promise<OperationalContinuityContext> {
  const records = await loadOperationalMemoryRecords(request.scope, { limit: 256 });
  const interventionGroups = await Promise.all(
    records.map((record) => loadOperationalInterventionRecords(record.id, request.scope.companyId)),
  );
  const interventions = interventionGroups.flat();
  return { records, interventions, nowMs: Date.parse(request.now ?? new Date().toISOString()) };
}
