import type { PortfolioDashboardInput, PortfolioDecisionSummary } from './types'

function isApproval(recommendation: string): boolean {
  return recommendation === 'approve' || recommendation === 'approve_with_conditions'
}

function isEscalation(recommendation: string): boolean {
  return recommendation === 'escalate'
}

function isRejection(recommendation: string): boolean {
  return recommendation === 'reject'
}

export function generatePortfolioDecisionSummary(input: PortfolioDashboardInput): PortfolioDecisionSummary {
  const reports = input.decisionSimulationReports

  if (!reports || reports.length === 0) {
    return {
      totalDecisionsSimulated: 0,
      approvalsRecommended: 0,
      escalationsRecommended: 0,
      rejectionsRecommended: 0,
      averageConfidenceScore: 0,
      topDecisionItems: [],
      summary: 'No decision simulation data available.',
    }
  }

  const approvalsRecommended = reports.filter((r) => isApproval(r.recommendation)).length
  const escalationsRecommended = reports.filter((r) => isEscalation(r.recommendation)).length
  const rejectionsRecommended = reports.filter((r) => isRejection(r.recommendation)).length

  const averageConfidenceScore =
    Math.round((reports.reduce((sum, r) => sum + r.confidenceScore, 0) / reports.length) * 10) / 10

  const topDecisionItems = reports
    .filter((r) => r.executiveSummary)
    .map((r) => r.executiveSummary as string)
    .slice(0, 5)

  let summary: string
  if (escalationsRecommended > 0) {
    summary = `${reports.length} decisions simulated: ${approvalsRecommended} approvals, ${escalationsRecommended} escalations, ${rejectionsRecommended} rejections. Executive escalation action required.`
  } else {
    summary = `${reports.length} decisions simulated: ${approvalsRecommended} approvals, ${rejectionsRecommended} rejections. Average confidence: ${averageConfidenceScore}%.`
  }

  return {
    totalDecisionsSimulated: reports.length,
    approvalsRecommended,
    escalationsRecommended,
    rejectionsRecommended,
    averageConfidenceScore,
    topDecisionItems,
    summary,
  }
}
