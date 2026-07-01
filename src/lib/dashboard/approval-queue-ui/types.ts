import type {
  DashboardApprovalApproverLane,
  DashboardApprovalDecision,
  DashboardApprovalRequest,
  DashboardApprovalStatus,
} from '../approval-workflow/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'

export type DashboardApprovalQueueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type DashboardApprovalQueueCardState =
  | 'action_required'
  | 'blocked'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'completed'
  | 'retry_attention'

export interface DashboardApprovalActionAvailability {
  canApprove: boolean
  canReject: boolean
  canRequestChanges: boolean
  disabledReason?: string
}

export interface DashboardApprovalDecisionView {
  decision: string
  decidedBy: string
  decidedAt: string
  comment?: string
}

export interface DashboardApprovalQueueCard {
  id: string
  lifecycleId: string
  envelopeId: string
  actionTitle: string
  adapter: string
  severity: DashboardApprovalQueueSeverity
  state: DashboardApprovalQueueCardState
  approvalStatus: DashboardApprovalStatus
  approverLanes: DashboardApprovalApproverLane[]
  lifecycleStatus: string
  retryCount: number
  blockedReason?: string
  decisionHistory: DashboardApprovalDecisionView[]
  actions: DashboardApprovalActionAvailability
}

export interface DashboardApprovalQueueGroup {
  key: string
  label: string
  count: number
  cards: DashboardApprovalQueueCard[]
}

export interface DashboardApprovalQueueSummary {
  totalCards: number
  actionRequired: number
  blocked: number
  approved: number
  rejected: number
  expired: number
  retryAttention: number
  executiveSummary: string
}

export interface DashboardApprovalQueueReport {
  generatedAt: string
  groupsBySeverity: DashboardApprovalQueueGroup[]
  groupsByApproverLane: DashboardApprovalQueueGroup[]
  summary: DashboardApprovalQueueSummary
}

export interface DashboardApprovalQueueRuntimeInput {
  lifecycles: DashboardTaskLifecycleRecord[]
  approvalRequests?: DashboardApprovalRequest[]
  approvalDecisions?: DashboardApprovalDecision[]
  now?: string
}
