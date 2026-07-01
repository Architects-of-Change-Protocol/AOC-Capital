import { evaluateBillingReadiness, type BillingReadinessInput } from "./billing-readiness-engine";
import { analyzeBurnRate } from "./burn-rate-analyzer";
import { evaluateCostBaselineDrift } from "./cost-baseline-evaluator";
import { prioritizeCostInterventions } from "./cost-intervention-prioritizer";
import { evaluateForecastConfidence } from "./forecast-confidence-engine";
import { evaluateProcurementRisk, type ProcurementRiskInput } from "./procurement-risk-evaluator";
import type { BudgetSnapshot, CostBaseline, CostGovernanceAssessment, CostGovernanceSeverity } from "./cost-governance-types";

const severityRank: Record<CostGovernanceSeverity, number> = { healthy: 0, watch: 1, elevated: 2, critical: 3 };

const maxSeverity = (values: CostGovernanceSeverity[]): CostGovernanceSeverity =>
  values.reduce((acc, value) => (severityRank[value] > severityRank[acc] ? value : acc), "healthy");

export function createCostGovernanceAssessment(input: {
  baseline: CostBaseline;
  snapshot: BudgetSnapshot;
  procurement: ProcurementRiskInput;
  billing: BillingReadinessInput;
}): CostGovernanceAssessment {
  const baseline = evaluateCostBaselineDrift(input.baseline, input.snapshot);
  const burnRate = analyzeBurnRate(input.snapshot);
  const forecast = evaluateForecastConfidence(input.baseline, input.snapshot);
  const procurement = evaluateProcurementRisk(input.procurement);
  const billingReadiness = evaluateBillingReadiness(input.billing);

  const overallSeverity = maxSeverity([baseline.severity, burnRate.severity, forecast.severity, procurement.severity, billingReadiness.severity]);
  const interventionQueue = prioritizeCostInterventions({ baseline, burnRate, forecast, procurement, billingReadiness });

  const financialHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          Math.abs(baseline.driftPercentage) * 1.2 -
          Math.abs(burnRate.varianceVelocity) * 3.5 -
          (100 - forecast.forecastConfidenceScore) * 0.3 -
          procurement.riskScore * 0.2 -
          (100 - billingReadiness.readinessScore) * 0.25,
      ),
    ),
  );

  const executiveSummary = `Cost posture is ${overallSeverity}. Baseline drift ${baseline.driftPercentage.toFixed(1)}%, forecast confidence ${forecast.forecastConfidenceScore}, procurement risk ${procurement.riskScore}, billing readiness ${billingReadiness.readinessScore}.`;

  return {
    baseline,
    burnRate,
    forecast,
    procurement,
    billingReadiness,
    overallSeverity,
    interventionQueue,
    executiveSummary,
    financialHealthScore,
  };
}
