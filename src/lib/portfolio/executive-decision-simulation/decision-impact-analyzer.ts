import type { PortfolioBaseline, PortfolioDecisionInput } from './types'

export function calculatePortfolioBaseline(portfolio: PortfolioDecisionInput['portfolio']): PortfolioBaseline {
  const projects = portfolio.projects
  const count = projects.length

  if (count === 0) {
    return {
      averageHealthScore: 0,
      totalResourceLoad: 0,
      totalTimelinePressure: 0,
      totalBudgetExposure: 0,
      totalStakeholderLoad: 0,
      totalDependencyRisk: 0,
      totalEscalationLoad: 0,
      portfolioStressScore: 0,
    }
  }

  const totalResourceLoad = projects.reduce((sum, p) => sum + p.resourceLoad, 0)
  const totalTimelinePressure = projects.reduce((sum, p) => sum + p.timelinePressure, 0)
  const totalBudgetExposure = projects.reduce((sum, p) => sum + p.budgetExposure, 0)
  const totalStakeholderLoad = projects.reduce((sum, p) => sum + p.stakeholderLoad, 0)
  const totalDependencyRisk = projects.reduce((sum, p) => sum + p.dependencyRisk, 0)
  const totalEscalationLoad = projects.reduce((sum, p) => sum + p.escalationLoad, 0)
  const totalHealthScore = projects.reduce((sum, p) => sum + p.healthScore, 0)

  const averageHealthScore = Math.round((totalHealthScore / count) * 10) / 10

  const dimensionAvg =
    (totalResourceLoad + totalTimelinePressure + totalBudgetExposure + totalStakeholderLoad + totalDependencyRisk + totalEscalationLoad) /
    (count * 6)

  // Stress blends raw dimension average with health inversion: high-dimension load
  // under low portfolio health amplifies overall portfolio stress.
  const portfolioStressScore = Math.round(Math.min(100, Math.max(0, dimensionAvg * 0.6 + (100 - averageHealthScore) * 0.4)))

  return {
    averageHealthScore,
    totalResourceLoad,
    totalTimelinePressure,
    totalBudgetExposure,
    totalStakeholderLoad,
    totalDependencyRisk,
    totalEscalationLoad,
    portfolioStressScore,
  }
}
