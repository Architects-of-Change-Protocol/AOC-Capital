export type LoadDimension =
  | 'resource_capacity'
  | 'technical_bandwidth'
  | 'timeline_distribution'
  | 'stakeholder_load'
  | 'budget_distribution'
  | 'dependency_pressure'
  | 'escalation_load'

export type LoadPressureLevel = 'stable' | 'elevated' | 'strained' | 'critical'

export type RedistributionActionType =
  | 'resource_reassignment'
  | 'timeline_shift'
  | 'priority_resequence'
  | 'temporary_capacity_increase'
  | 'stakeholder_reallocation'
  | 'budget_phase_shift'
  | 'dependency_resequence'
  | 'escalation_reroute'

export interface PortfolioLoadNode {
  nodeId: string
  nodeType: LoadDimension
  currentLoad: number
  maxCapacity: number
  utilizationPercent: number
  pressureLevel: LoadPressureLevel
}

export interface RedistributionAction {
  id: string
  type: RedistributionActionType
  title: string
  description: string
  sourceProjects: string[]
  targetProjects: string[]
  expectedLoadReduction: number
  projectedHealthGain: number
  implementationComplexity: number
}

export interface LoadBalancingPlan {
  id: string
  actions: RedistributionAction[]
  projectedPortfolioHealthScore: number
  rationale: string
}

export interface PortfolioLoadInput {
  projects: {
    projectId: string
    priority: number
    resourceAssignments: string[]
    technicalDemand: number
    stakeholderDemand: number
    budgetDemand: number
    escalationDemand: number
    timelineWeight: number
    dependencies?: string[]
  }[]
}
