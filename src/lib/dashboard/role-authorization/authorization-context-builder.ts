import type { DashboardApprovalApproverLane } from '../approval-workflow/index'
import type { DashboardApprovalQueueCard } from '../approval-queue-ui/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import type { DashboardAuthorizationActor, DashboardAuthorizationContext, DashboardSensitiveItemType } from './types'

const FINANCIAL_PATTERNS = ['finance', 'financial', 'budget', 'payment', 'invoice', 'po']

function includesAny (value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase()
  return patterns.some(pattern => lower.includes(pattern))
}

function getLanes (card?: DashboardApprovalQueueCard, lifecycle?: DashboardTaskLifecycleRecord): DashboardApprovalApproverLane[] {
  if (card) return card.approverLanes
  return lifecycle?.approvalRequest?.requiredApproverLanes ?? []
}

export function inferSensitiveItemType ({ card, lifecycle }: { card?: DashboardApprovalQueueCard; lifecycle?: DashboardTaskLifecycleRecord }): DashboardSensitiveItemType {
  const lanes = getLanes(card, lifecycle)
  const searchable = [card?.actionTitle, card?.adapter, card?.lifecycleStatus, lifecycle?.adapter, lifecycle?.status, lifecycle?.envelope?.payload?.title, lifecycle?.envelope?.payload?.description].filter(Boolean).join(' ')
  if (includesAny(searchable, FINANCIAL_PATTERNS)) return 'financial'
  if (lanes.includes('executive_sponsor') || includesAny(searchable, ['executive'])) return 'executive'
  if (lanes.includes('security_owner') || includesAny(searchable, ['security'])) return 'security'
  if (card?.adapter === 'internal_runtime' || card?.adapter === 'system_runtime' || lifecycle?.adapter === 'internal_runtime' || lifecycle?.adapter === 'system_runtime' || lanes.includes('system_owner') || lifecycle?.status === 'execution_failed' || lifecycle?.status?.includes('retry')) return 'system'
  if (includesAny(searchable, ['client'])) return 'client'
  return 'none'
}

export function buildDashboardAuthorizationContext ({ actor, card, lifecycle }: { actor: DashboardAuthorizationActor; card?: DashboardApprovalQueueCard; lifecycle?: DashboardTaskLifecycleRecord }): DashboardAuthorizationContext {
  return {
    actor,
    card,
    lifecycle,
    requiredLanes: getLanes(card, lifecycle),
    sensitiveType: inferSensitiveItemType({ card, lifecycle }),
  }
}
