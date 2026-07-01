import type { OperationalContinuityContext, OperationalContinuityRequest, OperationalContinuityResult, ContinuityRetrievalCandidate } from "./continuity-retrieval-types";
import { computeContinuityWeight } from "./continuity-retrieval-weighting";
import { buildContinuityLineage } from "./continuity-retrieval-lineage";
import { buildContinuityTimeline } from "./continuity-retrieval-timeline";
import { summarizeStakeholderContinuity } from "./continuity-retrieval-stakeholders";
import { summarizeInterventionContinuity } from "./continuity-retrieval-interventions";
import { summarizeAtmosphere } from "./continuity-retrieval-atmosphere";
import { summarizePressure } from "./continuity-retrieval-pressure";
import { buildContinuityDiagnostics } from "./continuity-retrieval-diagnostics";
import { suppressContinuityNoise } from "./continuity-retrieval-noise-control";

export function prioritizeContinuity(context: OperationalContinuityContext): ContinuityRetrievalCandidate[] {
  const recurrences = new Map<string, number>();
  for (const r of context.records) recurrences.set(`${r.recordType}:${r.summary.toLowerCase()}`, (recurrences.get(`${r.recordType}:${r.summary.toLowerCase()}`) ?? 0) + 1);
  const candidates: ContinuityRetrievalCandidate[] = context.records.map((record) => {
    const unresolvedAgeDays = Math.max(0, (context.nowMs - Date.parse(record.firstObservedAt)) / 86400000);
    const recurrenceCount = recurrences.get(`${record.recordType}:${record.summary.toLowerCase()}`) ?? 1;
    const score = computeContinuityWeight(record, unresolvedAgeDays, recurrenceCount);
    return { record, unresolvedAgeDays, recurrenceCount, duplicateCount: Math.max(0, recurrenceCount - 1), score, priority: score >= 48 ? "highest" : score >= 28 ? "medium" : "lower", reasons: [{ code: "weighted_continuity", detail: `record scored ${score.toFixed(2)} from unresolved pressure and recurrence`, weight: score }] };
  });
  return suppressContinuityNoise(candidates).sort((a,b)=>b.score-a.score || Date.parse(b.record.lastObservedAt)-Date.parse(a.record.lastObservedAt));
}

export function buildOperationalContinuityResult(request: OperationalContinuityRequest, context: OperationalContinuityContext): OperationalContinuityResult {
  const prioritizedOperationalRecords = prioritizeContinuity(context).slice(0, request.limit ?? 24);
  const pressure = summarizePressure(prioritizedOperationalRecords);
  const lineage = buildContinuityLineage(prioritizedOperationalRecords);
  const timeline = buildContinuityTimeline(prioritizedOperationalRecords);
  const interventionContinuity = summarizeInterventionContinuity(context.interventions);
  const stakeholderContinuity = summarizeStakeholderContinuity(prioritizedOperationalRecords, context.interventions);
  const atmosphere = summarizeAtmosphere(prioritizedOperationalRecords, pressure, interventionContinuity);
  const riskClusters = [{ clusterId: "unresolved-chain", label: "Unresolved Continuity Chain", recordIds: prioritizedOperationalRecords.filter((r)=>r.priority==="highest").map((r)=>r.record.id), pressureScore: atmosphere.pressureAccumulation }];
  const continuityGaps = prioritizedOperationalRecords.filter((r)=>r.record.resolutionStatus==="unresolved" && r.unresolvedAgeDays > 21).map((r)=>`Unresolved continuity exceeding 21 days: ${r.record.summary}`);
  const diagnostics = buildContinuityDiagnostics(prioritizedOperationalRecords, atmosphere);
  return { prioritizedOperationalRecords, unresolvedPressure: pressure, atmosphere, stakeholderContinuity, interventionContinuity, timeline, lineage, riskClusters, continuityGaps, degradationIndicators: atmosphere.degradationIndicators, diagnostics };
}
