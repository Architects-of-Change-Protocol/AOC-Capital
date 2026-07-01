import type { BalancingSimulationResult } from './balancing-simulator'
import type { LoadBalancingPlan, RedistributionAction } from './types'

function scoreAction(action: RedistributionAction): number {
  return action.projectedHealthGain * 2 + action.expectedLoadReduction - action.implementationComplexity
}

export function generateBalancingPlans(actions: RedistributionAction[], currentScore: number): LoadBalancingPlan[] {
  const ranked = [...actions].sort((a, b) => scoreAction(b) - scoreAction(a) || a.id.localeCompare(b.id))

  const conservativeActions = ranked.filter((action) => action.implementationComplexity <= 3).slice(0, 2)
  const balancedActions = ranked.slice(0, 4)
  const aggressiveActions = ranked.slice(0, 6)

  const plans: LoadBalancingPlan[] = [
    {
      id: 'conservative-plan',
      actions: conservativeActions,
      projectedPortfolioHealthScore: Math.min(100, currentScore + conservativeActions.reduce((s, a) => s + a.projectedHealthGain, 0)),
      rationale:
        'Conservative Plan: selected for minimal disruption, fast implementation, lower operational risk, and limited executive intervention requirements.',
    },
    {
      id: 'balanced-plan',
      actions: balancedActions,
      projectedPortfolioHealthScore: Math.min(100, currentScore + balancedActions.reduce((s, a) => s + a.projectedHealthGain, 0)),
      rationale:
        'Balanced Plan: selected for optimal tradeoff between health improvement, implementation complexity, and executive coordination load.',
    },
    {
      id: 'aggressive-optimization-plan',
      actions: aggressiveActions,
      projectedPortfolioHealthScore: Math.min(100, currentScore + aggressiveActions.reduce((s, a) => s + a.projectedHealthGain, 0)),
      rationale:
        'Aggressive Optimization Plan: selected to maximize portfolio health uplift with deeper operational changes and higher executive decision requirements.',
    },
  ]

  return plans
}

export function selectRecommendedPlan(plans: LoadBalancingPlan[], simulations: BalancingSimulationResult[]): LoadBalancingPlan {
  const simById = new Map(simulations.map((sim) => [sim.planId, sim]))
  return [...plans].sort((a, b) => {
    const simA = simById.get(a.id)
    const simB = simById.get(b.id)
    const aScore = (simA?.improvementDelta ?? 0) * 2 + (simA?.loadPressureReduction ?? 0) * 0.1 - a.actions.length
    const bScore = (simB?.improvementDelta ?? 0) * 2 + (simB?.loadPressureReduction ?? 0) * 0.1 - b.actions.length
    return bScore - aScore
  })[0]
}
