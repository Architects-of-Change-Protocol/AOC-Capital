import type {
  DashboardApprovalDecision,
  DashboardApprovalDecisionType,
  DashboardApprovalRequest,
  DashboardApprovalStatus,
} from '../approval-workflow/index'
import type {
  DashboardTaskLifecycleEvent,
  DashboardTaskLifecycleRecord,
  DashboardTaskLifecycleStore,
} from '../task-lifecycle/index'
import type { DashboardAuthorizationActor, DashboardAuthorizationDecision } from '../role-authorization/index'

export type DashboardApprovalMutationDecision = 'approve' | 'reject' | 'request_changes' | 'defer'

export type DashboardApprovalMutationStatus =
  | 'accepted'
  | 'rejected'
  | 'unauthorized'
  | 'invalid'
  | 'not_found'
  | 'conflict'

export interface DashboardApprovalMutationRequest {
  requestId: string
  envelopeId: string
  lifecycleId?: string
  decision: DashboardApprovalMutationDecision
  comment?: string
  actor: DashboardAuthorizationActor
  decidedAt?: string
}

export interface DashboardApprovalMutationContext {
  approvalRequest?: DashboardApprovalRequest
  lifecycle?: DashboardTaskLifecycleRecord
  store: DashboardTaskLifecycleStore
}

export interface DashboardApprovalMutationValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface DashboardApprovalMutationAuthorizationResult {
  authorized: boolean
  decisions: DashboardAuthorizationDecision[]
  reason: string
}

export interface DashboardApprovalMutationResult {
  status: DashboardApprovalMutationStatus
  requestId: string
  envelopeId: string
  lifecycleId?: string
  approvalStatus?: DashboardApprovalStatus
  lifecycleStatus?: string
  decision?: DashboardApprovalDecision
  event?: DashboardTaskLifecycleEvent
  authorization?: DashboardApprovalMutationAuthorizationResult
  errors: string[]
  warnings: string[]
}

export interface DashboardApprovalMutationRuntimeInput {
  mutation: DashboardApprovalMutationRequest
  context: DashboardApprovalMutationContext
  now?: string
}

export interface DashboardApprovalMutationApiResponse {
  ok: boolean
  result: DashboardApprovalMutationResult
}

export type _DashboardApprovalDecisionTypeReference = DashboardApprovalDecisionType
