import type { DecisionImpactProjection, DecisionRiskLevel, ExecutiveDecisionType, PortfolioDecisionInput } from './types'

interface ImpactBase {
  h: number
  rl: number
  tp: number
  be: number
  sl: number
  dr: number
  el: number
}

const IMPACT_BASE: Record<ExecutiveDecisionType, ImpactBase> = {
  resource_reallocation:       { h: +12, rl:   0, tp:  -8, be:   0, sl:  +3, dr:   0, el:   0 },
  timeline_delay:              { h:  +3, rl:  -8, tp: -15, be:  +4, sl:  +6, dr: +10, el:   0 },
  timeline_acceleration:       { h:  +4, rl: +12, tp: +15, be:  +6, sl:  +3, dr:  +5, el:  +2 },
  budget_hold:                 { h:  -8, rl:   0, tp: +12, be: -10, sl:  +4, dr: +10, el:  +3 },
  budget_release:              { h:  +8, rl:   0, tp: -10, be: +12, sl:  +2, dr:  -8, el:   0 },
  scope_reduction:             { h:  +6, rl: -12, tp: -10, be:  -8, sl:  +8, dr:  -4, el:  +2 },
  scope_expansion:             { h:  -8, rl: +15, tp: +12, be: +10, sl:  +4, dr:  +6, el:  +2 },
  priority_override:           { h:  +4, rl:  +4, tp:  -5, be:   0, sl:  +8, dr:  +4, el:  +6 },
  temporary_capacity_addition: { h: +10, rl: -12, tp: -10, be:  +8, sl:   0, dr:  -8, el:   0 },
  executive_escalation:        { h:  +6, rl:   0, tp:  -6, be:   0, sl: +10, dr:  -4, el: +15 },
}

const TYPE_BASE_RISK: Record<ExecutiveDecisionType, number> = {
  resource_reallocation:       2,
  timeline_delay:              3,
  timeline_acceleration:       6,
  budget_hold:                 7,
  budget_release:              3,
  scope_reduction:             4,
  scope_expansion:             7,
  priority_override:           5,
  temporary_capacity_addition: 3,
  executive_escalation:        5,
}

function r1(x: number): number {
  return Math.round(x * 10) / 10
}

function extractMagnitude(decision: PortfolioDecisionInput['decision']): number {
  switch (decision.type) {
    case 'resource_reallocation':
      return decision.resourceDelta !== undefined ? Math.min(Math.abs(decision.resourceDelta) / 50, 1) : 0.5
    case 'timeline_delay':
    case 'timeline_acceleration':
      return decision.timelineDeltaDays !== undefined ? Math.min(Math.abs(decision.timelineDeltaDays) / 30, 1) : 0.5
    case 'budget_hold':
    case 'budget_release':
      return decision.budgetDelta !== undefined ? Math.min(Math.abs(decision.budgetDelta) / 1_000_000, 1) : 0.5
    case 'scope_reduction':
    case 'scope_expansion':
      return decision.scopeDelta !== undefined ? Math.min(Math.abs(decision.scopeDelta) / 50, 1) : 0.5
    case 'priority_override':
      return decision.priorityDelta !== undefined ? Math.min(Math.abs(decision.priorityDelta) / 10, 1) : 0.5
    case 'temporary_capacity_addition':
      return decision.capacityDelta !== undefined ? Math.min(Math.abs(decision.capacityDelta) / 50, 1) : 0.5
    case 'executive_escalation':
      return decision.escalationDelta !== undefined ? Math.min(Math.abs(decision.escalationDelta) / 5, 1) : 0.5
  }
}

function deriveRiskLevel(
  typeBase: number,
  portfolioStressDelta: number,
  dependencyRiskDelta: number,
  stakeholderLoadDelta: number,
  escalationLoadDelta: number,
): DecisionRiskLevel {
  const score =
    typeBase +
    portfolioStressDelta +
    Math.abs(dependencyRiskDelta) * 0.5 +
    Math.abs(stakeholderLoadDelta) * 0.4 +
    Math.abs(escalationLoadDelta) * 0.3

  if (score >= 20) return 'critical'
  if (score >= 12) return 'high'
  if (score >= 5) return 'moderate'
  return 'low'
}

export function simulateExecutiveDecision(input: PortfolioDecisionInput): DecisionImpactProjection {
  const { portfolio, decision } = input
  const totalProjects = portfolio.projects.length
  const affectedCount = decision.affectedProjects.length
  const scale = affectedCount / Math.max(1, totalProjects)
  const M = extractMagnitude(decision)
  const base = IMPACT_BASE[decision.type]

  const healthDelta       = r1(scale * M * base.h)
  const resourceLoadDelta = r1(affectedCount * M * base.rl)
  const timelinePressureDelta = r1(affectedCount * M * base.tp)
  const budgetExposureDelta   = r1(affectedCount * M * base.be)
  const stakeholderLoadDelta  = r1(affectedCount * M * base.sl)
  const dependencyRiskDelta   = r1(affectedCount * M * base.dr)
  const escalationLoadDelta   = r1(affectedCount * M * base.el)

  const portfolioStressDelta = Math.round(
    -healthDelta * 0.35 +
    (resourceLoadDelta / Math.max(1, totalProjects)) * 0.15 +
    (timelinePressureDelta / Math.max(1, totalProjects)) * 0.15 +
    (budgetExposureDelta / Math.max(1, totalProjects)) * 0.10 +
    (stakeholderLoadDelta / Math.max(1, totalProjects)) * 0.10 +
    (dependencyRiskDelta / Math.max(1, totalProjects)) * 0.10 +
    (escalationLoadDelta / Math.max(1, totalProjects)) * 0.05,
  )

  const riskLevel = deriveRiskLevel(
    TYPE_BASE_RISK[decision.type],
    portfolioStressDelta,
    dependencyRiskDelta,
    stakeholderLoadDelta,
    escalationLoadDelta,
  )

  return {
    affectedProjects: decision.affectedProjects,
    healthDelta,
    resourceLoadDelta,
    timelinePressureDelta,
    budgetExposureDelta,
    stakeholderLoadDelta,
    dependencyRiskDelta,
    escalationLoadDelta,
    portfolioStressDelta,
    riskLevel,
  }
}
