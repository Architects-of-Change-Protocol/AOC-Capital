import type { OperationalMemoryRecord, OperationalMemoryScope } from "./runtime-memory-types";
import type { OperationalRetrievalItem } from "./runtime-memory-retrieval";
import type { ContinuityGap } from "./runtime-memory-continuity";

export type RetrievalDiagnostic = {
  recordId: string;
  recordType: string;
  retrievalScore: number;
  retrievalBasis: string[];
  pressureWeightExplanation: string;
  priorityReason: string;
};

export type LineageDiagnostic = {
  recordId: string;
  lineageDepth: number;
  ancestorIds: string[];
  causalityExplanation: string;
  unresolvedAncestors: number;
};

export type PressureDiagnostic = {
  recordId: string;
  ageDays: number;
  initialWeight: number;
  computedWeight: number;
  pressureIncrease: number;
  pressureExplanation: string;
};

export type ContinuityGapDiagnostic = {
  gap: ContinuityGap;
  explanation: string;
  recommendedAction: string;
};

export function diagnoseRetrievalItem(item: OperationalRetrievalItem): RetrievalDiagnostic {
  const topBasis = item.retrievalBasis.slice(0, 3).join(", ");
  const pressureNote =
    item.computedPressureWeight > 0.8
      ? `high pressure (${item.computedPressureWeight.toFixed(2)}) — item has been unresolved for ${Math.round(item.agedays)} days`
      : `moderate pressure (${item.computedPressureWeight.toFixed(2)})`;

  const priorityReason =
    item.record.resolutionStatus === "escalated"
      ? "escalated — highest operational priority class"
      : item.record.resolutionStatus === "unresolved" && item.agedays > 7
        ? `chronically unresolved for ${Math.round(item.agedays)} days — pressure accumulated`
        : item.record.recordType === "blocker"
          ? "active blocker on operational critical path"
          : "operational continuity relevance";

  void topBasis;
  return {
    recordId: item.record.id,
    recordType: item.record.recordType,
    retrievalScore: item.retrievalScore,
    retrievalBasis: item.retrievalBasis,
    pressureWeightExplanation: pressureNote,
    priorityReason,
  };
}

export function diagnoseLineage(
  record: OperationalMemoryRecord,
  allRecords: OperationalMemoryRecord[],
): LineageDiagnostic {
  const ancestors: OperationalMemoryRecord[] = [];
  const visited = new Set<string>();
  let current: OperationalMemoryRecord | undefined = record;

  while (current?.parentRecordId) {
    if (visited.has(current.parentRecordId)) break;
    visited.add(current.parentRecordId);
    const parent = allRecords.find((r) => r.id === current!.parentRecordId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  const unresolvedAncestors = ancestors.filter((a) => a.resolutionStatus !== "resolved").length;

  const causalityExplanation =
    ancestors.length === 0
      ? "Root record — no causal ancestry. This is an originating operational signal."
      : `Descended from ${ancestors.length} ancestor record(s). ${unresolvedAncestors > 0 ? `${unresolvedAncestors} ancestor(s) remain unresolved — continued pressure expected.` : "All ancestors resolved."}`;

  return {
    recordId: record.id,
    lineageDepth: ancestors.length,
    ancestorIds: ancestors.map((a) => a.id),
    causalityExplanation,
    unresolvedAncestors,
  };
}

export function diagnosePressureWeighting(
  record: OperationalMemoryRecord,
  ageDays: number,
  computedWeight: number,
): PressureDiagnostic {
  const initialWeight = record.weights.unresolvedWeight;
  const pressureIncrease = computedWeight - initialWeight;

  const pressureExplanation =
    record.resolutionStatus === "resolved"
      ? "Resolved — pressure weight suppressed to minimum."
      : pressureIncrease > 0
        ? `Unresolved for ${Math.round(ageDays)} days; pressure weight increased by ${pressureIncrease.toFixed(3)} (3% per day rate for unresolved items).`
        : `Recently ingested; pressure weight at initial level (${initialWeight.toFixed(2)}).`;

  return {
    recordId: record.id,
    ageDays,
    initialWeight,
    computedWeight,
    pressureIncrease,
    pressureExplanation,
  };
}

const GAP_RECOMMENDED_ACTIONS: Record<ContinuityGap["type"], string> = {
  missing_resolution: "Assign an owner and set a resolution deadline. Escalate if unowned for more than 48 hours.",
  abandoned_intervention: "Review why the intervention was abandoned and decide whether to re-attempt or formally close.",
  stale_escalation: "Re-engage the escalation path. Confirm the escalation receiver acknowledged the issue.",
  silent_stakeholder: "Re-initiate contact. Document the last known communication date.",
  unresolved_dependency: "Confirm dependency status with the owning team. If blocked externally, escalate.",
};

export function diagnoseContinuityGap(gap: ContinuityGap): ContinuityGapDiagnostic {
  return {
    gap,
    explanation: `Continuity gap detected: ${gap.description}. This gap has been open for ${Math.round(gap.ageDays)} days.`,
    recommendedAction: GAP_RECOMMENDED_ACTIONS[gap.type] ?? "Review and resolve this operational gap.",
  };
}

export function generateContinuityDiagnosticsReport(
  scope: OperationalMemoryScope,
  retrievalItems: OperationalRetrievalItem[],
  allRecords: OperationalMemoryRecord[],
  gaps: ContinuityGap[],
): {
  scope: OperationalMemoryScope;
  totalRecords: number;
  retrievedCount: number;
  gapCount: number;
  retrievalDiagnostics: RetrievalDiagnostic[];
  lineageDiagnostics: LineageDiagnostic[];
  pressureDiagnostics: PressureDiagnostic[];
  gapDiagnostics: ContinuityGapDiagnostic[];
  reportGeneratedAt: string;
} {
  return {
    scope,
    totalRecords: allRecords.length,
    retrievedCount: retrievalItems.length,
    gapCount: gaps.length,
    retrievalDiagnostics: retrievalItems.map(diagnoseRetrievalItem),
    lineageDiagnostics: retrievalItems.map((i) => diagnoseLineage(i.record, allRecords)),
    pressureDiagnostics: retrievalItems.map((i) =>
      diagnosePressureWeighting(i.record, i.agedays, i.computedPressureWeight),
    ),
    gapDiagnostics: gaps.map(diagnoseContinuityGap),
    reportGeneratedAt: new Date().toISOString(),
  };
}
