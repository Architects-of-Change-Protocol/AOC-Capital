import type {
  BaselineDriftSignal,
  BillingReadinessSignal,
  BurnRateSignal,
  CostIntervention,
  ForecastSignal,
  ProcurementRiskSignal,
} from "./cost-governance-types";

export function prioritizeCostInterventions(input: {
  baseline: BaselineDriftSignal;
  burnRate: BurnRateSignal;
  forecast: ForecastSignal;
  procurement: ProcurementRiskSignal;
  billingReadiness: BillingReadinessSignal;
}): CostIntervention[] {
  const interventions: CostIntervention[] = [];

  if (input.baseline.severity === "critical" || input.burnRate.overspendAccelerationDetected) {
    interventions.push({ recommendation: "OPEN_FINANCIAL_ESCALATION", priority: 1, urgencyScore: 92, rationale: "Critical drift or accelerating overspend threatens approved financial baseline.", recommendedWindowHours: 4 });
  }
  if (input.procurement.riskScore >= 50) {
    interventions.push({ recommendation: "REQUEST_PO_EXPEDITE", priority: 2, urgencyScore: 78, rationale: "Procurement latency is creating financial execution drag.", recommendedWindowHours: 12 });
  }
  if (input.procurement.scenarioFlags.includes("delayed_vendor_release") || input.procurement.scenarioFlags.includes("dependency_invoice_blockage")) {
    interventions.push({ recommendation: "ESCALATE_VENDOR_DEPENDENCY", priority: 3, urgencyScore: 74, rationale: "Vendor dependency timing has become a direct financial risk.", recommendedWindowHours: 12 });
  }
  if (input.billingReadiness.readinessScore < 60 || input.billingReadiness.revenueTrappedDetected) {
    interventions.push({ recommendation: "TRIGGER_BILLING_ALIGNMENT", priority: 4, urgencyScore: 68, rationale: "Billing readiness degradation is delaying financial realization.", recommendedWindowHours: 24 });
  }
  if (input.forecast.forecastConfidenceScore < 65) {
    interventions.push({ recommendation: "SURFACE_FORECAST_REBASELINE", priority: 5, urgencyScore: 65, rationale: "Estimate at completion confidence has degraded beyond watch thresholds.", recommendedWindowHours: 24 });
  }
  if (input.baseline.driftPercentage > 8 || input.billingReadiness.budgetWindowRiskDetected) {
    interventions.push({ recommendation: "PROTECT_MARGIN_WINDOW", priority: 6, urgencyScore: 60, rationale: "Margin erosion risk requires controlled spending and realization alignment.", recommendedWindowHours: 36 });
  }

  return interventions.sort((a, b) => b.urgencyScore - a.urgencyScore || a.priority - b.priority);
}
