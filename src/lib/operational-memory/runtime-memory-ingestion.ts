import crypto from "node:crypto";
import type {
  OperationalIngestionSource,
  OperationalLineageType,
  OperationalMemoryIngestionInput,
  OperationalMemoryIngestionResult,
  OperationalMemoryRecord,
  OperationalMemoryRecordType,
  OperationalMemoryScope,
  OperationalMemoryWeights,
} from "./runtime-memory-types";
import { extractOperationalSignals, signalToRecordType, computeSignalWeights } from "./runtime-memory-signals";
import { persistOperationalMemoryRecord } from "./runtime-memory-persistence";
import { validateOperationalScope } from "./runtime-memory-scoping";

const MIN_INGESTION_TEXT = 16;

function buildMemoryRecord(
  id: string,
  recordType: OperationalMemoryRecordType,
  summary: string,
  scope: OperationalMemoryScope,
  source: OperationalIngestionSource,
  confidence: number,
  weights: OperationalMemoryWeights,
  opts: {
    parentRecordId?: string | null;
    lineageType?: OperationalLineageType | null;
    sourceRef?: string | null;
    detail?: string | null;
  } = {},
): OperationalMemoryRecord {
  const now = new Date().toISOString();
  return {
    id,
    recordType,
    summary: summary.slice(0, 400),
    detail: opts.detail?.slice(0, 1000) ?? null,
    scope,
    parentRecordId: opts.parentRecordId ?? null,
    lineageType: opts.lineageType ?? null,
    resolutionStatus: "unresolved",
    weights,
    confidence,
    ingestionSource: source,
    sourceRef: opts.sourceRef ?? null,
    nutrientIds: [],
    interventionCount: 0,
    firstObservedAt: now,
    lastObservedAt: now,
    resolvedAt: null,
    createdAt: now,
  };
}

export async function ingestOperationalMemory(
  input: OperationalMemoryIngestionInput,
): Promise<OperationalMemoryIngestionResult> {
  const scopeViolation = validateOperationalScope(input.scope);
  if (scopeViolation) {
    return {
      status: "skipped",
      reason: `scope_violation:${scopeViolation.type}`,
      recordsCreated: 0,
      signalCount: 0,
      memoryRecordIds: [],
    };
  }

  const text = input.content.trim();
  if (text.length < MIN_INGESTION_TEXT) {
    return { status: "skipped", reason: "content_too_short", recordsCreated: 0, signalCount: 0, memoryRecordIds: [] };
  }

  const now = new Date().toISOString();
  const sourceRef = input.context?.sourceRef ?? `${input.source}:${input.scope.companyId}:${now}`;

  const signals = extractOperationalSignals(text, {
    sourceRef,
    timestamp: now,
    lineageMemoryRecordId: input.context?.parentMemoryRecordId ?? null,
  });

  if (!signals.length) {
    return { status: "skipped", reason: "no_operational_signals", recordsCreated: 0, signalCount: 0, memoryRecordIds: [] };
  }

  const memoryRecordIds: string[] = [];
  let persistenceFailed = false;

  for (const signal of signals) {
    const recordId = crypto.randomUUID();
    const weights = computeSignalWeights(signal);
    const recordType = signalToRecordType(signal);
    const record = buildMemoryRecord(
      recordId,
      recordType,
      signal.summary,
      input.scope,
      input.source,
      signal.confidence,
      weights,
      {
        parentRecordId: input.context?.parentMemoryRecordId ?? null,
        lineageType: input.context?.lineageType ?? null,
        sourceRef,
      },
    );

    const result = await persistOperationalMemoryRecord(record);
    if (result.status === "persisted") {
      memoryRecordIds.push(recordId);
    } else {
      persistenceFailed = true;
    }
  }

  if (persistenceFailed && !memoryRecordIds.length) {
    return {
      status: "failed",
      reason: "persistence_failure",
      recordsCreated: 0,
      signalCount: signals.length,
      memoryRecordIds: [],
    };
  }

  return {
    status: "ingested",
    recordsCreated: memoryRecordIds.length,
    signalCount: signals.length,
    memoryRecordIds,
  };
}

export async function persistOperationalSignal(
  content: string,
  scope: OperationalMemoryScope,
  source: OperationalIngestionSource,
  context?: OperationalMemoryIngestionInput["context"],
): Promise<OperationalMemoryIngestionResult> {
  return ingestOperationalMemory({ scope, source, content, context });
}
