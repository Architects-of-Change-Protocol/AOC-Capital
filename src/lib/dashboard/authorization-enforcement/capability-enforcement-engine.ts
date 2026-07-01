import {
  buildDashboardAuthorizationContext,
  evaluateAuthorizationCapability,
  resolveActorCapabilities,
} from '../role-authorization/index'
import { mapEnforcementStatusToHttpStatus } from './enforcement-response-builder'
import { enforceDashboardScope } from './scope-enforcement-engine'
import type {
  DashboardAuthorizationEnforcementRequest,
  DashboardAuthorizationEnforcementResult,
} from './types'

export function enforceDashboardCapabilities (request: DashboardAuthorizationEnforcementRequest): DashboardAuthorizationEnforcementResult {
  if (!request.actor) {
    return { status: 'unauthenticated', allowed: false, resourceType: request.resourceType, decisions: [], errors: ['Authentication is required.'], warnings: [], httpStatus: mapEnforcementStatusToHttpStatus('unauthenticated') }
  }

  const scope = enforceDashboardScope({ actor: request.actor, scope: request.scope })
  if (!scope.allowed) {
    return { status: scope.status, allowed: false, resourceType: request.resourceType, decisions: [], errors: scope.errors, warnings: scope.warnings, httpStatus: mapEnforcementStatusToHttpStatus(scope.status) }
  }

  const warnings = [...scope.warnings]
  const decisions = request.requiredCapabilities.map(capability => {
    if (!request.card && !request.lifecycle && capability === 'view_queue_item') {
      const roleCaps = resolveActorCapabilities(request.actor!)
      const allowed = roleCaps.includes(capability)
      return { capability, allowed, reason: allowed ? 'Actor role grants this capability.' : 'Actor role does not grant this capability.' }
    }
    const context = buildDashboardAuthorizationContext({ actor: request.actor!, card: request.card, lifecycle: request.lifecycle })
    return evaluateAuthorizationCapability({ capability, context })
  })
  const allowed = decisions.every(decision => decision.allowed)
  const status = allowed ? 'allowed' : 'unauthorized'

  return {
    status,
    allowed,
    resourceType: request.resourceType,
    decisions,
    errors: allowed ? [] : decisions.filter(d => !d.allowed).map(d => d.reason),
    warnings,
    httpStatus: mapEnforcementStatusToHttpStatus(status),
  }
}
