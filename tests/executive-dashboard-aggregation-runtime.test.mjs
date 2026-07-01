import test from 'node:test'
import assert from 'node:assert/strict'

import { generatePortfolioHealthSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/health-summary-engine.ts'
import { generatePortfolioConflictSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/conflict-summary-engine.ts'
import { generatePortfolioLoadSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/load-summary-engine.ts'
import { generatePortfolioDecisionSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/decision-summary-engine.ts'
import { generatePortfolioInterventionSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/intervention-summary-engine.ts'
import { generateTopPortfolioRisks } from '../src/lib/portfolio/executive-dashboard-aggregation/risk-priority-engine.ts'
import { generatePortfolioExecutiveRecommendation } from '../src/lib/portfolio/executive-dashboard-aggregation/executive-recommendation-engine.ts'
import { runExecutiveDashboardAggregation } from '../src/lib/portfolio/executive-dashboard-aggregation/executive-dashboard-aggregation-runtime.ts'

const basePortfolio = {
  portfolioHealthScore: 55,
  activeProjectCount: 4,
  criticalProjectCount: 1,
  averageProjectHealthScore: 60,
}

const fullInput = {
  portfolio: basePortfolio,
  conflictReport: {
    conflictsDetected: 3,
    criticalConflicts: 1,
    conflicts: [
      {
        id: 'c-001',
        type: 'resource_contention',
        severity: 'critical',
        involvedProjects: ['apollo', 'beacon'],
        description: 'Platform over-allocated.',
        executiveRecommendation: 'Escalate to board.',
      },
      {
        id: 'c-002',
        type: 'timeline_collision',
        severity: 'high',
        involvedProjects: ['beacon', 'atlas'],
        description: 'Overlapping delivery windows.',
      },
      {
        id: 'c-003',
        type: 'resource_contention',
        severity: 'moderate',
        involvedProjects: ['nexus'],
      },
    ],
  },
  loadBalancingReport: {
    currentBalancingScore: 43,
    projectedImprovement: 15,
    operationalRiskLevel: 'high',
    recommendedPlan: {
      id: 'plan-001',
      title: 'Rebalance Plan Alpha',
      projectedPortfolioHealthScore: 68,
      rationale: 'Redistribute load from critical nodes.',
      actions: [
        {
          id: 'action-resource-reassignment',
          type: 'resource_reassignment',
          title: 'Reassign platform engineers',
          targetProjects: ['apollo'],
          projectedHealthGain: 10,
        },
        {
          id: 'action-timeline-shift',
          type: 'timeline_shift',
          title: 'Shift beacon window',
          targetProjects: ['beacon'],
          projectedHealthGain: 5,
        },
      ],
    },
  },
  decisionSimulationReports: [
    {
      decisionId: 'dec-001',
      decisionType: 'resource_reallocation',
      recommendation: 'approve',
      recommendationRationale: 'Reduces critical risk.',
      confidenceScore: 82,
      executiveSummary: 'Approve resource reallocation.',
      projection: { portfolioStressDelta: -6, riskLevel: 'moderate', affectedProjects: ['apollo'] },
    },
    {
      decisionId: 'dec-002',
      decisionType: 'delivery_rebaseline',
      recommendation: 'escalate',
      recommendationRationale: 'Board approval required.',
      confidenceScore: 70,
      executiveSummary: 'Escalate rebaseline to board.',
      projection: { portfolioStressDelta: 14, riskLevel: 'high', affectedProjects: ['atlas', 'beacon'] },
    },
    {
      decisionId: 'dec-003',
      decisionType: 'budget_reallocation',
      recommendation: 'approve_with_conditions',
      confidenceScore: 76,
      projection: { portfolioStressDelta: 3, riskLevel: 'low', affectedProjects: ['nexus'] },
    },
  ],
  interventionReport: {
    totalInterventions: 4,
    criticalInterventions: 2,
    escalationCount: 3,
    interventions: [
      {
        id: 'int-001',
        type: 'resource_reallocation',
        title: 'Emergency platform reallocation',
        affectedProjects: ['apollo', 'beacon'],
        urgency: 'critical',
        ownerLane: 'portfolio_board',
        escalationRequired: true,
        rationale: 'Platform exhaustion threatens delivery.',
      },
      {
        id: 'int-002',
        type: 'delivery_rebaseline',
        title: 'Atlas delivery rebaseline',
        affectedProjects: ['atlas'],
        urgency: 'critical',
        ownerLane: 'pmo_executive',
        escalationRequired: true,
        rationale: 'Timeline conflict cannot be resolved without rebaseline.',
      },
      {
        id: 'int-003',
        type: 'stakeholder_alignment',
        title: 'Nexus stakeholder alignment',
        affectedProjects: ['nexus'],
        urgency: 'high',
        ownerLane: 'pmo_lead',
        escalationRequired: true,
        rationale: 'Budget drift requires stakeholder sign-off.',
      },
      {
        id: 'int-004',
        type: 'dependency_unblock',
        title: 'Unblock atlas-beacon dependency',
        affectedProjects: ['atlas', 'beacon'],
        urgency: 'high',
        ownerLane: 'engineering_lead',
        escalationRequired: false,
        rationale: 'Dependency chain blocker prevents testing phase.',
      },
    ],
  },
}

// 1. Health summary risk mapping
test('health summary maps score >= 80 to low risk', () => {
  const summary = generatePortfolioHealthSummary({ portfolio: { ...basePortfolio, portfolioHealthScore: 85 } })
  assert.equal(summary.riskLevel, 'low')
})

test('health summary maps score 65-79 to moderate risk', () => {
  const summary = generatePortfolioHealthSummary({ portfolio: { ...basePortfolio, portfolioHealthScore: 72 } })
  assert.equal(summary.riskLevel, 'moderate')
})

test('health summary maps score 45-64 to high risk', () => {
  const summary = generatePortfolioHealthSummary({ portfolio: { ...basePortfolio, portfolioHealthScore: 55 } })
  assert.equal(summary.riskLevel, 'high')
})

test('health summary maps score below 45 to critical risk', () => {
  const summary = generatePortfolioHealthSummary({ portfolio: { ...basePortfolio, portfolioHealthScore: 30 } })
  assert.equal(summary.riskLevel, 'critical')
})

// 2. Conflict summary with escalation count
test('conflict summary counts escalations from high/critical severity and executiveRecommendation', () => {
  const summary = generatePortfolioConflictSummary(fullInput)
  assert.ok(summary.executiveEscalationsRequired >= 2)
})

test('conflict summary returns zero values when no conflict report', () => {
  const summary = generatePortfolioConflictSummary({ portfolio: basePortfolio })
  assert.equal(summary.conflictsDetected, 0)
  assert.equal(summary.criticalConflicts, 0)
  assert.equal(summary.executiveEscalationsRequired, 0)
  assert.deepEqual(summary.topConflictTypes, [])
})

// 3. Load summary fallback behavior
test('load summary falls back to portfolioHealthScore when no load report', () => {
  const summary = generatePortfolioLoadSummary({ portfolio: basePortfolio })
  assert.equal(summary.currentBalancingScore, basePortfolio.portfolioHealthScore)
  assert.equal(summary.projectedImprovement, 0)
  assert.deepEqual(summary.topBalancingActions, [])
})

test('load summary extracts action titles from recommended plan', () => {
  const summary = generatePortfolioLoadSummary(fullInput)
  assert.ok(summary.topBalancingActions.length >= 1)
  assert.equal(summary.recommendedPlanTitle, 'Rebalance Plan Alpha')
})

// 4. Decision summary counts approvals/escalations/rejections
test('decision summary counts approve and approve_with_conditions as approvals', () => {
  const summary = generatePortfolioDecisionSummary(fullInput)
  assert.equal(summary.approvalsRecommended, 2)
})

test('decision summary counts escalate recommendations', () => {
  const summary = generatePortfolioDecisionSummary(fullInput)
  assert.equal(summary.escalationsRecommended, 1)
})

test('decision summary returns zeroes when no simulations', () => {
  const summary = generatePortfolioDecisionSummary({ portfolio: basePortfolio })
  assert.equal(summary.totalDecisionsSimulated, 0)
  assert.equal(summary.averageConfidenceScore, 0)
})

// 5. Intervention summary frequency sorting
test('intervention summary sorts top types by frequency', () => {
  const summary = generatePortfolioInterventionSummary(fullInput)
  assert.ok(summary.topInterventionTypes.length >= 1)
  assert.equal(summary.topInterventionTypes[0], 'resource_reallocation')
})

test('intervention summary returns zeroes when no intervention report', () => {
  const summary = generatePortfolioInterventionSummary({ portfolio: basePortfolio })
  assert.equal(summary.totalInterventions, 0)
  assert.equal(summary.criticalInterventions, 0)
  assert.deepEqual(summary.topInterventionTypes, [])
  assert.deepEqual(summary.topOwnerLanes, [])
})

// 6. Top risk aggregation from portfolio health
test('top risks include portfolio health risk when score below 65', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const portfolioRisk = risks.find((r) => r.source === 'portfolio')
  assert.ok(portfolioRisk)
  assert.equal(portfolioRisk.id, 'risk-portfolio-health')
})

// 7. Top risk aggregation from conflicts
test('top risks include high and critical conflict risks', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const conflictRisks = risks.filter((r) => r.source === 'conflict')
  assert.ok(conflictRisks.length >= 2)
  assert.ok(conflictRisks.some((r) => r.riskLevel === 'critical'))
  assert.ok(conflictRisks.some((r) => r.riskLevel === 'high'))
})

test('top risks exclude moderate conflicts', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const conflictRisks = risks.filter((r) => r.source === 'conflict')
  assert.ok(conflictRisks.every((r) => r.riskLevel !== 'moderate'))
})

// 8. Top risk aggregation from load risk
test('top risks include load risk when operational risk is high or critical', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const loadRisk = risks.find((r) => r.source === 'load')
  assert.ok(loadRisk)
  assert.equal(loadRisk.riskLevel, 'high')
})

// 9. Top risk aggregation from decision simulations
test('top risks include decision simulation risks when projection is high or critical', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const decisionRisks = risks.filter((r) => r.source === 'decision')
  assert.ok(decisionRisks.length >= 1)
  assert.ok(decisionRisks.some((r) => r.riskLevel === 'high'))
})

