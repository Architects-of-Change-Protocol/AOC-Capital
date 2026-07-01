import { analyzePortfolioLoad } from './load-analyzer'
import { calculateBalancingScore } from './balancing-score-engine'
import type { LoadBalancingPlan, PortfolioLoadInput, PortfolioLoadNode } from './types'

export interface BalancingSimulationResult {
  planId: string
  preBalancingScore: number
  postBalancingScore: number
  improvementDelta: number
  loadPressureReduction: number
  conflictReductionEstimate: number
}

function applyPlanEffects(loadNodes: PortfolioLoadNode[], plan: LoadBalancingPlan): PortfolioLoadNode[] {
  const totalReduction = plan.actions.reduce((sum, action) => sum + action.expectedLoadReduction, 0)
  return loadNodes.map((node) => {
    const weight = node.nodeType === 'dependency_pressure' || node.nodeType === 'technical_bandwidth' ? 1.15 : 1
    const reduction = Math.round((totalReduction / loadNodes.length) * weight)
    const currentLoad = Math.max(0, node.currentLoad - reduction)
    const utilizationPercent = Math.max(0, Math.min(100, Math.round((currentLoad / Math.max(1, node.maxCapacity)) * 100)))
    return {
      ...node,
      currentLoad,
      utilizationPercent,
      pressureLevel: utilizationPercent >= 90 ? 'critical' : utilizationPercent >= 75 ? 'strained' : utilizationPercent >= 60 ? 'elevated' : 'stable',
    }
  })
}

export function simulateBalancingImpact(
  input: PortfolioLoadInput,
  baselineNodes: PortfolioLoadNode[],
  plans: LoadBalancingPlan[],
): BalancingSimulationResult[] {
  const preScore = calculateBalancingScore(baselineNodes, input)

  return plans.map((plan) => {
    const adjustedNodes = applyPlanEffects(baselineNodes, plan)
    const postScore = calculateBalancingScore(adjustedNodes, input)
    const prePressure = baselineNodes.reduce((sum, node) => sum + node.utilizationPercent, 0)
    const postPressure = adjustedNodes.reduce((sum, node) => sum + node.utilizationPercent, 0)
    const pressureReduction = Math.max(0, prePressure - postPressure)

    return {
      planId: plan.id,
      preBalancingScore: preScore,
      postBalancingScore: postScore,
      improvementDelta: Math.max(0, postScore - preScore),
      loadPressureReduction: pressureReduction,
      conflictReductionEstimate: Math.round(pressureReduction * 0.45),
    }
  })
}
