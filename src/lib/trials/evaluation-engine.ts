import type { TrialEvaluation, TrialScenario, TrialScenarioCategory } from "@/lib/trials/trial-model";

export type TrialMetrics = {
  totalTrials: number;
  averageUsefulness: number;
  averageTrust: number;
  averageEscalationAccuracy: number;
  averagePrioritization: number;
  averageFraming: number;
};

export function computeTrialMetrics(evaluations: TrialEvaluation[]): TrialMetrics {
  if (!evaluations.length) return { totalTrials: 0, averageUsefulness: 0, averageTrust: 0, averageEscalationAccuracy: 0, averagePrioritization: 0, averageFraming: 0 };
  const sum = evaluations.reduce((acc, item) => ({ usefulness: acc.usefulness + item.usefulnessScore, trust: acc.trust + item.trustScore, escalation: acc.escalation + item.escalationJudgmentScore, prioritization: acc.prioritization + item.prioritizationScore, framing: acc.framing + item.framingScore }), { usefulness: 0, trust: 0, escalation: 0, prioritization: 0, framing: 0 });
  const n = evaluations.length;
  return { totalTrials: n, averageUsefulness: sum.usefulness / n, averageTrust: sum.trust / n, averageEscalationAccuracy: sum.escalation / n, averagePrioritization: sum.prioritization / n, averageFraming: sum.framing / n };
}

export function computeCategoryStrengths(evaluations: TrialEvaluation[], scenarios: TrialScenario[]): { strongestCategories: TrialScenarioCategory[]; weakestCategories: TrialScenarioCategory[] } {
  const map = new Map<string, { total: number; count: number }>();
  for (const ev of evaluations) {
    const scenario = scenarios.find((s) => s.id === ev.scenarioId);
    if (!scenario) continue;
    const avg = (ev.usefulnessScore + ev.prioritizationScore + ev.escalationJudgmentScore + ev.framingScore + ev.trustScore) / 5;
    const current = map.get(scenario.category) ?? { total: 0, count: 0 };
    map.set(scenario.category, { total: current.total + avg, count: current.count + 1 });
  }
  const ranked = [...map.entries()].map(([category, values]) => ({ category: category as TrialScenarioCategory, score: values.total / values.count })).sort((a, b) => b.score - a.score);
  return { strongestCategories: ranked.slice(0, 3).map((r) => r.category), weakestCategories: ranked.slice(-3).map((r) => r.category) };
}
