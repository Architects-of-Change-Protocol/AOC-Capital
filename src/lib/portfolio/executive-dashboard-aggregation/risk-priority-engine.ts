import type { PortfolioDashboardInput, PortfolioDashboardRiskLevel, PortfolioRiskPriority } from './types'

const riskOrder: Record<PortfolioDashboardRiskLevel, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
}

const sourceOrder: Record<PortfolioRiskPriority['source'], number> = {
  portfolio: 0,
  conflict: 1,
  load: 2,
  decision: 3,
  intervention: 4,
}

function toLoadRiskLevel(operationalRiskLevel: string): PortfolioDashboardRiskLevel | null {
  if (operationalRiskLevel === 'critical') return 'critical'
  if (operationalRiskLevel === 'high') return 'high'
  return null
}

function toDecisionRiskLevel(riskLevel: string): PortfolioDashboardRiskLevel | null {
  if (riskLevel === 'critical') return 'critical'
  if (riskLevel === 'high') return 'high'
  return null
}

export function generateTopPortfolioRisks(input: PortfolioDashboardInput): PortfolioRiskPriority[] {
  const risks: PortfolioRiskPriority[] = []

  const { portfolioHealthScore, activeProjectCount } = input.portfolio
  if (portfolioHealthScore < 65) {
    const riskLevel: PortfolioDashboardRiskLevel = portfolioHealthScore < 45 ? 'critical' : 'high'
    risks.push({
      id: 'risk-portfolio-health',
      title: 'Portfolio health below governance threshold',
      riskLevel,
      source: 'portfolio',
      affectedProjects: [],
      rationale: `Portfolio health score of ${portfolioHealthScore} is below the acceptable threshold across ${activeProjectCount} active projects.`,
    })
  }

  const conflicts = input.conflictReport?.conflicts ?? []
  for (const conflict of conflicts) {
    if (conflict.severity !== 'high' && conflict.severity !== 'critical') continue
    const riskLevel: PortfolioDashboardRiskLevel = conflict.severity === 'critical' ? 'critical' : 'high'
    risks.push({
      id: `risk-conflict-${conflict.id}`,
      title: `${conflict.type} conflict requires resolution`,
      riskLevel,
      source: 'conflict',
      affectedProjects: conflict.involvedProjects,
      rationale: conflict.description ?? `Active ${conflict.severity} ${conflict.type} conflict across ${conflict.involvedProjects.length} projects.`,
    })
  }

  const loadReport = input.loadBalancingReport
  if (loadReport) {
    const loadRiskLevel = toLoadRiskLevel(loadReport.operationalRiskLevel)
    if (loadRiskLevel) {
      risks.push({
        id: 'risk-load-operational',
        title: `Portfolio load operational risk: ${loadReport.operationalRiskLevel}`,
        riskLevel: loadRiskLevel,
        source: 'load',
        affectedProjects: [],
        rationale: `Current balancing score of ${loadReport.currentBalancingScore} places portfolio at ${loadReport.operationalRiskLevel} operational risk.`,
      })
    }
  }

  const decisionReports = input.decisionSimulationReports ?? []
  for (const sim of decisionReports) {
    if (!sim.projection) continue
    const decisionRiskLevel = toDecisionRiskLevel(sim.projection.riskLevel)
    if (!decisionRiskLevel) continue
    risks.push({
      id: `risk-decision-${sim.decisionId}`,
      title: `Decision simulation risk: ${sim.decisionType}`,
      riskLevel: decisionRiskLevel,
      source: 'decision',
      affectedProjects: sim.projection.affectedProjects,
      rationale: sim.recommendationRationale ?? `Decision simulation projects ${sim.projection.riskLevel} portfolio stress delta of ${sim.projection.portfolioStressDelta}.`,
    })
  }

  const interventions = input.interventionReport?.interventions ?? []
  for (const intervention of interventions) {
    if (intervention.urgency !== 'critical' && intervention.urgency !== 'high') continue
    const riskLevel: PortfolioDashboardRiskLevel = intervention.urgency === 'critical' ? 'critical' : 'high'
    risks.push({
      id: `risk-intervention-${intervention.id}`,
      title: intervention.title,
      riskLevel,
      source: 'intervention',
      affectedProjects: intervention.affectedProjects,
      rationale: intervention.rationale ?? `${intervention.urgency} urgency PMO intervention in ${intervention.ownerLane} lane requires escalation.`,
    })
  }

  return risks
    .sort((a, b) => {
      const byRisk = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      if (byRisk !== 0) return byRisk
      return sourceOrder[a.source] - sourceOrder[b.source]
    })
    .slice(0, 10)
}
