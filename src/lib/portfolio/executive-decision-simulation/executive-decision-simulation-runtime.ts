import { calculatePortfolioBaseline } from './decision-impact-analyzer'
import { simulateExecutiveDecision } from './decision-simulation-engine'
import { calculateDecisionConfidence } from './decision-confidence-engine'
import { generateDecisionTradeoffs } from './tradeoff-engine'
import { generateDecisionRecommendation } from './recommendation-engine'
import type { ExecutiveDecisionSimulationReport, PortfolioDecisionInput } from './types'

function buildExecutiveSummary(
  title: string,
  recommendation: string,
  rationale: string,
  portfolioStressDelta: number,
  confidenceScore: number,
): string {
  const stressDirection = portfolioStressDelta < 0 ? `−${Math.abs(portfolioStressDelta)}` : `+${portfolioStressDelta}`
  return `Decision "${title}" is recommended as ${recommendation.replace(/_/g, ' ')} because ${rationale.charAt(0).toLowerCase()}${rationale.slice(1)} Expected portfolio stress delta: ${stressDirection}. Confidence: ${confidenceScore}.`
}

export function runExecutiveDecisionSimulation(input: PortfolioDecisionInput): ExecutiveDecisionSimulationReport {
  const baseline = calculatePortfolioBaseline(input.portfolio)
  const projection = simulateExecutiveDecision(input)
  const tradeoffs = generateDecisionTradeoffs(input, projection)
  const { recommendation, rationale } = generateDecisionRecommendation(input, baseline, projection, tradeoffs)
  const confidenceScore = calculateDecisionConfidence(input, baseline, projection, tradeoffs)

  const executiveSummary = buildExecutiveSummary(
    input.decision.title,
    recommendation,
    rationale,
    projection.portfolioStressDelta,
    confidenceScore,
  )

  return {
    decisionId: input.decision.id,
    decisionType: input.decision.type,
    baseline,
    projection,
    tradeoffs,
    recommendation,
    recommendationRationale: rationale,
    confidenceScore,
    executiveSummary,
  }
}
