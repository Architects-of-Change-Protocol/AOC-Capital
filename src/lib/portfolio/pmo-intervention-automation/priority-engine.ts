import type { PMOInterventionCandidate, PMOInterventionInput, PMOInterventionUrgency } from './types'

export function assignInterventionUrgency(
  candidate: PMOInterventionCandidate,
  input: PMOInterventionInput
): PMOInterventionUrgency {
  const projects = input.portfolioContext.activeProjects
  const portfolioHealth = input.portfolioContext.portfolioHealthScore
  const affected = projects.filter((p) => candidate.affectedProjects.includes(p.projectId))

  const minHealth = affected.length > 0 ? Math.min(...affected.map((p) => p.healthScore)) : 100
  const maxResourcePressure = affected.length > 0 ? Math.max(...affected.map((p) => p.resourcePressure ?? 0)) : 0
  const maxTimelinePressure = affected.length > 0 ? Math.max(...affected.map((p) => p.timelinePressure ?? 0)) : 0
  const maxStakeholderPressure = affected.length > 0 ? Math.max(...affected.map((p) => p.stakeholderPressure ?? 0)) : 0

  const hasHighPriorityProject = affected.some((p) => p.priority <= 2)
  const hasExecutiveVisibility = affected.some((p) => p.executiveVisibility === true)
  const hasBlocked = affected.some((p) => p.status === 'blocked' || (p.blockers ?? []).length > 0)

  const conflictSeverities = (input.conflictSignals ?? [])
    .filter((c) => c.involvedProjects.some((pid) => candidate.affectedProjects.includes(pid)))
    .map((c) => c.severity)

  const hasCriticalConflict = conflictSeverities.includes('critical')
  const hasHighConflict = conflictSeverities.includes('high')

  // Critical
  if (minHealth < 40) return 'critical'
  if (hasCriticalConflict) return 'critical'
  if (portfolioHealth < 40 && candidate.affectedProjects.length > 1) return 'critical'
  if (hasExecutiveVisibility && hasBlocked && candidate.type === 'executive_arbitration') return 'critical'
  if (candidate.type === 'financial_impediment' && hasHighPriorityProject) return 'critical'

  // High
  if (minHealth < 60) return 'high'
  if (maxResourcePressure >= 80 || maxTimelinePressure >= 80 || maxStakeholderPressure >= 80) return 'high'
  if (hasHighConflict) return 'high'
  if (affected.some((p) => p.clientDependency === true && p.healthScore < 70)) return 'high'
  if (affected.some((p) => p.vendorDependency === true && (p.timelinePressure ?? 0) >= 70)) return 'high'

  // Medium
  if (affected.some((p) => (p.risks ?? []).length > 0)) return 'medium'
  if (affected.some((p) => (p.missingInputs ?? []).length > 0)) return 'medium'
  if (affected.some((p) => (p.pendingDependencies ?? []).length > 0)) return 'medium'

  return 'low'
}
