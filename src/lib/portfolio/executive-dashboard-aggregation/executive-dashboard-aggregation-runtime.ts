import { generatePortfolioConflictSummary } from './conflict-summary-engine'
import { generatePortfolioDecisionSummary } from './decision-summary-engine'
import { generatePortfolioExecutiveRecommendation } from './executive-recommendation-engine'
import { generatePortfolioHealthSummary } from './health-summary-engine'
import { generatePortfolioInterventionSummary } from './intervention-summary-engine'
import { generatePortfolioLoadSummary } from './load-summary-engine'
import { generateTopPortfolioRisks } from './risk-priority-engine'
import type { PortfolioDashboardInput, PortfolioExecutiveDashboardReport } from './types'

export function runExecutiveDashboardAggregation(input: PortfolioDashboardInput): PortfolioExecutiveDashboardReport {
  const healthSummary = generatePortfolioHealthSummary(input)
  const conflictSummary = generatePortfolioConflictSummary(input)
  const loadSummary = generatePortfolioLoadSummary(input)
  const decisionSummary = generatePortfolioDecisionSummary(input)
  const interventionSummary = generatePortfolioInterventionSummary(input)
  const topRisks = generateTopPortfolioRisks(input)

  const { topDecisionsNeeded, executiveAttentionAreas, portfolioRecommendation, executiveSummary } =
    generatePortfolioExecutiveRecommendation(
      input,
      healthSummary,
      conflictSummary,
      loadSummary,
      decisionSummary,
      interventionSummary,
      topRisks,
    )

  return {
    generatedAt: new Date().toISOString(),
    healthSummary,
    conflictSummary,
    loadSummary,
    decisionSummary,
    interventionSummary,
    topRisks,
    topDecisionsNeeded,
    executiveAttentionAreas,
    portfolioRecommendation,
    executiveSummary,
  }
}
