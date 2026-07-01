import test from 'node:test'
import assert from 'node:assert/strict'

import { calculatePortfolioBaseline } from '../src/lib/portfolio/executive-decision-simulation/decision-impact-analyzer.ts'
import { simulateExecutiveDecision } from '../src/lib/portfolio/executive-decision-simulation/decision-simulation-engine.ts'
import { generateDecisionTradeoffs } from '../src/lib/portfolio/executive-decision-simulation/tradeoff-engine.ts'
import { generateDecisionRecommendation } from '../src/lib/portfolio/executive-decision-simulation/recommendation-engine.ts'
import { calculateDecisionConfidence } from '../src/lib/portfolio/executive-decision-simulation/decision-confidence-engine.ts'
import { runExecutiveDecisionSimulation } from '../src/lib/portfolio/executive-decision-simulation/executive-decision-simulation-runtime.ts'

const THREE_PROJECTS = [
  {
    projectId: 'p1',
    projectName: 'Platform Revamp',
    priority: 1,
    healthScore: 62,
    resourceLoad: 78,
    timelinePressure: 72,
    budgetExposure: 55,
    stakeholderLoad: 60,
    dependencyRisk: 45,
    escalationLoad: 30,
  },
  {
    projectId: 'p2',
    projectName: 'Billing Migration',
    priority: 3,
    healthScore: 75,
    resourceLoad: 50,
    timelinePressure: 40,
    budgetExposure: 35,
    stakeholderLoad: 40,
    dependencyRisk: 30,
    escalationLoad: 20,
  },
  {
    projectId: 'p3',
    projectName: 'Compliance Controls',
    priority: 2,
    healthScore: 58,
    resourceLoad: 85,
    timelinePressure: 80,
    budgetExposure: 65,
    stakeholderLoad: 70,
    dependencyRisk: 60,
    escalationLoad: 45,
  },
]

const PORTFOLIO = { projects: THREE_PROJECTS }

// ---------------------------------------------------------------------------
// 1. Portfolio baseline calculation
// ---------------------------------------------------------------------------

test('baseline calculates correct totals', () => {
  const baseline = calculatePortfolioBaseline(PORTFOLIO)
  assert.equal(baseline.totalResourceLoad, 78 + 50 + 85)
  assert.equal(baseline.totalTimelinePressure, 72 + 40 + 80)
  assert.equal(baseline.totalBudgetExposure, 55 + 35 + 65)
  assert.equal(baseline.totalStakeholderLoad, 60 + 40 + 70)
  assert.equal(baseline.totalDependencyRisk, 45 + 30 + 60)
  assert.equal(baseline.totalEscalationLoad, 30 + 20 + 45)
})

test('baseline averageHealthScore is mean of project health scores', () => {
  const baseline = calculatePortfolioBaseline(PORTFOLIO)
  const expected = Math.round(((62 + 75 + 58) / 3) * 10) / 10
  assert.equal(baseline.averageHealthScore, expected)
})

test('baseline portfolioStressScore is bounded 0–100', () => {
  const baseline = calculatePortfolioBaseline(PORTFOLIO)
  assert.ok(baseline.portfolioStressScore >= 0 && baseline.portfolioStressScore <= 100)
})

test('baseline with empty portfolio returns zero values', () => {
  const baseline = calculatePortfolioBaseline({ projects: [] })
  assert.equal(baseline.averageHealthScore, 0)
  assert.equal(baseline.portfolioStressScore, 0)
})

// ---------------------------------------------------------------------------
// 2. Resource reallocation simulation
// ---------------------------------------------------------------------------

test('resource reallocation produces non-negative health delta', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-001',
      type: 'resource_reallocation',
      title: 'Move engineer from p2 to p1',
      description: 'Reallocate senior engineer',
      affectedProjects: ['p1', 'p2'],
      sourceProjectId: 'p2',
      targetProjectId: 'p1',
      resourceDelta: 25,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.healthDelta >= 0, 'resource_reallocation should improve or maintain health')
  assert.equal(projection.resourceLoadDelta, 0, 'net resource load should be zero for reallocation')
})

test('resource reallocation reduces timeline pressure', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-001',
      type: 'resource_reallocation',
      title: 'Reallocate resource',
      description: 'Move resource to unblock critical path',
      affectedProjects: ['p1'],
      targetProjectId: 'p1',
      resourceDelta: 30,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.timelinePressureDelta <= 0, 'reallocation should reduce or maintain timeline pressure')
})

// ---------------------------------------------------------------------------
// 3. Timeline delay simulation
// ---------------------------------------------------------------------------

test('timeline delay reduces timeline pressure', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-002',
      type: 'timeline_delay',
      title: 'Delay p2 by two weeks',
      description: 'Defer billing migration milestone',
      affectedProjects: ['p2'],
      timelineDeltaDays: 14,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.timelinePressureDelta < 0, 'timeline delay should reduce pressure')
})

