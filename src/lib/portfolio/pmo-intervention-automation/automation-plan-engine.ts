import type {
  PMOInterventionCandidate,
  PMOInterventionInput,
  PMOInterventionPlan,
  PMOInterventionUrgency,
} from './types'

const URGENCY_ORDER: Record<PMOInterventionUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function getMinProjectPriority(projectIds: string[], input: PMOInterventionInput): number {
  if (projectIds.length === 0) return 999
  return Math.min(
    ...projectIds.map((pid) => {
      const project = input.portfolioContext.activeProjects.find((p) => p.projectId === pid)
      return project?.priority ?? 999
    })
  )
}

function buildExpectedImpact(interventions: PMOInterventionCandidate[]): string {
  const criticalCount = interventions.filter((i) => i.urgency === 'critical').length
  const highCount = interventions.filter((i) => i.urgency === 'high').length
  const escalationCount = interventions.filter((i) => i.escalationRequired).length

  const parts: string[] = []
  if (criticalCount > 0) parts.push(`${criticalCount} critical intervention(s) addressed`)
  if (highCount > 0) parts.push(`${highCount} high-urgency item(s) actioned`)
  if (escalationCount > 0) parts.push(`${escalationCount} escalation(s) triggered`)
  parts.push('expected to stabilize portfolio health and delivery confidence')

  const sentence = parts.join(', ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

function buildExecutiveSummary(
  interventions: PMOInterventionCandidate[],
  input: PMOInterventionInput
): string {
  const totalProjects = input.portfolioContext.activeProjects.length
  const criticalCount = interventions.filter((i) => i.urgency === 'critical').length
  const topIntervention = interventions[0]
  const topType = topIntervention?.type.replace(/_/g, ' ') ?? 'portfolio review'
  const topProjects = topIntervention?.affectedProjects.join(', ') ?? 'portfolio'
  return (
    `PMFreak detected ${interventions.length} PMO interventions across ${totalProjects} active projects, ` +
    `including ${criticalCount} critical items. ` +
    `Recommended action: prioritize ${topType} for ${topProjects}.`
  )
}

export function generatePMOInterventionPlan(
  interventions: PMOInterventionCandidate[],
  input: PMOInterventionInput
): PMOInterventionPlan {
  const sorted = [...interventions].sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    return getMinProjectPriority(a.affectedProjects, input) - getMinProjectPriority(b.affectedProjects, input)
  })

  return {
    id: 'pmo-intervention-plan',
    title: 'Recommended PMO Intervention Plan',
    interventions: sorted,
    portfolioHealthScore: input.portfolioContext.portfolioHealthScore,
    expectedPortfolioImpact: buildExpectedImpact(sorted),
    executiveSummary: buildExecutiveSummary(sorted, input),
  }
}
