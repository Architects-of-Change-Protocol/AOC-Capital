import { computeCategoryStrengths, computeTrialMetrics, type TrialMetrics } from "@/lib/trials/evaluation-engine";
import type { TrialEvaluation, TrialScenario } from "@/lib/trials/trial-model";

export type TrialStore = {
  scenarios: TrialScenario[];
  evaluations: TrialEvaluation[];
  metricsHistory: Array<{ at: number; metrics: TrialMetrics }>;
};

const memoryStore = new Map<string, TrialStore>();

export function loadTrialStore(tenantId: string): TrialStore {
  return memoryStore.get(tenantId) ?? { scenarios: [], evaluations: [], metricsHistory: [] };
}

export function saveTrialStore(tenantId: string, next: TrialStore): TrialStore {
  memoryStore.set(tenantId, next);
  return next;
}

export function upsertScenario(tenantId: string, scenario: TrialScenario) {
  const current = loadTrialStore(tenantId);
  const without = current.scenarios.filter((s) => s.id !== scenario.id);
  return saveTrialStore(tenantId, { ...current, scenarios: [...without, scenario] });
}

export function persistEvaluation(tenantId: string, evaluation: TrialEvaluation) {
  const current = loadTrialStore(tenantId);
  const evaluations = [...current.evaluations.filter((item) => item.scenarioId !== evaluation.scenarioId), evaluation];
  const metrics = computeTrialMetrics(evaluations);
  const categories = computeCategoryStrengths(evaluations, current.scenarios);
  return saveTrialStore(tenantId, { ...current, evaluations, metricsHistory: [...current.metricsHistory, { at: Date.now(), metrics: { ...metrics, ...categories } as TrialMetrics }] });
}
