import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = {
  types: fs.readFileSync('src/lib/governance/cost/cost-governance-types.ts','utf8'),
  baseline: fs.readFileSync('src/lib/governance/cost/cost-baseline-evaluator.ts','utf8'),
  burn: fs.readFileSync('src/lib/governance/cost/burn-rate-analyzer.ts','utf8'),
  forecast: fs.readFileSync('src/lib/governance/cost/forecast-confidence-engine.ts','utf8'),
  procurement: fs.readFileSync('src/lib/governance/cost/procurement-risk-evaluator.ts','utf8'),
  billing: fs.readFileSync('src/lib/governance/cost/billing-readiness-engine.ts','utf8'),
  interventions: fs.readFileSync('src/lib/governance/cost/cost-intervention-prioritizer.ts','utf8'),
  agent: fs.readFileSync('src/lib/governance/cost/cost-governance-agent.ts','utf8'),
};

test('domain files and contracts exist', () => {
  assert.match(files.types,/CostBaseline/); assert.match(files.types,/BudgetSnapshot/); assert.match(files.types,/BurnRateSignal/); assert.match(files.types,/ForecastSignal/);
  assert.match(files.types,/ProcurementRiskSignal/); assert.match(files.types,/BillingReadinessSignal/); assert.match(files.types,/CostIntervention/); assert.match(files.types,/CostGovernanceAssessment/);
  assert.match(files.types,/CostGovernanceSeverity/); assert.match(files.types,/CostGovernanceRecommendation/);
  assert.match(files.types,/"healthy"\s*\|\s*"watch"\s*\|\s*"elevated"\s*\|\s*"critical"/);
});

test('baseline drift logic covers required signals', () => {
  assert.match(files.baseline,/actualSpendToDate/); assert.match(files.baseline,/projectedTotalSpend/); assert.match(files.baseline,/unauthorizedExpansionAmount/); assert.match(files.baseline,/scopeCostDivergence/);
  assert.match(files.baseline,/driftPercentage/); assert.match(files.baseline,/driftDirection/); assert.match(files.baseline,/severity/); assert.match(files.baseline,/confidence/);
});

test('burn rate analyzer computes deterministic metrics', () => {
  assert.match(files.burn,/plannedBurn/); assert.match(files.burn,/actualBurn/); assert.match(files.burn,/varianceVelocity/); assert.match(files.burn,/burnAcceleration/);
  assert.match(files.burn,/overspendAccelerationDetected/); assert.match(files.burn,/delayedSpendMaskingDetected/); assert.match(files.burn,/unstableExpenditurePatternDetected/);
});

test('forecast confidence rules include required thresholds', () => {
  assert.match(files.forecast,/score >= 85/); assert.match(files.forecast,/score >= 65/); assert.match(files.forecast,/score >= 40/); assert.match(files.forecast,/return "critical"/);
  assert.match(files.forecast,/forecastConfidenceScore/);
});

test('procurement and billing scenarios are modeled', () => {
  assert.match(files.procurement,/delayed_vendor_release/); assert.match(files.procurement,/procurement_approval_lag/); assert.match(files.procurement,/hardware_shipment_delay/); assert.match(files.procurement,/dependency_invoice_blockage/);
  assert.match(files.billing,/revenueTrappedDetected/); assert.match(files.billing,/budgetWindowRiskDetected/); assert.match(files.billing,/delayedInvoicingExposureDetected/); assert.match(files.billing,/collectionTimingDegradationDetected/);
});

test('intervention and orchestration surfaces exist', () => {
  assert.match(files.interventions,/OPEN_FINANCIAL_ESCALATION/); assert.match(files.interventions,/REQUEST_PO_EXPEDITE/); assert.match(files.interventions,/TRIGGER_BILLING_ALIGNMENT/);
  assert.match(files.interventions,/SURFACE_FORECAST_REBASELINE/); assert.match(files.interventions,/ESCALATE_VENDOR_DEPENDENCY/); assert.match(files.interventions,/PROTECT_MARGIN_WINDOW/);
  assert.match(files.agent,/createCostGovernanceAssessment/); assert.match(files.agent,/overallSeverity/); assert.match(files.agent,/interventionQueue/); assert.match(files.agent,/financialHealthScore/);
});

test('runtime validation script passes', () => {
  const output = execFileSync('npm', ['run','check:cost-governance-agent'], { encoding:'utf8' });
  assert.match(output,/\[ok\] cost governance runtime valid/);
});
