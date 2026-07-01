import type { PortfolioDashboardInput, PortfolioConflictSummary } from './types'

function countByFrequency(values: string[]): string[] {
  const freq: Record<string, number> = {}
  for (const v of values) freq[v] = (freq[v] ?? 0) + 1
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
}

export function generatePortfolioConflictSummary(input: PortfolioDashboardInput): PortfolioConflictSummary {
  const report = input.conflictReport

  if (!report) {
    return {
      conflictsDetected: 0,
      criticalConflicts: 0,
      topConflictTypes: [],
      executiveEscalationsRequired: 0,
      summary: 'No conflict data available. Portfolio conflict state is nominal.',
    }
  }

  const conflicts = report.conflicts ?? []
  const topConflictTypes = countByFrequency(conflicts.map((c) => c.type))

  const executiveEscalationsRequired = conflicts.filter(
    (c) => c.severity === 'high' || c.severity === 'critical' || !!c.executiveRecommendation,
  ).length

  const criticalConflicts = report.criticalConflicts

  let summary: string
  if (criticalConflicts > 0) {
    summary = `${report.conflictsDetected} portfolio conflicts detected including ${criticalConflicts} critical. Executive arbitration required.`
  } else if (report.conflictsDetected > 0) {
    summary = `${report.conflictsDetected} portfolio conflicts detected. Governance review recommended.`
  } else {
    summary = 'No active portfolio conflicts detected.'
  }

  return {
    conflictsDetected: report.conflictsDetected,
    criticalConflicts,
    topConflictTypes,
    executiveEscalationsRequired,
    summary,
  }
}
