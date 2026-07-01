import type { BaselineDriftSignal, BudgetSnapshot, CostBaseline, CostGovernanceSeverity } from "./cost-governance-types";

const severityFromDrift = (drift: number): CostGovernanceSeverity => {
  if (drift < 5) return "healthy";
  if (drift < 12) return "watch";
  if (drift < 20) return "elevated";
  return "critical";
};

export function evaluateCostBaselineDrift(baseline: CostBaseline, snapshot: BudgetSnapshot): BaselineDriftSignal {
  const effectiveBudget = Math.max(1, baseline.approvedBudget + baseline.approvedContingency + baseline.authorizedChangeBudget);
  const actualDrift = ((snapshot.actualSpendToDate - baseline.plannedSpendToDate) / effectiveBudget) * 100;
  const projectedDrift = ((snapshot.projectedTotalSpend - effectiveBudget) / effectiveBudget) * 100;
  const unauthorizedDrift = (snapshot.unauthorizedExpansionAmount / effectiveBudget) * 100;
  const scopeCostDivergence = Math.max(0, (snapshot.costConsumptionRatio - snapshot.scopeCompletionRatio) * 100);

  const driftPercentage = Number((actualDrift * 0.35 + projectedDrift * 0.4 + unauthorizedDrift * 0.15 + scopeCostDivergence * 0.1).toFixed(2));
  const driftDirection = driftPercentage > 1 ? "over" : driftPercentage < -1 ? "under" : "on_track";
  const severity = severityFromDrift(Math.abs(driftPercentage));
  const confidence = Math.max(50, Math.min(100, 100 - Math.round(Math.abs(projectedDrift - actualDrift) * 1.5)));

  const notes: string[] = [];
  if (snapshot.actualSpendToDate > baseline.plannedSpendToDate) notes.push("Actual spend exceeds planned spend baseline.");
  if (snapshot.projectedTotalSpend > effectiveBudget) notes.push("Projected spend exceeds approved baseline envelope.");
  if (snapshot.unauthorizedExpansionAmount > 0) notes.push("Unauthorized financial expansion detected.");
  if (scopeCostDivergence > 8) notes.push("Scope-cost divergence indicates hidden coupling risk.");

  return { driftPercentage, driftDirection, severity, confidence, notes };
}
