import type { DashboardAuthorizationActor } from '../role-authorization/index'
import type { DashboardEnforcementDecisionStatus, DashboardScopeContext } from './types'

export function enforceDashboardScope ({ actor, scope }: { actor?: DashboardAuthorizationActor; scope?: DashboardScopeContext }): { allowed: boolean; status: DashboardEnforcementDecisionStatus; errors: string[]; warnings: string[] } {
  if (!actor) return { allowed: false, status: 'unauthenticated', errors: ['Authentication is required.'], warnings: [] }

  const errors: string[] = []
  const warnings: string[] = []

  if (actor.tenantId && scope?.resourceTenantId && actor.tenantId !== scope.resourceTenantId) errors.push('Actor tenant does not match resource tenant.')
  if (actor.workspaceId && scope?.resourceWorkspaceId && actor.workspaceId !== scope.resourceWorkspaceId) errors.push('Actor workspace does not match resource workspace.')
  if (scope?.tenantId && actor.tenantId && scope.tenantId !== actor.tenantId) errors.push('Actor tenant does not match requested tenant scope.')
  if (scope?.workspaceId && actor.workspaceId && scope.workspaceId !== actor.workspaceId) errors.push('Actor workspace does not match requested workspace scope.')

  if (errors.length > 0) return { allowed: false, status: 'scope_conflict', errors, warnings }

  const missingTenantData = !(actor.tenantId && (scope?.tenantId || scope?.resourceTenantId))
  const missingWorkspaceData = !(actor.workspaceId && (scope?.workspaceId || scope?.resourceWorkspaceId))
  if (missingTenantData || missingWorkspaceData) warnings.push('Scope context incomplete; enforcement used available actor/resource data.')

  return { allowed: true, status: 'allowed', errors, warnings }
}