test('timeline delay increases dependency risk', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-002',
      type: 'timeline_delay',
      title: 'Delay p3',
      description: 'Defer compliance controls',
      affectedProjects: ['p3'],
      timelineDeltaDays: 21,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.dependencyRiskDelta > 0, 'timeline delay should increase dependency risk')
})

// ---------------------------------------------------------------------------
// 4. Budget hold simulation
// ---------------------------------------------------------------------------

test('budget hold increases timeline pressure', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-003',
      type: 'budget_hold',
      title: 'Finance blocks PO for p1',
      description: 'Hold all procurement for platform revamp',
      affectedProjects: ['p1'],
      budgetDelta: 200000,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.timelinePressureDelta > 0, 'budget hold should increase timeline pressure')
  assert.ok(projection.healthDelta < 0, 'budget hold should reduce health')
})

test('budget hold increases dependency risk', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-003',
      type: 'budget_hold',
      title: 'Budget hold',
      description: 'Freeze all spending',
      affectedProjects: ['p1', 'p2', 'p3'],
      budgetDelta: 500000,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.dependencyRiskDelta > 0, 'budget hold should increase dependency risk')
})

// ---------------------------------------------------------------------------
// 5. Temporary capacity addition simulation
// ---------------------------------------------------------------------------

test('temporary capacity addition improves health and reduces load', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-004',
      type: 'temporary_capacity_addition',
      title: 'Add two contractors to p3',
      description: 'Surge staffing for compliance controls',
      affectedProjects: ['p3'],
      capacityDelta: 30,
    },
  }
  const projection = simulateExecutiveDecision(input)
  assert.ok(projection.healthDelta > 0, 'capacity addition should improve health')
  assert.ok(projection.resourceLoadDelta < 0, 'capacity addition should reduce resource load')
  assert.ok(projection.budgetExposureDelta > 0, 'capacity addition increases budget exposure')
})

// ---------------------------------------------------------------------------
// 6. Tradeoff generation
// ---------------------------------------------------------------------------

test('generates at least 2 tradeoffs for each decision type', () => {
  const decisionTypes = [
    'resource_reallocation',
    'timeline_delay',
    'timeline_acceleration',
    'budget_hold',
    'budget_release',
    'scope_reduction',
    'scope_expansion',
    'priority_override',
    'temporary_capacity_addition',
    'executive_escalation',
  ]

  for (const type of decisionTypes) {
    const input = {
      portfolio: PORTFOLIO,
      decision: {
        id: `dec-${type}`,
        type,
        title: `Test ${type}`,
        description: 'Test decision',
        affectedProjects: ['p1'],
      },
    }
    const projection = simulateExecutiveDecision(input)
    const tradeoffs = generateDecisionTradeoffs(input, projection)
    assert.ok(tradeoffs.length >= 2, `${type} must produce at least 2 tradeoffs, got ${tradeoffs.length}`)
  }
})

test('tradeoffs have required fields', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-001',
      type: 'scope_reduction',
      title: 'Reduce scope',
      description: 'Cut features from p1',
      affectedProjects: ['p1'],
      scopeDelta: 20,
    },
  }
  const projection = simulateExecutiveDecision(input)
  const tradeoffs = generateDecisionTradeoffs(input, projection)
  for (const t of tradeoffs) {
    assert.ok(t.id, 'tradeoff must have id')
    assert.ok(t.title, 'tradeoff must have title')
    assert.ok(t.positiveImpact, 'tradeoff must have positiveImpact')
    assert.ok(t.negativeImpact, 'tradeoff must have negativeImpact')
    assert.ok(t.affectedProjects.length > 0, 'tradeoff must reference affected projects')
    assert.ok(['low', 'moderate', 'high', 'critical'].includes(t.severity), 'tradeoff severity must be valid')
  }
})

// ---------------------------------------------------------------------------
// 7. Recommendation generation
// ---------------------------------------------------------------------------

test('recommendation is a valid decision recommendation value', () => {
  const valid = ['approve', 'approve_with_conditions', 'defer', 'reject', 'escalate']
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-001',
      type: 'resource_reallocation',
      title: 'Reallocation',
      description: 'Move resource',
      affectedProjects: ['p1', 'p2'],
      resourceDelta: 20,
    },
  }
  const baseline = calculatePortfolioBaseline(PORTFOLIO)
  const projection = simulateExecutiveDecision(input)
  const tradeoffs = generateDecisionTradeoffs(input, projection)
  const { recommendation, rationale } = generateDecisionRecommendation(input, baseline, projection, tradeoffs)
  assert.ok(valid.includes(recommendation), `unexpected recommendation: ${recommendation}`)
  assert.ok(rationale.length > 0, 'rationale must not be empty')
})

