import { authorizeApprovalQueueCard } from './queue-authorization-engine'
import { authorizeTaskLifecycle } from './lifecycle-authorization-engine'
import { buildDashboardRoleAuthorizationReport } from './authorization-report-builder'
import type { DashboardRoleAuthorizationInput, DashboardRoleAuthorizationReport } from './types'

export function runDashboardRoleAuthorization (input: DashboardRoleAuthorizationInput): DashboardRoleAuthorizationReport {
  const generatedAt = new Date().toISOString()
  const cardAuthorizations = (input.cards ?? []).map(card => authorizeApprovalQueueCard({ actor: input.actor, card }))
  const lifecycleAuthorizations = (input.lifecycles ?? []).map(lifecycle => authorizeTaskLifecycle({ actor: input.actor, lifecycle }))
  return buildDashboardRoleAuthorizationReport({ actor: input.actor, generatedAt, cardAuthorizations, lifecycleAuthorizations })
}
