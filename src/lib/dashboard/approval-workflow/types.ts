import type {
  DashboardAction,
  DashboardActionOwnerLane,
  DashboardActionPriority,
} from '../action-center'
import type { DashboardManualPushEnvelope } from '../manual-task-push'

export type DashboardApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'expired'
  | 'blocked'

export type DashboardApprovalDecisionType = 'approve' | 'reject' | 'request_changes'

export type DashboardApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type DashboardApprovalApproverLane =
  | 'project_manager'
  | 'pmo_director'
  | 'technical_lead'
  | 'finance_lead'
  | 'executive_sponsor'
  | 'security_owner'
  | 'system_owner'

export interface DashboardApprovalPolicy {
  requireApprovalForCritical: boolean
  requireApprovalForExternalAdapters: boolean
  requireApprovalForFinancialActions: boolean
  requireApprovalForExecutiveEscalations: boolean
  requireApprovalForReadyMode: boolean
  autoNotRequiredForDryRun: boolean
  approvalExpiryHours: number
}

export interface DashboardApprovalRequest {
  id: string
  envelopeId: string
  actionId: string
  adapter: string
  actionTitle: string
  priority: DashboardActionPriority
  ownerLane: DashboardActionOwnerLane
  requestedBy?: string
  requestedAt: string
  status: DashboardApprovalStatus
  riskLevel: DashboardApprovalRiskLevel
  requiredApproverLanes: DashboardApprovalApproverLane[]
  reasons: string[]
  expiresAt?: string
}

export interface DashboardApprovalDecision {
  requestId: string
  decision: DashboardApprovalDecisionType
  decidedBy: string
  decidedAt: string
  comment?: string
}

export interface DashboardApprovalEvaluation {
  approvalRequired: boolean
  riskLevel: DashboardApprovalRiskLevel
  reasons: string[]
  requiredApproverLanes: DashboardApprovalApproverLane[]
}

export interface DashboardApprovalWorkflowInput {
  envelopes: DashboardManualPushEnvelope[]
  actions?: DashboardAction[]
  policy?: Partial<DashboardApprovalPolicy>
  existingRequests?: DashboardApprovalRequest[]
  decisions?: DashboardApprovalDecision[]
  now?: string
}

export interface DashboardApprovalWorkflowReport {
  generatedAt: string
  totalEnvelopes: number
  approvalRequiredCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  blockedCount: number
  requests: DashboardApprovalRequest[]
  decisions: DashboardApprovalDecision[]
  executableEnvelopeIds: string[]
  blockedEnvelopeIds: string[]
  warnings: string[]
  executiveSummary: string
}

export const DEFAULT_DASHBOARD_APPROVAL_POLICY: DashboardApprovalPolicy = {
  requireApprovalForCritical: true,
  requireApprovalForExternalAdapters: true,
  requireApprovalForFinancialActions: true,
  requireApprovalForExecutiveEscalations: true,
  requireApprovalForReadyMode: true,
  autoNotRequiredForDryRun: true,
  approvalExpiryHours: 72,
}
