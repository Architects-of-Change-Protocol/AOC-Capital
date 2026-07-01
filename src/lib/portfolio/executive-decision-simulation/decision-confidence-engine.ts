import type { DecisionImpactProjection, DecisionTradeoff, PortfolioBaseline, PortfolioDecisionInput } from './types'

function hasCompleteDeltaFields(decision: PortfolioDecisionInput['decision']): boolean {
  switch (decision.type) {
    case 'resource_reallocation':
      return decision.resourceDelta !== undefined && (decision.sourceProjectId !== undefined || decision.targetProjectId !== undefined)
    case 'timeline_delay':
    case 'timeline_acceleration':
      return decision.timelineDeltaDays !== undefined
    case 'budget_hold':
    case 'budget_release':
      return decision.budgetDelta !== undefined
    case 'scope_reduction':
    case 'scope_expansion':
      return decision.scopeDelta !== undefined
    case 'priority_override':
      return decision.priorityDelta !== undefined && decision.targetProjectId !== undefined
    case 'temporary_capacity_addition':
      return decision.capacityDelta !== undefined
    case 'executive_escalation':
      return decision.escalationDelta !== undefined
  }
}

export function calculateDecisionConfidence(
  input: PortfolioDecisionInput,
  baseline: PortfolioBaseline,
  projection: DecisionImpactProjection,
  tradeoffs: DecisionTradeoff[],
): number {
  let score = 70

  // Data completeness: all relevant delta fields present
  if (hasCompleteDeltaFields(input.decision)) {
    score += 8
  } else {
    score -= 8
  }

  // Source/target project specificity
  if (input.decision.sourceProjectId !== undefined || input.decision.targetProjectId !== undefined) {
    score += 4
  }

  // Affected projects explicitly named
  if (input.decision.affectedProjects.length > 0) {
    score += 3
  }

  // Portfolio baseline stability
  if (baseline.portfolioStressScore < 40) {
    score += 8
  } else if (baseline.portfolioStressScore < 60) {
    score += 4
  } else if (baseline.portfolioStressScore > 85) {
    score -= 12
  } else if (baseline.portfolioStressScore > 70) {
    score -= 6
  }

  // Impact clarity: unambiguous impact increases confidence
  const impactMagnitude = Math.abs(projection.healthDelta) + Math.abs(projection.portfolioStressDelta)
  if (impactMagnitude >= 15) {
    score += 5
  } else if (impactMagnitude < 3) {
    score -= 8
  }

  // Risk level adjustment: lower risk → more confidence in recommendation
  if (projection.riskLevel === 'low') {
    score += 6
  } else if (projection.riskLevel === 'high') {
    score -= 6
  } else if (projection.riskLevel === 'critical') {
    score -= 12
  }

  // Tradeoff coverage: well-identified tradeoffs increase confidence
  if (tradeoffs.length >= 3) {
    score += 4
  } else if (tradeoffs.length < 2) {
    score -= 4
  }

  // Critical tradeoffs signal execution uncertainty
  const criticalTradeoffs = tradeoffs.filter((t) => t.severity === 'critical').length
  score -= criticalTradeoffs * 4

  // Broad portfolio impact with elevated risk reduces confidence
  const affectedRatio = projection.affectedProjects.length / Math.max(1, input.portfolio.projects.length)
  if (affectedRatio > 0.6 && projection.riskLevel !== 'low') {
    score -= 5
  }

  return Math.round(Math.min(100, Math.max(0, score)))
}