// 10. Top risk aggregation from PMO interventions
test('top risks include critical and high urgency interventions', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const interventionRisks = risks.filter((r) => r.source === 'intervention')
  assert.ok(interventionRisks.length >= 2)
})

test('top risks are capped at 10 items', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  assert.ok(risks.length <= 10)
})

test('top risks are ordered critical first then high', () => {
  const risks = generateTopPortfolioRisks(fullInput)
  const levels = risks.map((r) => r.riskLevel)
  const criticalEnd = levels.lastIndexOf('critical')
  const highStart = levels.indexOf('high')
  if (criticalEnd !== -1 && highStart !== -1) {
    assert.ok(criticalEnd < highStart)
  }
})

// 11. Executive attention area generation
test('executive attention areas include portfolio_health when score below 65', () => {
  const healthSummary = generatePortfolioHealthSummary(fullInput)
  const conflictSummary = generatePortfolioConflictSummary(fullInput)
  const loadSummary = generatePortfolioLoadSummary(fullInput)
  const decisionSummary = generatePortfolioDecisionSummary(fullInput)
  const interventionSummary = generatePortfolioInterventionSummary(fullInput)
  const topRisks = generateTopPortfolioRisks(fullInput)
  const rec = generatePortfolioExecutiveRecommendation(
    fullInput, healthSummary, conflictSummary, loadSummary, decisionSummary, interventionSummary, topRisks,
  )
  assert.ok(rec.executiveAttentionAreas.includes('portfolio_health'))
})

