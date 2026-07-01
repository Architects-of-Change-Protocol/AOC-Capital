export type PortfolioConflictType =
  | 'resource_contention'
  | 'timeline_collision'
  | 'dependency_conflict'
  | 'budget_pressure'
  | 'stakeholder_saturation'
  | 'priority_inversion'
  | 'technical_capacity_conflict'
  | 'escalation_bottleneck'

export type ConflictSeverity = 'low' | 'moderate' | 'high' | 'critical'

export interface ArbitrationStrategy {
  id: string
  title: string
  rationale: string
  recommendedActions: string[]
  expectedImpact: string
  executiveEscalationRequired: boolean
}

export interface PortfolioConflict {
  id: string
  type: PortfolioConflictType
  severity: ConflictSeverity
  involvedProjects: string[]
  impactedResources: string[]
  description: string
  rootCause: string
  arbitrationOptions: ArbitrationStrategy[]
  executiveRecommendation?: string
  detectedAt: string
}

export interface PortfolioProjectInput {
  projectId: string
  projectName: string
  priority: number
  resourceAssignments: string[]
  timelineStart?: string
  timelineEnd?: string
  budgetAllocated?: number
  dependencies?: string[]
  stakeholders?: string[]
  technicalCapacityDemand?: number
}

export interface PortfolioConflictInput {
  projects: PortfolioProjectInput[]
}

export interface PortfolioConflictCandidate {
  id: string
  type: PortfolioConflictType
  involvedProjects: string[]
  impactedResources: string[]
  description: string
  rootCause: string
  detectedAt: string
  metadata: {
    overlapDays?: number
    totalBudgetPressure?: number
    sharedCount?: number
    priorityGap?: number
    technicalDemand?: number
    threshold?: number
    dependencyCount?: number
  }
}
