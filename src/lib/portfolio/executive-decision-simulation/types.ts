export type ExecutiveDecisionType =
  | 'resource_reallocation'
  | 'timeline_delay'
  | 'timeline_acceleration'
  | 'budget_hold'
  | 'budget_release'
  | 'scope_reduction'
  | 'scope_expansion'
  | 'priority_override'
  | 'temporary_capacity_addition'
  | 'executive_escalation'

export type DecisionRiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export type DecisionRecommendation =
  | 'approve'
  | 'approve_with_conditions'
  | 'defer'
  | 'reject'
  | 'escalate'

export interface PortfolioDecisionInput {
  portfolio: {
    projects: {
      projectId: string
      projectName?: string
      priority: number
      healthScore: number
      resourceLoad: number
      timelinePressure: number
      budgetExposure: number
      stakeholderLoad: number
      dependencyRisk: number
      escalationLoad: number
    }[]
  }
  decision: {
    id: string
    type: ExecutiveDecisionType
    title: string
    description: string
    affectedProjects: string[]
    sourceProjectId?: string
    targetProjectId?: string
    resourceDelta?: number
    timelineDeltaDays?: number
    budgetDelta?: number
    scopeDelta?: number
    priorityDelta?: number
    capacityDelta?: number
    escalationDelta?: number
  }
}

export interface PortfolioBaseline {
  averageHealthScore: number
  totalResourceLoad: number
  totalTimelinePressure: number
  totalBudgetExposure: number
  totalStakeholderLoad: number
  totalDependencyRisk: number
  totalEscalationLoad: number
  portfolioStressScore: number
}

export interface DecisionImpactProjection {
  affectedProjects: string[]
  healthDelta: number
  resourceLoadDelta: number
  timelinePressureDelta: number
  budgetExposureDelta: number
  stakeholderLoadDelta: number
  dependencyRiskDelta: number
  escalationLoadDelta: number
  portfolioStressDelta: number
  riskLevel: DecisionRiskLevel
}

export interface DecisionTradeoff {
  id: string
  title: string
  positiveImpact: string
  negativeImpact: string
  affectedProjects: string[]
  severity: DecisionRiskLevel
}

export interface ExecutiveDecisionSimulationReport {
  decisionId: string
  decisionType: ExecutiveDecisionType
  baseline: PortfolioBaseline
  projection: DecisionImpactProjection
  tradeoffs: DecisionTradeoff[]
  recommendation: DecisionRecommendation
  recommendationRationale: string
  confidenceScore: number
  executiveSummary: string
}
