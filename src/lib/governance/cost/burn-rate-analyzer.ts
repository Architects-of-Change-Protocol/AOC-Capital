import type { BudgetSnapshot, BurnRateSignal, CostGovernanceSeverity } from "./cost-governance-types";

const burnSeverity = (varianceVelocity: number, acceleration: number, unstable: boolean): CostGovernanceSeverity => {
  const score = Math.abs(varianceVelocity) * 0.6 + Math.abs(acceleration) * 0.4 + (unstable ? 8 : 0);
  if (score < 6) return "healthy";
  if (score < 14) return "watch";
  if (score < 24) return "elevated";
  return "critical";
};

export function analyzeBurnRate(snapshot: BudgetSnapshot): BurnRateSignal {
  const plannedBurn = snapshot.plannedBurnRatePerDay;
  const actualBurn = snapshot.actualBurnRatePerDay;
  const varianceVelocity = Number((actualBurn - plannedBurn).toFixed(3));
  const previousVariance = snapshot.previousBurnVariance ?? 0;
  const burnAcceleration = Number((varianceVelocity - previousVariance).toFixed(3));

  const history = snapshot.burnVarianceHistory ?? [varianceVelocity];
  const unstableExpenditurePatternDetected = history.length >= 4 && history.some((v, i) => i > 0 && Math.sign(v) !== Math.sign(history[i - 1]));
  const overspendAccelerationDetected = varianceVelocity > 0 && burnAcceleration > 0.25;
  const delayedSpendMaskingDetected = varianceVelocity < -0.25 && snapshot.percentComplete < snapshot.costConsumptionRatio * 100;

  const severity = burnSeverity(varianceVelocity, burnAcceleration, unstableExpenditurePatternDetected);

  return {
    plannedBurn,
    actualBurn,
    varianceVelocity,
    burnAcceleration,
    severity,
    overspendAccelerationDetected,
    delayedSpendMaskingDetected,
    unstableExpenditurePatternDetected,
  };
}
