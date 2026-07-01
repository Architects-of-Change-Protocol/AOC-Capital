import type {
  OperationalCausalityChain,
  OperationalMemoryRecord,
  OperationalMemoryScope,
  OperationalTimeline,
  OperationalTimelineEvent,
} from "./runtime-memory-types";
import { loadOperationalMemoryRecords, loadOperationalInterventionRecords } from "./runtime-memory-persistence";
import { buildCausalityChain } from "./runtime-memory-lineage";

export type ContinuityGap = {
  type:
    | "missing_resolution"
    | "abandoned_intervention"
    | "stale_escalation"
    | "silent_stakeholder"
    | "unresolved_dependency";
  description: string;
  relatedRecordId: string;
  ageDays: number;
};

export function detectContinuityGaps(
  records: OperationalMemoryRecord[],
  nowMs: number,
): ContinuityGap[] {
  const gaps: ContinuityGap[] = [];

  for (const record of records) {
    const ageDays = Math.max(0, (nowMs - Date.parse(record.firstObservedAt)) / 86400000);

    if (record.resolutionStatus === "unresolved" && ageDays > 7 && record.recordType === "blocker") {
      gaps.push({
        type: "missing_resolution",
        description: `Blocker unresolved for ${Math.round(ageDays)} days: ${record.summary.slice(0, 100)}`,
        relatedRecordId: record.id,
        ageDays,
      });
    }

    if (record.resolutionStatus === "escalated" && ageDays > 3) {
      gaps.push({
        type: "stale_escalation",
        description: `Escalation unresolved for ${Math.round(ageDays)} days: ${record.summary.slice(0, 100)}`,
        relatedRecordId: record.id,
        ageDays,
      });
    }

    if (
      record.recordType === "stakeholder_signal" &&
      record.resolutionStatus === "unresolved" &&
      ageDays > 5
    ) {
      gaps.push({
        type: "silent_stakeholder",
        description: `Stakeholder signal unresolved for ${Math.round(ageDays)} days: ${record.summary.slice(0, 100)}`,
        relatedRecordId: record.id,
        ageDays,
      });
    }

    if (record.recordType === "dependency" && record.resolutionStatus === "unresolved" && ageDays > 5) {
      gaps.push({
        type: "unresolved_dependency",
        description: `Dependency unresolved for ${Math.round(ageDays)} days: ${record.summary.slice(0, 100)}`,
        relatedRecordId: record.id,
        ageDays,
      });
    }
  }

  return gaps.sort((a, b) => b.ageDays - a.ageDays);
}

export function computeContinuityScore(records: OperationalMemoryRecord[]): number {
  if (!records.length) return 0;
  const resolvedCount = records.filter((r) => r.resolutionStatus === "resolved").length;
  const unresolvedCritical = records.filter(
    (r) =>
      r.resolutionStatus === "unresolved" &&
      (r.recordType === "blocker" || r.recordType === "escalation"),
  ).length;
  const base = resolvedCount / records.length;
  const criticalPenalty = Math.min(0.5, unresolvedCritical * 0.15);
  return Math.max(0, Math.min(1, base - criticalPenalty));
}

export async function reconstructOperationalTimeline(
  scope: OperationalMemoryScope,
  options?: { limit?: number; now?: string },
): Promise<OperationalTimeline> {
  const now = options?.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const limit = Math.min(options?.limit ?? 40, 80);

  const records = await loadOperationalMemoryRecords(scope, { limit: limit * 2 });
  const events: OperationalTimelineEvent[] = [];

  for (const record of records) {
    const interventions = await loadOperationalInterventionRecords(record.id, scope.companyId);
    events.push({
      eventId: record.id,
      eventType: record.recordType,
      summary: record.summary,
      timestamp: record.firstObservedAt,
      scope: record.scope,
      parentEventId: record.parentRecordId,
      lineageType: record.lineageType,
      resolutionStatus: record.resolutionStatus,
      interventions,
      weights: record.weights,
    });
  }

  events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const gaps = detectContinuityGaps(records, nowMs);

  return {
    scope,
    events: events.slice(0, limit),
    unresolvedCount: records.filter(
      (r) => r.resolutionStatus === "unresolved" || r.resolutionStatus === "escalated",
    ).length,
    resolvedCount: records.filter((r) => r.resolutionStatus === "resolved").length,
    activeBlockers: records
      .filter((r) => r.recordType === "blocker" && r.resolutionStatus !== "resolved")
      .map((r) => r.summary)
      .slice(0, 5),
    activeEscalations: records
      .filter((r) => r.recordType === "escalation" && r.resolutionStatus !== "resolved")
      .map((r) => r.summary)
      .slice(0, 5),
    pendingCommitments: records
      .filter((r) => r.recordType === "commitment" && r.resolutionStatus === "unresolved")
      .map((r) => r.summary)
      .slice(0, 5),
    continuityGaps: gaps.map((g) => g.description).slice(0, 6),
    reconstructedAt: now,
  };
}

export async function buildOperationalCausalityChains(
  scope: OperationalMemoryScope,
): Promise<OperationalCausalityChain[]> {
  const records = await loadOperationalMemoryRecords(scope, { limit: 64 });
  const roots = records.filter((r) => r.parentRecordId === null);
  return roots.map((root) => buildCausalityChain(root, records));
}
