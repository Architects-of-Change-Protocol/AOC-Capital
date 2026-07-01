import type {
  OperationalCausalityChain,
  OperationalInterventionRecord,
  OperationalMemoryIngestionInput,
  OperationalMemoryIngestionResult,
  OperationalMemoryRecord,
  OperationalMemoryScope,
  OperationalTimeline,
} from "./runtime-memory-types";
import { ingestOperationalMemory, persistOperationalSignal } from "./runtime-memory-ingestion";
import {
  retrieveOperationalContinuity,
  retrieveOperationalPressure,
  retrieveInterventionLineage,
  type OperationalRetrievalInput,
  type OperationalRetrievalItem,
  type OperationalRetrievalResult,
} from "./runtime-memory-retrieval";
import {
  reconstructOperationalTimeline,
  buildOperationalCausalityChains,
  detectContinuityGaps,
} from "./runtime-memory-continuity";
import { loadOperationalMemoryRecords } from "./runtime-memory-persistence";
import { generateContinuityDiagnosticsReport } from "./runtime-memory-diagnostics";

export async function ingestOperationalMemoryRecord(
  input: OperationalMemoryIngestionInput,
): Promise<OperationalMemoryIngestionResult> {
  return ingestOperationalMemory(input);
}

export async function retrieveOperationalContinuityContext(
  input: OperationalRetrievalInput,
): Promise<OperationalRetrievalResult> {
  return retrieveOperationalContinuity(input);
}

export async function persistOperationalSignalRecord(
  content: string,
  scope: OperationalMemoryScope,
  source: OperationalMemoryIngestionInput["source"],
  context?: OperationalMemoryIngestionInput["context"],
): Promise<OperationalMemoryIngestionResult> {
  return persistOperationalSignal(content, scope, source, context);
}

export async function retrieveOperationalPressureSignals(
  scope: OperationalMemoryScope,
  limit?: number,
): Promise<OperationalRetrievalItem[]> {
  return retrieveOperationalPressure(scope, limit);
}

export async function reconstructOperationalTimelineContext(
  scope: OperationalMemoryScope,
  options?: { limit?: number; now?: string },
): Promise<OperationalTimeline> {
  return reconstructOperationalTimeline(scope, options);
}

export async function retrieveInterventionLineageContext(
  scope: OperationalMemoryScope,
  memoryRecordId: string,
): Promise<{
  record: OperationalMemoryRecord | null;
  interventions: OperationalInterventionRecord[];
  unresolvedCount: number;
  failedCount: number;
}> {
  return retrieveInterventionLineage(scope, memoryRecordId);
}

export async function getOperationalCausalityChains(
  scope: OperationalMemoryScope,
): Promise<OperationalCausalityChain[]> {
  return buildOperationalCausalityChains(scope);
}

export async function generateOperationalDiagnostics(scope: OperationalMemoryScope): Promise<
  ReturnType<typeof generateContinuityDiagnosticsReport>
> {
  const [records, continuityResult] = await Promise.all([
    loadOperationalMemoryRecords(scope, { limit: 64 }),
    retrieveOperationalContinuity({ scope, limit: 24, includeInterventions: true }),
  ]);

  const gaps = detectContinuityGaps(records, Date.now());
  return generateContinuityDiagnosticsReport(scope, continuityResult.items, records, gaps);
}
