import type {
  PortfolioDashboardInput,
  PortfolioDashboardRiskLevel,
  PortfolioConflictSummary,
  PortfolioDecisionSummary,
  PortfolioExecutiveAttentionArea,
  PortfolioHealthSummary,
  PortfolioInterventionSummary,
  PortfolioLoadSummary,
  PortfolioRiskPriority,
} from './types'

const portfolioRecommendationByRiskLevel: Record<PortfolioDashboardRiskLevel, string> = {
  low: 'Maintain current governance cadence and continue monitoring portfolio signals.',
  moderate: 'Proceed with targeted PMO follow-up and monitor emerging portfolio pressure.',
  high: 'Activate PMO intervention plan and review portfolio load balancing actions.',
  critical: 'Trigger immediate executive portfolio review and approve critical intervention actions.',
}

function hasFinancialIntervention(input: PortfolioDashboardInput): boolean {
  return (input.interventionReport?.interventions ?? []).some(
    (i) => i.type.includes('financial') || i.type.includes('budget') || i.ownerLane.includes('financial'),
  )
}

function hasDeliveryRebaselineIndicator(input: PortfolioDashboardInput): boolean {
  return (input.interventionReport?.interventions ?? []).some(
    (i) => i.type.includes('delivery_rebaseline') || i.type.includes('timeline'),
  )
}

function hasStakeholderAlignmentIntervention(input: PortfolioDashboardInput): boolean {
  return (input.interventionReport?.interventions ?? []).some(
    (i) => i.type.includes('stakeholder') || i.ownerLane.includes('stakeholder'),
  )
}

function hasDependencyUnblockIntervention(input: PortfolioDashboardInput): boolean {
  return (input.interventionReport?.interventions ?? []).some(
    (i) => i.type.includes('dependency') || i.type.includes('unblock'),
  )
}

function buildTopDecisionsNeeded(
  input: PortfolioDashboardInput,
  interventionSummary: PortfolioInterventionSummary,
  decisionSummary: PortfolioDecisionSummary,
  conflictSummary: PortfolioConflictSummary,
  loadSummary: PortfolioLoadSummary,
): string[] {
  const decisions: string[] = []

  if (interventionSummary.criticalInterventions > 0) {
    decisions.push('Approve PMO intervention plan for critical projects')
  }

  if (conflictSummary.executiveEscalationsRequired > 0) {
    decisions.push('Resolve executive arbitration on portfolio conflicts')
  }

  if (loadSummary.operationalRiskLevel === 'high' || loadSummary.operationalRiskLevel === 'critical') {
    decisions.push('Authorize resource rebalancing plan')
  }

  if (decisionSummary.escalationsRecommended > 0) {
    decisions.push('Decide whether to accept portfolio stress increase from simulated decisions')
  }

  if (hasDeliveryRebaselineIndicator(input)) {
    decisions.push('Confirm delivery rebaseline for strained projects')
  }

  if (hasFinancialIntervention(input)) {
    decisions.push('Authorize financial/logistics unblock actions')
  }

  return decisions
}

function buildAttentionAreas(
  input: PortfolioDashboardInput,
  healthSummary: PortfolioHealthSummary,
  conflictSummary: PortfolioConflictSummary,
  loadSummary: PortfolioLoadSummary,
  decisionSummary: PortfolioDecisionSummary,
  interventionSummary: PortfolioInterventionSummary,
): PortfolioExecutiveAttentionArea[] {
  const areas = new Set<PortfolioExecutiveAttentionArea>()

  if (healthSummary.portfolioHealthScore < 65) {
    areas.add('portfolio_health')
  }

  if (conflictSummary.criticalConflicts > 0) {
    areas.add('delivery_conflict')
  }

  if (loadSummary.operationalRiskLevel === 'high' || loadSummary.operationalRiskLevel === 'critical') {
    areas.add('resource_capacity')
  }

  if (hasFinancialIntervention(input)) {
    areas.add('financial_exposure')
  }

  if (hasDeliveryRebaselineIndicator(input)) {
    areas.add('timeline_pressure')
  }

  if (hasStakeholderAlignmentIntervention(input)) {
    areas.add('stakeholder_alignment')
  }

  if (hasDependencyUnblockIntervention(input)) {
    areas.add('dependency_blocker')
  }

  if (decisionSummary.escalationsRecommended > 0) {
    areas.add('executive_decision')
  }

  if (interventionSummary.criticalInterventions > 0) {
    areas.add('pmo_intervention')
  }

  return Array.from(areas)
}

export function generatePortfolioExecutiveRecommendation(
  input: PortfolioDashboardInput,
  healthSummary: PortfolioHealthSummary,
  conflictSummary: PortfolioConflictSummary,
  loadSummary: PortfolioLoadSummary,
  decisionSummary: PortfolioDecisionSummary,
  interventionSummary: PortfolioInterventionSummary,
  topRisks: PortfolioRiskPriority[],
): {
  topDecisionsNeeded: string[]
  executiveAttentionAreas: PortfolioExecutiveAttentionArea[]
  portfolioRecommendation: string
  executiveSummary: string
} {
  const portfolioRecommendation = portfolioRecommendationByRiskLevel[healthSummary.riskLevel]

  const topDecisionsNeeded = buildTopDecisionsNeeded(
    input,
    interventionSummary,
    decisionSummary,
    conflictSummary,
    loadSummary,
  )

  const executiveAttentionAreas = buildAttentionAreas(
    input,
    healthSummary,
    conflictSummary,
    loadSummary,
    decisionSummary,
    interventionSummary,
  )

  const executiveSummary =
    `Portfolio health is ${healthSummary.riskLevel} with ${healthSummary.activeProjectCount} active projects, ` +
    `${conflictSummary.conflictsDetected} conflicts, ${interventionSummary.totalInterventions} PMO interventions, ` +
    `and ${topRisks.length} top risks requiring attention. ` +
    `Recommended action: ${portfolioRecommendation}`

  return {
    topDecisionsNeeded,
    executiveAttentionAreas,
    portfolioRecommendation,
    executiveSummary,
  }
}
