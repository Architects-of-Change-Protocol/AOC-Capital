import type { DashboardAction } from '../action-center'
import type { DashboardManualPushEnvelope } from '../manual-task-push'
import {
  DEFAULT_DASHBOARD_APPROVAL_POLICY,
  type DashboardApprovalEvaluation,
  type DashboardApprovalPolicy,
} from './types'

export function resolveDashboardApprovalPolicy(
  policy?: Partial<DashboardApprovalPolicy>
): DashboardApprovalPolicy {
  return {
    ...DEFAULT_DASHBOARD_APPROVAL_POLICY,
    ...policy,
    approvalExpiryHours: Math.max(1, policy?.approvalExpiryHours ?? DEFAULT_DASHBOARD_APPROVAL_POLICY.approvalExpiryHours),
  }
}

export function evaluateDashboardApprovalPolicy(input: {
  envelope: DashboardManualPushEnvelope
  action?: DashboardAction
  policy: DashboardApprovalPolicy
}): DashboardApprovalEvaluation {
  const { envelope, action, policy } = input

  if (envelope.mode === 'dry_run' && policy.autoNotRequiredForDryRun) {
    return {
      approvalRequired: false,
      riskLevel: 'low',
      reasons: ['Dry run mode is exempt from approval policy.'],
      requiredApproverLanes: [],
    }
  }

  const reasons: string[] = []
  let approvalRequired = false

  if (envelope.mode === 'ready' && policy.requireApprovalForReadyMode) {
    approvalRequired = true
    reasons.push('Ready mode requires approval before execution.')
  }
  if (action?.priority === 'critical' && policy.requireApprovalForCritical) {
    approvalRequired = true
    reasons.push('Critical priority action requires approval escalation.')
  }
  if (envelope.adapter !== 'internal_runtime' && policy.requireApprovalForExternalAdapters) {
    approvalRequired = true
    reasons.push(`External adapter (${envelope.adapter}) requires approval.`)
  }
  if (action?.type === 'review_financial_exposure' && policy.requireApprovalForFinancialActions) {
    approvalRequired = true
    reasons.push('Financial exposure actions require explicit approval.')
  }
  if (action?.escalationRoute?.required && policy.requireApprovalForExecutiveEscalations) {
    approvalRequired = true
    reasons.push('Escalation-required action requires approval workflow clearance.')
  }

  const riskLevel =
    action?.priority === 'critical' || action?.type === 'review_financial_exposure'
      ? 'critical'
      : (envelope.adapter !== 'internal_runtime' && envelope.mode === 'ready') || action?.escalationRoute?.required
        ? 'high'
        : envelope.mode === 'ready'
          ? 'medium'
          : 'low'

  return {
    approvalRequired,
    riskLevel: approvalRequired ? riskLevel : 'low',
    reasons: reasons.length > 0 ? reasons : ['No approval policy condition matched.'],
    requiredApproverLanes: [],
  }
}
