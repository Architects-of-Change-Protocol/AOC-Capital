import type { PortfolioDashboardInput, PortfolioInterventionSummary } from './types'

function sortedByFrequency(values: string[]): string[] {
  const freq: Record<string, number> = {}
  for (const v of values) freq[v] = (freq[v] ?? 0) + 1
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
}

export function generatePortfolioInterventionSummary(input: PortfolioDashboardInput): PortfolioInterventionSummary {
  const report = input.interventionReport

  if (!report) {
    return {
      totalInterventions: 0,
      criticalInterventions: 0,
      escalationCount: 0,
      topInterventionTypes: [],
      topOwnerLanes: [],
      summary: 'No PMO intervention data available.',
    }
  }

  const interventions = report.interventions ?? []
  const topInterventionTypes = sortedByFrequency(interventions.map((i) => i.type))
  const topOwnerLanes = sortedByFrequency(interventions.map((i) => i.ownerLane))

  let summary: string
  if (report.criticalInterventions > 0) {
    summary = `${report.totalInterventions} PMO interventions active including ${report.criticalInterventions} critical. ${report.escalationCount} require executive escalation.`
  } else if (report.totalInterventions > 0) {
    summary = `${report.totalInterventions} PMO interventions active. ${report.escalationCount} escalation actions pending.`
  } else {
    summary = 'No active PMO interventions required.'
  }

  return {
    totalInterventions: report.totalInterventions,
    criticalInterventions: report.criticalInterventions,
    escalationCount: report.escalationCount,
    topInterventionTypes,
    topOwnerLanes,
    summary,
  }
}
