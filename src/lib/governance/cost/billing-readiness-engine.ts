import type { BillingReadinessSignal, CostGovernanceSeverity } from "./cost-governance-types";

export interface BillingReadinessInput {
  milestoneCompletion: number;
  acceptanceDependenciesCleared: number;
  documentationCompleteness: number;
  invoiceGatingBlockers: number;
  budgetWindowDaysRemaining: number;
  collectionDelayDays: number;
}

const sevByReadiness = (readiness: number): CostGovernanceSeverity => {
  if (readiness >= 80) return "healthy";
  if (readiness >= 60) return "watch";
  if (readiness >= 35) return "elevated";
  return "critical";
};

export function evaluateBillingReadiness(input: BillingReadinessInput): BillingReadinessSignal {
  const blockerPenalty = Math.min(40, input.invoiceGatingBlockers * 10);
  const budgetWindowPenalty = input.budgetWindowDaysRemaining < 15 ? (15 - input.budgetWindowDaysRemaining) * 1.6 : 0;
  const collectionPenalty = Math.min(20, input.collectionDelayDays * 0.7);

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(input.milestoneCompletion * 0.35 + input.acceptanceDependenciesCleared * 0.25 + input.documentationCompleteness * 0.25 - blockerPenalty - budgetWindowPenalty - collectionPenalty + 15),
    ),
  );

  const revenueTrappedDetected = input.milestoneCompletion >= 70 && input.acceptanceDependenciesCleared < 60;
  const budgetWindowRiskDetected = input.budgetWindowDaysRemaining < 15;
  const delayedInvoicingExposureDetected = input.invoiceGatingBlockers > 0 || input.documentationCompleteness < 75;
  const collectionTimingDegradationDetected = input.collectionDelayDays > 14;

  return {
    milestoneCompletion: input.milestoneCompletion,
    acceptanceDependencyClearance: input.acceptanceDependenciesCleared,
    documentationCompleteness: input.documentationCompleteness,
    invoiceGateBlockers: input.invoiceGatingBlockers,
    revenueTrappedDetected,
    budgetWindowRiskDetected,
    delayedInvoicingExposureDetected,
    collectionTimingDegradationDetected,
    severity: sevByReadiness(readinessScore),
    readinessScore,
  };
}
