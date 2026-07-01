import type {
  DashboardAuthorizationApiError,
  DashboardAuthorizationEnforcementResult,
  DashboardEnforcementDecisionStatus,
} from './types'

export function mapEnforcementStatusToHttpStatus (status: DashboardEnforcementDecisionStatus): number {
  if (status === 'allowed') return 200
  if (status === 'unauthenticated') return 401
  if (status === 'unauthorized') return 403
  if (status === 'scope_conflict') return 409
  if (status === 'invalid_context') return 400
  if (status === 'not_found') return 404
  return 400
}

export function buildDashboardAuthorizationApiError (result: DashboardAuthorizationEnforcementResult): DashboardAuthorizationApiError {
  const error =
    result.status === 'unauthenticated'
      ? 'Authentication is required.'
      : result.status === 'unauthorized'
        ? 'Actor is not authorized for this dashboard operation.'
        : result.status === 'scope_conflict'
          ? 'Actor scope does not match dashboard resource scope.'
          : result.status === 'invalid_context'
            ? 'Authorization context is invalid.'
            : result.status === 'not_found'
              ? 'Requested dashboard authorization resource was not found.'
              : 'Authorization allowed.'

  return {
    ok: false,
    status: result.status,
    error,
    errors: [...result.errors],
    warnings: [...result.warnings],
  }
}
