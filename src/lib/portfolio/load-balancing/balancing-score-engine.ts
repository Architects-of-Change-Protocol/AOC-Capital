import type { PortfolioLoadInput, PortfolioLoadNode } from './types'

function variance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length
}

export function calculateBalancingScore(loadNodes: PortfolioLoadNode[], input: PortfolioLoadInput): number {
  if (loadNodes.length === 0) return 100

  const utilizations = loadNodes.map((node) => node.utilizationPercent)
  const varPenalty = Math.min(20, Math.sqrt(variance(utilizations)) * 0.9)

  const clusterPenalty = Math.min(20, loadNodes.filter((node) => node.utilizationPercent >= 80).length * 4)
  const peakPenalty = Math.min(15, Math.max(0, Math.max(...utilizations) - 75) * 0.6)

  const resourceMap = new Map<string, number>()
  input.projects.forEach((project) => {
    project.resourceAssignments.forEach((resource) => {
      resourceMap.set(resource, (resourceMap.get(resource) ?? 0) + 1)
    })
  })

  const sharedResources = Array.from(resourceMap.values()).filter((count) => count > 1)
  const contentionPenalty = Math.min(15, sharedResources.reduce((sum, count) => sum + (count - 1), 0) * 1.5)

  const dependencyCount = input.projects.reduce((sum, p) => sum + (p.dependencies?.length ?? 0), 0)
  const dependencyRigidityPenalty = Math.min(15, dependencyCount * 1.2)

  const criticalNodes = loadNodes.filter((node) => node.utilizationPercent >= 90).length
  const flexibilityPenalty = Math.min(15, criticalNodes * 5)

  const score = 100 - varPenalty - clusterPenalty - peakPenalty - contentionPenalty - dependencyRigidityPenalty - flexibilityPenalty
  return Math.max(0, Math.min(100, Math.round(score)))
}
