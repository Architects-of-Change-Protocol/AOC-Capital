import type { BudgetSnapshot, CostBaseline, CostGovernanceSeverity, ForecastSignal } from "./cost-governance-types";

export function severityFromForecastConfidence(score: number): CostGovernanceSeverity {
  if (score >= 85) return "healthy";
  if (score >= 65) return "watch";
  if (score >= 40) return "elevated";
  return "critical";
}

export function evaluateForecastConfidence(baseline: CostBaseline, snapshot: BudgetSnapshot): ForecastSignal {
  const budgetCeiling = baseline.approvedBudget + baseline.approvedContingency + baseline.authorizedChangeBudget;
  const estimateAtCompletion = snapshot.projectedTotalSpend;

  const budgetFitPenalty = Math.max(0, ((estimateAtCompletion - budgetCeiling) / Math.max(1, budgetCeiling)) * 100);
  const executionVariancePenalty = Math.min(30, Math.abs(snapshot.historicalExecutionVariance) * 1.5);
  const remainingWorkPenalty = Math.max(0, (100 - snapshot.remainingWorkConfidence) * 0.35);

  const forecastConfidenceScore = Math.max(0, Math.min(100, Math.round(100 - budgetFitPenalty * 0.8 - executionVariancePenalty - remainingWorkPenalty)));
  const severity = severityFromForecastConfidence(forecastConfidenceScore);

  return {
    forecastConfidenceScore,
    severity,
    estimateAtCompletion,
    completionConfidence: snapshot.remainingWorkConfidence,
  };
}
