import { generateArbitrationStrategies } from './arbitration-engine'
import { detectPortfolioConflicts } from './conflict-detector'
import { generateExecutiveRecommendation } from './executive-recommendation-engine'
import { scoreConflictSeverity } from './severity-engine'
import type { PortfolioConflict, PortfolioConflictInput } from './types'

export interface PortfolioConflictArbitrationReport {
  totalProjects: number
  conflictsDetected: number
  criticalConflicts: number
  portfolioHealthScore: number
  conflicts: PortfolioConflict[]
}

const severityPenalty: Record<string, number> = {
  low: 5,
  moderate: 12,
  high: 20,
  critical: 30,
}

export function runPortfolioConflictArbitration(input: PortfolioConflictInput): PortfolioConflictArbitrationReport {
  const candidates = detectPortfolioConflicts(input)

  const conflicts: PortfolioConflict[] = candidates.map((candidate) => {
    const severity = scoreConflictSeverity(candidate, input)
    const arbitrationOptions = generateArbitrationStrategies(candidate)
    const executiveRecommendation = generateExecutiveRecommendation(candidate.type, severity)

    return {
      id: candidate.id,
      type: candidate.type,
      severity,
      involvedProjects: candidate.involvedProjects,
      impactedResources: candidate.impactedResources,
      description: candidate.description,
      rootCause: candidate.rootCause,
      arbitrationOptions,
      executiveRecommendation,
      detectedAt: candidate.detectedAt,
    }
  })

  const criticalConflicts = conflicts.filter((conflict) => conflict.severity === 'critical').length
  const totalPenalty = conflicts.reduce((sum, conflict) => sum + (severityPenalty[conflict.severity] ?? 8), 0)
  const breadthPenalty = Math.max(0, Math.floor((conflicts.length / Math.max(1, input.projects.length)) * 20))
  const portfolioHealthScore = Math.max(0, Math.min(100, 100 - totalPenalty - breadthPenalty))

  return {
    totalProjects: input.projects.length,
    conflictsDetected: conflicts.length,
    criticalConflicts,
    portfolioHealthScore,
    conflicts,
  }
}