test('high-impact budget hold does not produce approve without conditions', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-003',
      type: 'budget_hold',
      title: 'Full portfolio budget freeze',
      description: 'Hold all budgets',
      affectedProjects: ['p1', 'p2', 'p3'],
      budgetDelta: 1000000,
    },
  }
  const baseline = calculatePortfolioBaseline(PORTFOLIO)
  const projection = simulateExecutiveDecision(input)
  const tradeoffs = generateDecisionTradeoffs(input, projection)
  const { recommendation } = generateDecisionRecommendation(input, baseline, projection, tradeoffs)
  assert.notEqual(recommendation, 'approve', 'full budget hold must not be unconditionally approved')
})

// ---------------------------------------------------------------------------
// 8. Confidence score bounds
// ---------------------------------------------------------------------------

test('confidence score is bounded 0–100 for all decision types', () => {
  const decisionTypes = [
    'resource_reallocation',
    'timeline_delay',
    'timeline_acceleration',
    'budget_hold',
    'budget_release',
    'scope_reduction',
    'scope_expansion',
    'priority_override',
    'temporary_capacity_addition',
    'executive_escalation',
  ]

  for (const type of decisionTypes) {
    const input = {
      portfolio: PORTFOLIO,
      decision: {
        id: `dec-${type}`,
        type,
        title: `Test ${type}`,
        description: 'Test decision',
        affectedProjects: ['p1', 'p2', 'p3'],
      },
    }
    const baseline = calculatePortfolioBaseline(PORTFOLIO)
    const projection = simulateExecutiveDecision(input)
    const tradeoffs = generateDecisionTradeoffs(input, projection)
    const confidence = calculateDecisionConfidence(input, baseline, projection, tradeoffs)
    assert.ok(confidence >= 0 && confidence <= 100, `${type} confidence out of range: ${confidence}`)
  }
})

test('complete decision fields yield higher confidence than incomplete fields', () => {
  const completeInput = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-001',
      type: 'resource_reallocation',
      title: 'Reallocation',
      description: 'Move resource',
      affectedProjects: ['p1', 'p2'],
      sourceProjectId: 'p2',
      targetProjectId: 'p1',
      resourceDelta: 20,
    },
  }
  const incompleteInput = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-002',
      type: 'resource_reallocation',
      title: 'Vague reallocation',
      description: 'Move something somewhere',
      affectedProjects: ['p1'],
    },
  }

  const baseline = calculatePortfolioBaseline(PORTFOLIO)

  const completeProjection = simulateExecutiveDecision(completeInput)
  const completeTradeoffs = generateDecisionTradeoffs(completeInput, completeProjection)
  const completeConfidence = calculateDecisionConfidence(completeInput, baseline, completeProjection, completeTradeoffs)

  const incompleteProjection = simulateExecutiveDecision(incompleteInput)
  const incompleteTradeoffs = generateDecisionTradeoffs(incompleteInput, incompleteProjection)
  const incompleteConfidence = calculateDecisionConfidence(incompleteInput, baseline, incompleteProjection, incompleteTradeoffs)

  assert.ok(completeConfidence > incompleteConfidence, 'complete decision should yield higher confidence')
})

// ---------------------------------------------------------------------------
// 9. End-to-end runtime report
// ---------------------------------------------------------------------------

test('runtime produces a complete report for resource reallocation', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'exec-dec-001',
      type: 'resource_reallocation',
      title: 'Move senior engineer from p2 to p1',
      description: 'Reallocate senior engineer to unblock critical path',
      affectedProjects: ['p1', 'p2'],
      sourceProjectId: 'p2',
      targetProjectId: 'p1',
      resourceDelta: 25,
    },
  }

  const report = runExecutiveDecisionSimulation(input)

  assert.equal(report.decisionId, 'exec-dec-001')
  assert.equal(report.decisionType, 'resource_reallocation')
  assert.ok(report.baseline.portfolioStressScore >= 0 && report.baseline.portfolioStressScore <= 100)
  assert.ok(report.projection.affectedProjects.includes('p1'))
  assert.ok(report.projection.affectedProjects.includes('p2'))
  assert.ok(report.tradeoffs.length >= 2)
  assert.ok(['approve', 'approve_with_conditions', 'defer', 'reject', 'escalate'].includes(report.recommendation))
  assert.ok(report.recommendationRationale.length > 0)
  assert.ok(report.confidenceScore >= 0 && report.confidenceScore <= 100)
  assert.ok(report.executiveSummary.includes('exec dec 001') || report.executiveSummary.includes('Move senior engineer'))
})

test('runtime executive summary contains recommendation and stress delta', () => {
  const input = {
    portfolio: PORTFOLIO,
    decision: {
      id: 'dec-summary-test',
      type: 'temporary_capacity_addition',
      title: 'Add surge capacity to Compliance Controls',
      description: 'Two contractors for six weeks',
      affectedProjects: ['p3'],
      capacityDelta: 20,
    },
  }

  const report = runExecutiveDecisionSimulation(input)
  assert.ok(report.executiveSummary.includes('Add surge capacity'), 'summary should include decision title')
  assert.ok(
    report.executiveSummary.includes(report.recommendation.replace(/_/g, ' ')),
    'summary should include the recommendation',
  )
})
