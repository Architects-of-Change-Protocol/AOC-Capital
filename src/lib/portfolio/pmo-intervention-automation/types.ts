export type PMOInterventionType =
  | 'financial_impediment'
  | 'executive_arbitration'
  | 'resource_reassignment'
  | 'client_input_request'
  | 'scope_freeze'
  | 'dependency_unblock'
  | 'vendor_logistics_followup'
  | 'technical_validation_session'
  | 'stakeholder_alignment'
  | 'risk_control_review'
  | 'delivery_rebaseline'
  | 'escalation_cadence'

export type PMOInterventionUrgency = 'low' | 'medium' | 'high' | 'critical'

export type PMOInterventionStatus =
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled'

export type PMOOwnerLane =
  | 'project_manager'
  | 'pmo_director'
  | 'technical_lead'
  | 'finance_lead'
  | 'logistics_lead'
  | 'executive_sponsor'
  | 'client_owner'
  | 'vendor_owner'

export interface PMOInterventionInput {
  portfolioContext: {
    portfolioHealthScore: number
    activeProjects: {
      projectId: string
      projectName?: string
      priority: number
      healthScore: number
      status?: string
      blockers?: string[]
      risks?: string[]
      missingInputs?: string[]
      pendingDependencies?: string[]
      financialExposure?: number
      resourcePressure?: number
      timelinePressure?: number
      stakeholderPressure?: number
      vendorDependency?: boolean
      clientDependency?: boolean
      executiveVisibility?: boolean
    }[]
  }

  conflictSignals?: {
    conflictId: string
    type: string
    severity: string
    involvedProjects: string[]
    executiveRecommendation?: string
  }[]

  loadBalancingSignals?: {
    currentBalancingScore: number
    operationalRiskLevel: string
    recommendedPlanId?: string
    projectedImprovement?: number
  }

  decisionSimulationSignals?: {
    decisionId: string
    recommendation: string
    confidenceScore: number
    riskLevel?: string
    portfolioStressDelta?: number
  }[]
}

export interface PMOInterventionCandidate {
  id: string
  type: PMOInterventionType
  title: string
  description: string
  affectedProjects: string[]
  urgency: PMOInterventionUrgency
  ownerLane: PMOOwnerLane
  requiredEvidence: string[]
  recommendedCadence: string
  escalationRequired: boolean
  status: PMOInterventionStatus
  rationale: string
}

export interface PMOInterventionPlan {
  id: string
  title: string
  interventions: PMOInterventionCandidate[]
  portfolioHealthScore: number
  expectedPortfolioImpact: string
  executiveSummary: string
}

export interface PMOInterventionAutomationReport {
  totalInterventions: number
  criticalInterventions: number
  escalationCount: number
  recommendedPlan: PMOInterventionPlan
  interventions: PMOInterventionCandidate[]
}
