import type { ConflictSeverity, PortfolioConflictCandidate, PortfolioConflictInput } from './types'

const TYPE_BASE_WEIGHTS: Record<string, number> = {
  resource_contention: 18,
  timeline_collision: 14,
  dependency_conflict: 16,
  budget_pressure: 17,
  stakeholder_saturation: 13,
  priority_inversion: 19,
  technical_capacity_conflict: 20,
  escalation_bottleneck: 15,
}

export function scoreConflictSeverity(candidate: PortfolioConflictCandidate, input: PortfolioConflictInput): ConflictSeverity {
  const involved = candidate.involvedProjects.length
  const involvedProjects = input.projects.filter((project) => candidate.involvedProjects.includes(project.projectId))

  const breadthScore = Math.min(20, involved * 4)
  const strategicWeight = Math.min(15, Math.max(0, 15 - Math.min(...involvedProjects.map((p) => p.priority))))

  const daysToDelivery = involvedProjects
    .map((p) => (p.timelineEnd ? Math.ceil((Date.parse(p.timelineEnd) - Date.now()) / 86_400_000) : 90))
    .reduce((acc, value) => Math.min(acc, value), 90)
  const proximityScore = daysToDelivery <= 14 ? 14 : daysToDelivery <= 30 ? 9 : 4

  const dependencyScore = candidate.type === 'dependency_conflict' ? 12 : (candidate.metadata.dependencyCount ?? 0) > 1 ? 6 : 0
  const scarcityScore = Math.min(12, (candidate.metadata.sharedCount ?? candidate.impactedResources.length) * 3)
  const impactScore = candidate.type === 'technical_capacity_conflict' || candidate.type === 'priority_inversion' ? 14 : 9
  const visibilityScore = candidate.type === 'budget_pressure' || candidate.type === 'escalation_bottleneck' ? 10 : 4

  const totalScore =
    (TYPE_BASE_WEIGHTS[candidate.type] ?? 10) +
    breadthScore +
    strategicWeight +
    proximityScore +
    dependencyScore +
    scarcityScore +
    impactScore +
    visibilityScore

  if (totalScore >= 85) return 'critical'
  if (totalScore >= 70) return 'high'
  if (totalScore >= 45) return 'moderate'
  return 'low'
}
