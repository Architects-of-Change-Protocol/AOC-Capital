export type CostGovernanceSeverity = "healthy" | "watch" | "elevated" | "critical";

export interface CostBaseline {
  approvedBudget: number;
  approvedContingency: number;
  plannedDurationDays: number;
  plannedPercentComplete: number;
  plannedSpendToDate: number;
  authorizedChangeBudget: number;
}

export interface BudgetSnapshot {
  actualSpendToDate: number;
  projectedTotalSpend: number;
  percentComplete: number;
  elapsedDays: number;
  remainingWorkConfidence: number;
  historicalExecutionVariance: number;
  unauthorizedExpansionAmount: number;
  scopeCompletionRatio: number;
  costConsumptionRatio: number;
  plannedBurnRatePerDay: number;
  actualBurnRatePerDay: number;
  previousBurnVariance?: number;
  burnVarianceHistory?: number[];
  marginTargetPercent: number;
  currentMarginPercent: number;
}

export interface BaselineDriftSignal {
  driftPercentage: number;
  driftDirection: "under" | "over" | "on_track";
  severity: CostGovernanceSeverity;
  confidence: number;
  notes: string[];
}

export interface BurnRateSignal {
  plannedBurn: number;
  actualBurn: number;
  varianceVelocity: number;
  burnAcceleration: number;
  severity: CostGovernanceSeverity;
  overspendAccelerationDetected: boolean;
  delayedSpendMaskingDetected: boolean;
  unstableExpenditurePatternDetected: boolean;
}

export interface ForecastSignal {
  forecastConfidenceScore: number;
  severity: CostGovernanceSeverity;
  estimateAtCompletion: number;
  completionConfidence: number;
}

export interface ProcurementRiskSignal {
  poLatencyDays: number;
  vendorDependencyRisk: number;
  blockedPurchasingCount: number;
  downstreamFinancialCouplingRisk: number;
  scenarioFlags: string[];
  severity: CostGovernanceSeverity;
  riskScore: number;
}

export interface BillingReadinessSignal {
  milestoneCompletion: number;
  acceptanceDependencyClearance: number;
  documentationCompleteness: number;
  invoiceGateBlockers: number;
  revenueTrappedDetected: boolean;
  budgetWindowRiskDetected: boolean;
  delayedInvoicingExposureDetected: boolean;
  collectionTimingDegradationDetected: boolean;
  severity: CostGovernanceSeverity;
  readinessScore: number;
}

export type CostGovernanceRecommendation =
  | "OPEN_FINANCIAL_ESCALATION"
  | "REQUEST_PO_EXPEDITE"
  | "TRIGGER_BILLING_ALIGNMENT"
  | "SURFACE_FORECAST_REBASELINE"
  | "ESCALATE_VENDOR_DEPENDENCY"
  | "PROTECT_MARGIN_WINDOW";

export interface CostIntervention {
  recommendation: CostGovernanceRecommendation;
  priority: number;
  urgencyScore: number;
  rationale: string;
  recommendedWindowHours: number;
}

export interface CostGovernanceAssessment {
  baseline: BaselineDriftSignal;
  burnRate: BurnRateSignal;
  forecast: ForecastSignal;
  procurement: ProcurementRiskSignal;
  billingReadiness: BillingReadinessSignal;
  overallSeverity: CostGovernanceSeverity;
  interventionQueue: CostIntervention[];
  executiveSummary: string;
  financialHealthScore: number;
}
