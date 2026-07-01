import test from 'node:test'
import assert from 'node:assert/strict'

import { analyzePortfolioLoad } from '../src/lib/portfolio/load-balancing/load-analyzer.ts'
import { calculateBalancingScore } from '../src/lib/portfolio/load-balancing/balancing-score-engine.ts'
import { generateRedistributionActions } from '../src/lib/portfolio/load-balancing/redistribution-engine.ts'
import { generateBalancingPlans, selectRecommendedPlan } from '../src/lib/portfolio/load-balancing/balancing-recommendation-engine.ts'
import { simulateBalancingImpact } from '../src/lib/portfolio/load-balancing/balancing-simulator.ts'
import { runPortfolioLoadBalancing } from '../src/lib/portfolio/load-balancing/portfolio-load-balancing-runtime.ts'

const input = {
  projects: [
    {
      projectId: 'apollo',
      priority: 1,
      resourceAssignments: ['platform', 'sre', 'api'],
      technicalDemand: 72,
      stakeholderDemand: 32,
      budgetDemand: 96,
      escalationDemand: 24,
      timelineWeight: 12,
      dependencies: ['atlas', 'beacon'],
    },
    {
      projectId: 'beacon',
      priority: 2,
      resourceAssignments: ['platform', 'data'],
      technicalDemand: 60,
      stakeholderDemand: 26,
      budgetDemand: 80,
      escalationDemand: 18,
      timelineWeight: 10,
      dependencies: ['atlas'],
    },
    {
      projectId: 'atlas',
      priority: 5,
      resourceAssignments: ['qa', 'api'],
      technicalDemand: 48,
      stakeholderDemand: 16,
      budgetDemand: 65,
      escalationDemand: 11,
      timelineWeight: 9,
      dependencies: [],
    },
  ],
}

test('load analyzer computes normalized nodes for all balancing dimensions', () => {
  const nodes = analyzePortfolioLoad(input)
  assert.equal(nodes.length, 7)
  for (const node of nodes) {
    assert.ok(node.utilizationPercent >= 0 && node.utilizationPercent <= 100)
  }
})

test('balancing score engine returns bounded score', () => {
  const score = calculateBalancingScore(analyzePortfolioLoad(input), input)
  assert.ok(score >= 0 && score <= 100)
})

test('redistribution engine generates deterministic candidate actions', () => {
  const actions = generateRedistributionActions(input, analyzePortfolioLoad(input))
  assert.ok(actions.length >= 2 && actions.length <= 8)
  assert.equal(actions[0].id, 'action-resource-reassignment')
})

test('simulation produces non-negative improvement and pressure reduction', () => {
  const nodes = analyzePortfolioLoad(input)
  const score = calculateBalancingScore(nodes, input)
  const actions = generateRedistributionActions(input, nodes)
  const plans = generateBalancingPlans(actions, score)
  const simulations = simulateBalancingImpact(input, nodes, plans)

  assert.equal(simulations.length, 3)
  for (const sim of simulations) {
    assert.ok(sim.improvementDelta >= 0)
    assert.ok(sim.loadPressureReduction >= 0)
  }
})

test('plan recommendation returns one recommended and alternatives', () => {
  const nodes = analyzePortfolioLoad(input)
  const score = calculateBalancingScore(nodes, input)
  const actions = generateRedistributionActions(input, nodes)
  const plans = generateBalancingPlans(actions, score)
  const simulations = simulateBalancingImpact(input, nodes, plans)
  const recommended = selectRecommendedPlan(plans, simulations)

  assert.ok(recommended)
  assert.ok(plans.some((plan) => plan.id === recommended.id))
})

test('portfolio load balancing runtime executes end-to-end', () => {
  const report = runPortfolioLoadBalancing(input)
  assert.equal(report.loadNodes.length, 7)
  assert.ok(report.recommendedPlan)
  assert.equal(report.alternativePlans.length, 2)
  assert.ok(report.currentBalancingScore >= 0 && report.currentBalancingScore <= 100)
})
