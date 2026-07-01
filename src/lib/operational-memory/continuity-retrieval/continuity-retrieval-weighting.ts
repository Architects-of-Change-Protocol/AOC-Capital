import type { OperationalMemoryRecord } from "../runtime-memory-types";
export const continuityWeights = { unresolvedWeight: 20, continuityWeight: 16, pressureWeight: 14, escalationWeight: 14, recurrenceWeight: 10, stakeholderImportanceWeight: 10, interventionFailureWeight: 13, deliveryImpactWeight: 12, timelineUrgencyWeight: 12, atmosphereImpactWeight: 12, governanceRiskWeight: 11 };
export function computeContinuityWeight(record: OperationalMemoryRecord, unresolvedAgeDays: number, recurrenceCount: number): number {
  const unresolved = record.resolutionStatus === "unresolved" || record.resolutionStatus === "escalated";
  const unresolvedScore = unresolved ? continuityWeights.unresolvedWeight + Math.min(20, unresolvedAgeDays * 0.8) : 0;
  const escalationScore = record.recordType === "escalation" ? continuityWeights.escalationWeight + recurrenceCount * 1.5 : 0;
  const governanceScore = record.recordType === "governance_gap" ? continuityWeights.governanceRiskWeight : 0;
  const deliveryScore = ["blocker","dependency","delivery_pressure","timeline_signal"].includes(record.recordType) ? continuityWeights.deliveryImpactWeight : 0;
  return unresolvedScore + escalationScore + governanceScore + deliveryScore + Math.min(continuityWeights.recurrenceWeight, recurrenceCount * 2);
}
