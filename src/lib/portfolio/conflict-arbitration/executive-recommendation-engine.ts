import type { ConflictSeverity, PortfolioConflictType } from './types'

export function generateExecutiveRecommendation(type: PortfolioConflictType, severity: ConflictSeverity): string | undefined {
  if (severity !== 'high' && severity !== 'critical') return undefined

  switch (type) {
    case 'budget_pressure':
      return 'Require finance leadership decision on budget allocation and phased spend controls.'
    case 'priority_inversion':
      return 'Escalate to PMO Director for portfolio reprioritization and resource order reset.'
    case 'dependency_conflict':
      return 'Trigger cross-functional delivery arbitration session to fast-track dependency clearance.'
    case 'technical_capacity_conflict':
      return 'Recommend immediate steering committee review for technical capacity surge authorization.'
    case 'escalation_bottleneck':
      return 'Appoint alternate executive escalation delegate to decongest decision pathways.'
    default:
      return 'Escalate to PMO leadership for immediate portfolio conflict arbitration.'
  }
}
