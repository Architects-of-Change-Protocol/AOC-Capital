import type { DashboardApprovalActionAvailability, DashboardApprovalQueueCard } from '../approval-queue-ui/index'
import type { DashboardApprovalApproverLane } from '../approval-workflow/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'

export type DashboardActorRole =
  | 'project_manager'
  | 'pmo_director'
  | 'technical_lead'
  | 'finance_lead'
  | 'executive_sponsor'
  | 'security_owner'
  | 'system_owner'
  | 'viewer'
  | 'admin'

export type DashboardAuthorizationCapability =
  | 'view_queue_item'
  | 'view_sensitive_item'
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'trigger_manual_push'
  | 'trigger_live_execution'
  | 'retry_execution'
  | 'cancel_lifecycle'
  | 'override_approval'
  | 'view_audit_trail'

export type DashboardSensitiveItemType = 'financial' | 'executive' | 'security' | 'system' | 'client' | 'none'

export interface DashboardAuthorizationActor {
  id: string
  roles: DashboardActorRole[]
  lanes?: DashboardApprovalApproverLane[]
  tenantId?: string
  workspaceId?: string
}

export interface DashboardAuthorizationContext {
  actor: DashboardAuthorizationActor
  card?: DashboardApprovalQueueCard
  lifecycle?: DashboardTaskLifecycleRecord
  sensitiveType: DashboardSensitiveItemType
  requiredLanes: DashboardApprovalApproverLane[]
}

export interface DashboardAuthorizationDecision {
  capability: DashboardAuthorizationCapability
  allowed: boolean
  reason: string
}

export interface DashboardAuthorizedActionAvailability {
  canView: boolean
  canViewSensitive: boolean
  canApprove: boolean
  canReject: boolean
  canRequestChanges: boolean
  canTriggerManualPush: boolean
  canTriggerLiveExecution: boolean
  canRetryExecution: boolean
  canCancelLifecycle: boolean
  canOverrideApproval: boolean
  canViewAuditTrail: boolean
  disabledReasons: Record<string, string>
}

export interface DashboardRoleAuthorizationInput {
  actor: DashboardAuthorizationActor
  cards?: DashboardApprovalQueueCard[]
  lifecycles?: DashboardTaskLifecycleRecord[]
}

export interface DashboardRoleAuthorizationReport {
  actorId: string
  generatedAt: string
  totalCards: number
  visibleCards: number
  restrictedCards: number
  totalLifecycles: number
  executableLifecycles: number
  retryableLifecycles: number
  cardAuthorizations: { cardId: string; availability: DashboardAuthorizedActionAvailability; decisions: DashboardAuthorizationDecision[] }[]
  lifecycleAuthorizations: { lifecycleId: string; availability: DashboardAuthorizedActionAvailability; decisions: DashboardAuthorizationDecision[] }[]
  executiveSummary: string
}

export type _DashboardApprovalActionAvailabilityReference = DashboardApprovalActionAvailability