test('executive attention areas include pmo_intervention when critical interventions exist', () => {
  const healthSummary = generatePortfolioHealthSummary(fullInput)
  const conflictSummary = generatePortfolioConflictSummary(fullInput)
  const loadSummary = generatePortfolioLoadSummary(fullInput)
  const decisionSummary = generatePortfolioDecisionSummary(fullInput)
  const interventionSummary = generatePortfolioInterventionSummary(fullInput)
  const topRisks = generateTopPortfolioRisks(fullInput)
  const rec = generatePortfolioExecutiveRecommendation(
    fullInput, healthSummary, conflictSummary, loadSummary, decisionSummary, interventionSummary, topRisks,
  )
  assert.ok(rec.executiveAttentionAreas.includes('pmo_intervention'))
})

// 12. Top decisions needed generation
test('top decisions include intervention approval when critical interventions exist', () => {
  const healthSummary = generatePortfolioHealthSummary(fullInput)
  const conflictSummary = generatePortfolioConflictSummary(fullInput)
  const loadSummary = generatePortfolioLoadSummary(fullInput)
  const decisionSummary = generatePortfolioDecisionSummary(fullInput)
  const interventionSummary = generatePortfolioInterventionSummary(fullInput)
  const topRisks = generateTopPortfolioRisks(fullInput)
  const rec = generatePortfolioExecutiveRecommendation(
    fullInput, healthSummary, conflictSummary, loadSummary, decisionSummary, interventionSummary, topRisks,
  )
  assert.ok(rec.topDecisionsNeeded.some((d) => d.includes('PMO intervention')))
})

