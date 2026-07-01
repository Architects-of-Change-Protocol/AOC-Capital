import type { PortfolioDashboardInput, PortfolioLoadSummary } from './types'

export function generatePortfolioLoadSummary(input: PortfolioDashboardInput): PortfolioLoadSummary {
  const report = input.loadBalancingReport

  if (!report) {
    const fallbackScore = input.portfolio.portfolioHealthScore
    return {
      currentBalancingScore: fallbackScore,
      operationalRiskLevel: 'unknown',
      projectedImprovement: 0,
      recommendedPlanTitle: undefined,
      topBalancingActions: [],
      summary: 'No load balancing report available. Portfolio balance state derived from health score.',
    }
  }

  const topBalancingActions = (report.recommendedPlan?.actions ?? []).map((a) => a.title)

  const riskLevel = report.operationalRiskLevel
  let summary: string
  if (riskLevel === 'critical') {
    summary = 'Portfolio load is critically imbalanced. Immediate redistribution action required.'
  } else if (riskLevel === 'high') {
    summary = 'Portfolio load is high risk. PMO-led rebalancing plan activation recommended.'
  } else if (riskLevel === 'elevated' || riskLevel === 'managed') {
    summary = 'Portfolio load is elevated. Targeted redistribution actions are recommended.'
  } else {
    summary = 'Portfolio load is within controlled parameters. Continue monitoring.'
  }

  return {
    currentBalancingScore: report.currentBalancingScore,
    operationalRiskLevel: riskLevel,
    projectedImprovement: report.projectedImprovement ?? 0,
    recommendedPlanTitle: report.recommendedPlan?.title,
    topBalancingActions,
    summary,
  }
}
