import { analyzePortfolioLoad } from '../src/lib/portfolio/load-balancing/load-analyzer.ts'
import { calculateBalancingScore } from '../src/lib/portfolio/load-balancing/balancing-score-engine.ts'
import { generateRedistributionActions } from '../src/lib/portfolio/load-balancing/redistribution-engine.ts'
import { generateBalancingPlans } from '../src/lib/portfolio/load-balancing/balancing-recommendation-engine.ts'
import { simulateBalancingImpact } from '../src/lib/portfolio/load-balancing/balancing-simulator.ts'
import { runPortfolioLoadBalancing } from '../src/lib/portfolio/load-balancing/portfolio-load-balancing-runtime.ts'

const input = {
  projects: [
    {
      projectId: 'alpha',
      priority: 1,
      resourceAssignments: ['platform', 'infra', 'api'],
      technicalDemand: 78,
      stakeholderDemand: 30,
      budgetDemand: 95,
      escalationDemand: 23,
      timelineWeight: 13,
      dependencies: ['beta', 'gamma'],
    },
    {
      projectId: 'beta',
      priority: 3,
      resourceAssignments: ['platform', 'data'],
      technicalDemand: 58,
      stakeholderDemand: 22,
      budgetDemand: 75,
      escalationDemand: 17,
      timelineWeight: 10,
      dependencies: ['gamma'],
    },
    {
      projectId: 'gamma',
      priority: 5,
      resourceAssignments: ['qa', 'api'],
      technicalDemand: 46,
      stakeholderDemand: 14,
      budgetDemand: 62,
      escalationDemand: 10,
      timelineWeight: 8,
    },
  ],
}

const nodes = analyzePortfolioLoad(input)
if (nodes.length !== 7) throw new Error('load analysis failed')

const score = calculateBalancingScore(nodes, input)
if (score < 0 || score > 100) throw new Error('balancing score out of range')

const actions = generateRedistributionActions(input, nodes)
if (actions.length < 2) throw new Error('redistribution actions failed')

const plans = generateBalancingPlans(actions, score)
const simulations = simulateBalancingImpact(input, nodes, plans)
if (simulations.length !== plans.length) throw new Error('simulation failed')

const report = runPortfolioLoadBalancing(input)
if (!report.recommendedPlan || report.alternativePlans.length !== 2) throw new Error('runtime orchestration failed')

console.log('[ok] portfolio load balancing runtime valid')