// 13. Portfolio recommendation generation
test('portfolio recommendation reflects high risk level', () => {
  const report = runExecutiveDashboardAggregation(fullInput)
  assert.ok(report.portfolioRecommendation.toLowerCase().includes('pmo') || report.portfolioRecommendation.toLowerCase().includes('intervention'))
})

test('portfolio recommendation is low for healthy portfolio', () => {
  const healthyInput = { portfolio: { portfolioHealthScore: 88, activeProjectCount: 3, criticalProjectCount: 0, averageProjectHealthScore: 85 } }
  const report = runExecutiveDashboardAggregation(healthyInput)
  assert.ok(report.portfolioRecommendation.toLowerCase().includes('monitor') || report.portfolioRecommendation.toLowerCase().includes('governance'))
})

// 14. End-to-end runtime report
test('runtime report contains all required fields', () => {
  const report = runExecutiveDashboardAggregation(fullInput)
  assert.ok(report.generatedAt)
  assert.ok(report.healthSummary)
  assert.ok(report.conflictSummary)
  assert.ok(report.loadSummary)
  assert.ok(report.decisionSummary)
  assert.ok(report.interventionSummary)
  assert.ok(Array.isArray(report.topRisks))
  assert.ok(Array.isArray(report.topDecisionsNeeded))
  assert.ok(Array.isArray(report.executiveAttentionAreas))
  assert.ok(report.portfolioRecommendation)
  assert.ok(report.executiveSummary)
})

test('runtime report generatedAt is a valid ISO timestamp', () => {
  const report = runExecutiveDashboardAggregation(fullInput)
  assert.ok(!Number.isNaN(Date.parse(report.generatedAt)))
})

test('runtime report executive summary references project count and conflicts', () => {
  const report = runExecutiveDashboardAggregation(fullInput)
  assert.ok(report.executiveSummary.includes('4'))
  assert.ok(report.executiveSummary.includes('3'))
})
