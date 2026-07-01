import assert from 'node:assert/strict';
import { createQualityGovernanceAssessment } from '../src/lib/governance/quality/quality-governance-agent.ts';
import { evaluateQualityBaseline } from '../src/lib/governance/quality/quality-baseline-evaluator.ts';
import { analyzeDefectPressure } from '../src/lib/governance/quality/defect-pressure-analyzer.ts';
import { evaluateAcceptanceReadiness } from '../src/lib/governance/quality/acceptance-readiness-engine.ts';
import { evaluateTechnicalDebt } from '../src/lib/governance/quality/technical-debt-evaluator.ts';
import { prioritizeQualityInterventions } from '../src/lib/governance/quality/quality-intervention-prioritizer.ts';

assert.equal(typeof createQualityGovernanceAssessment, 'function');
assert.equal(typeof evaluateQualityBaseline, 'function');
assert.equal(typeof analyzeDefectPressure, 'function');
assert.equal(typeof evaluateAcceptanceReadiness, 'function');
assert.equal(typeof evaluateTechnicalDebt, 'function');
assert.equal(typeof prioritizeQualityInterventions, 'function');

const baseline = { plannedAcceptanceCriteria: 20, plannedValidationCoverage: 90, approvedQualityThreshold: 85, targetDefectEscapeRate: 1.5, targetTechnicalDebtRatio: 0.2 };
const snapshot = { completedAcceptanceCriteria: 14, validationCoverage: 72, escapedDefects: 5, openCriticalDefects: 4, unresolvedRegressionCount: 6, technicalDebtRatio: 0.34, codeVolatility: 0.72, failedValidationCycles: 4, confidenceDrift: 18, acceptanceEvidenceCompleteness: 63 };

const baselineSignal = evaluateQualityBaseline(baseline, snapshot);
assert.equal(baselineSignal.severity, 'critical');
const a1 = createQualityGovernanceAssessment({ baseline, snapshot });
const a2 = createQualityGovernanceAssessment({ baseline, snapshot });
assert.deepEqual(a1, a2);

const watch = createQualityGovernanceAssessment({ baseline, snapshot: { ...snapshot, completedAcceptanceCriteria: 19, validationCoverage: 84, escapedDefects: 2, openCriticalDefects: 1, unresolvedRegressionCount: 2, technicalDebtRatio: 0.22, codeVolatility: 0.4, failedValidationCycles: 1, confidenceDrift: 6, acceptanceEvidenceCompleteness: 81 } });
assert.ok(['watch', 'elevated', 'critical'].includes(watch.overallSeverity));
assert.deepEqual(a1.interventionQueue, [...a1.interventionQueue].sort((x,y)=>y.urgencyScore-x.urgencyScore||x.priority-y.priority||x.recommendation.localeCompare(y.recommendation)));

console.log('[ok] quality governance runtime valid');
