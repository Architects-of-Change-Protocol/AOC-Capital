import type { OperationalMemoryRecord } from "@/lib/operational-memory";
import type { TrendSeverity } from "@/lib/trend-analysis";

export type OperationalDelta = {
  domain: OperationalMemoryRecord["domain"];
  previousConfidence: number;
  currentConfidence: number;
  previousCompletion: number;
  currentCompletion: number;
  confidenceDelta: number;
  completionDelta: number;
  missingDataDelta: number;
  severity: TrendSeverity;
  changedAt: string;
};

const severityFromDelta = (delta: number): TrendSeverity => {
  const magnitude = Math.abs(delta);
  if (magnitude >= 20) return "critical";
  if (magnitude >= 13) return "high";
  if (magnitude >= 8) return "medium";
  if (magnitude >= 4) return "low";
  return "info";
};

export function buildOperationalDeltas(records: OperationalMemoryRecord[]): OperationalDelta[] {
  const byDomain = new Map<OperationalMemoryRecord["domain"], OperationalMemoryRecord[]>();
  for (const record of records) {
    const bucket = byDomain.get(record.domain) ?? [];
    bucket.push(record);
    byDomain.set(record.domain, bucket);
  }

  return [...byDomain.entries()].flatMap(([domain, entries]) => {
    const sorted = [...entries].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
    if (sorted.length < 2) return [];
    const previous = sorted[sorted.length - 2];
    const current = sorted[sorted.length - 1];
    const confidenceDelta = current.confidenceScore - previous.confidenceScore;
    const completionDelta = current.completionScore - previous.completionScore;
    const missingDataDelta = current.missingFields.length - previous.missingFields.length;

    return [{
      domain,
      previousConfidence: previous.confidenceScore,
      currentConfidence: current.confidenceScore,
      previousCompletion: previous.completionScore,
      currentCompletion: current.completionScore,
      confidenceDelta,
      completionDelta,
      missingDataDelta,
      severity: severityFromDelta(Math.min(confidenceDelta, completionDelta)),
      changedAt: current.updatedAt,
    }];
  });
}
