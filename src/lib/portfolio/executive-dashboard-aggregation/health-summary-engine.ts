import type { PortfolioDashboardInput, PortfolioDashboardRiskLevel, PortfolioHealthSummary } from './types'

function toRiskLevel(score: number): PortfolioDashboardRiskLevel {
  if (score >= 80) return 'low'
  if (score >= 65) return 'moderate'
  if (score >= 45) return 'high'
  return 'critical'
}

const summaryByRiskLevel: Record<PortfolioDashboardRiskLevel, string> = {
  low: 'Portfolio health is stable with limited executive intervention required.',
  moderate: 'Portfolio health is manageable but requires governance attention.',
  high: 'Portfolio health is strained and requires active PMO intervention.',
  critical: 'Portfolio health is critical and requires immediate executive action.',
}

export function generatePortfolioHealthSummary(input: PortfolioDashboardInput): PortfolioHealthSummary {
  const { portfolioHealthScore, averageProjectHealthScore, activeProjectCount, criticalProjectCount } = input.portfolio
  const riskLevel = toRiskLevel(portfolioHealthScore)

  return {
    portfolioHealthScore,
    averageProjectHealthScore,
    activeProjectCount,
    criticalProjectCount,
    riskLevel,
    summary: summaryByRiskLevel[riskLevel],
  }
}
