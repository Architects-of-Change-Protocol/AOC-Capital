export type PortfolioDashboardRiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export type PortfolioExecutiveAttentionArea =
  | 'portfolio_health'
  | 'delivery_conflict'
  | 'resource_capacity'
  | 'financial_exposure'
  | 'timeline_pressure'
  | 'stakeholder_alignment'
  | 'dependency_blocker'
  | 'executive_decision'
  | 'pmo_intervention'

export interface PortfolioDashboardInput {
  portfolio: {
    portfolioHealthScore: number
    activeProjectCount: number
    criticalProjectCount: number
    averageProjectHealthScore: number
  }

  conflictReport?: {
    conflictsDetected: number
    criticalConflicts: number
    portfolioHealthScore?: number
    conflicts?: {
      id: string
      type: string
      severity: string
      involvedProjects: string[]
      description?: string
      executiveRecommendation?: string
    }[]
  }

  loadBalancingReport?: {
    currentBalancingScore: number
    projectedImprovement?: number
    operationalRiskLevel: string
    recommendedPlan?: {
      id: string
      title: string
      projectedPortfolioHealthScore: number
      rationale: string
      actions?: {
        id: string
        type: string
        title: string
        targetProjects: string[]
        projectedHealthGain: number
      }[]
    }
  }

  decisionSimulationReports?: {
    decisionId: string
    decisionType: string
    recommendation: string
    recommendationRationale?: string
    confidenceScore: number
    executiveSummary?: string
    projection?: {
      portfolioStressDelta: number
      riskLevel: string
      affectedProjects: string[]
    }
  }[]

  interventionReport?: {
    totalInterventions: number
    criticalInterventions: number
    escalationCount: number
    interventions?: {
      id: string
      type: string
      title: string
      affectedProjects: string[]
      urgency: string
      ownerLane: string
      escalationRequired: boolean
      rationale?: string
    }[]
  }
}

export interface PortfolioHealthSummary {
  portfolioHealthScore: number
  averageProjectHealthScore: number
  activeProjectCount: number
  criticalProjectCount: number
  riskLevel: PortfolioDashboardRiskLevel
  summary: string
}

export interface PortfolioConflictSummary {
  conflictsDetected: number
  criticalConflicts: number
  topConflictTypes: string[]
  executiveEscalationsRequired: number
  summary: string
}

export interface PortfolioLoadSummary {
  currentBalancingScore: number
  operationalRiskLevel: string
  projectedImprovement: number
  recommendedPlanTitle?: string
  topBalancingActions: string[]
  summary: string
}

export interface PortfolioDecisionSummary {
  totalDecisionsSimulated: number
  approvalsRecommended: number
  escalationsRecommended: number
  rejectionsRecommended: number
  averageConfidenceScore: number
  topDecisionItems: string[]
  summary: string
}

export interface PortfolioInterventionSummary {
  totalInterventions: number
  criticalInterventions: number
  escalationCount: number
  topInterventionTypes: string[]
  topOwnerLanes: string[]
  summary: string
}

export interface PortfolioRiskPriority {
  id: string
  title: string
  riskLevel: PortfolioDashboardRiskLevel
  source: 'portfolio' | 'conflict' | 'load' | 'decision' | 'intervention'
  affectedProjects: string[]
  rationale: string
}

export interface PortfolioExecutiveDashboardReport {
  generatedAt: string
  healthSummary: PortfolioHealthSummary
  conflictSummary: PortfolioConflictSummary
  loadSummary: PortfolioLoadSummary
  decisionSummary: PortfolioDecisionSummary
  interventionSummary: PortfolioInterventionSummary
  topRisks: PortfolioRiskPriority[]
  topDecisionsNeeded: string[]
  executiveAttentionAreas: PortfolioExecutiveAttentionArea[]
  portfolioRecommendation: string
  executiveSummary: string
}
