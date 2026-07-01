import { calculateBalancingScore } from './balancing-score-engine'
import { generateBalancingPlans, selectRecommendedPlan } from './balancing-recommendation-engine'
import { simulateBalancingImpact } from './balancing-simulator'
import { analyzePortfolioLoad } from './load-analyzer'
import { generateRedistributionActions } from './redistribution-engine'
import type { LoadBalancingPlan, PortfolioLoadInput, PortfolioLoadNode } from './types'

export interface PortfolioLoadBalancingReport {
  loadNodes: PortfolioLoadNode[]
  currentBalancingScore: number
  recommendedPlan: LoadBalancingPlan
  alternativePlans: LoadBalancingPlan[]
  projectedImprovement: number
  operationalRiskLevel: string
}

function toOperationalRiskLevel(score: number): string {
  if (score >= 90) return 'controlled'
  if (score >= 75) return 'managed'
  if (score >= 60) return 'elevated'
  if (score >= 40) return 'high'
  return 'critical'
}

export function runPortfolioLoadBalancing(input: PortfolioLoadInput): PortfolioLoadBalancingReport {
  const loadNodes = analyzePortfolioLoad(input)
  const currentBalancingScore = calculateBalancingScore(loadNodes, input)
  const actions = generateRedistributionActions(input, loadNodes)
  const plans = generateBalancingPlans(actions, currentBalancingScore)
  const simulations = simulateBalancingImpact(input, loadNodes, plans)
  const recommendedPlan = selectRecommendedPlan(plans, simulations)
  const alternativePlans = plans.filter((plan) => plan.id !== recommendedPlan.id)
  const recommendedSimulation = simulations.find((sim) => sim.planId === recommendedPlan.id)

  return {
    loadNodes,
    currentBalancingScore,
    recommendedPlan,
    alternativePlans,
    projectedImprovement: recommendedSimulation?.improvementDelta ?? 0,
    operationalRiskLevel: toOperationalRiskLevel(currentBalancingScore),
  }
}
