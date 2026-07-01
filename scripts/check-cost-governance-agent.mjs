import assert from 'node:assert/strict';
import { createCostGovernanceAssessment } from '../src/lib/governance/cost/cost-governance-agent.ts';
import { evaluateCostBaselineDrift } from '../src/lib/governance/cost/cost-baseline-evaluator.ts';
import { analyzeBurnRate } from '../src/lib/governance/cost/burn-rate-analyzer.ts';
import { evaluateForecastConfidence } from '../src/lib/governance/cost/forecast-confidence-engine.ts';
import { evaluateProcurementRisk } from '../src/lib/governance/cost/procurement-risk-evaluator.ts';
import { evaluateBillingReadiness } from '../src/lib/governance/cost/billing-readiness-engine.ts';
import { prioritizeCostInterventions } from '../src/lib/governance/cost/cost-intervention-prioritizer.ts';

assert.equal(typeof createCostGovernanceAssessment, 'function');
assert.equal(typeof evaluateCostBaselineDrift, 'function');
assert.equal(typeof analyzeBurnRate, 'function');
assert.equal(typeof evaluateForecastConfidence, 'function');
assert.equal(typeof evaluateProcurementRisk, 'function');
assert.equal(typeof evaluateBillingReadiness, 'function');
assert.equal(typeof prioritizeCostInterventions, 'function');
// ...
const input={baseline:{approvedBudget:100000,approvedContingency:10000,plannedDurationDays:100,plannedPercentComplete:50,plannedSpendToDate:55000,authorizedChangeBudget:5000},snapshot:{actualSpendToDate:64000,projectedTotalSpend:128000,percentComplete:52,elapsedDays:55,remainingWorkConfidence:62,historicalExecutionVariance:14,unauthorizedExpansionAmount:6000,scopeCompletionRatio:0.51,costConsumptionRatio:0.64,plannedBurnRatePerDay:1000,actualBurnRatePerDay:1280,previousBurnVariance:200,burnVarianceHistory:[40,-10,35,-5],marginTargetPercent:28,currentMarginPercent:16},procurement:{poLatencyDays:13,vendorDependencyTimingRisk:74,blockedPurchasingSequenceCount:2,downstreamScheduleFinancialCouplingRisk:68,delayedVendorRelease:true,approvalLag:true,hardwareShipmentDelay:false,dependencyInvoiceBlockage:true},billing:{milestoneCompletion:78,acceptanceDependenciesCleared:46,documentationCompleteness:62,invoiceGatingBlockers:2,budgetWindowDaysRemaining:8,collectionDelayDays:19}};
const a1=createCostGovernanceAssessment(input); const a2=createCostGovernanceAssessment(input); assert.deepEqual(a1,a2); assert.equal(a1.overallSeverity,'critical');
console.log('[ok] cost governance runtime valid');
