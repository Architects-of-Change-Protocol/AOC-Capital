import type { DashboardApiRequest, DashboardApiError } from './types'

export function validateDashboardApiRequest(input: unknown): {
  valid: boolean
  request?: DashboardApiRequest
  errors: DashboardApiError[]
} {
  if (typeof input !== 'object' || input === null) {
    return {
      valid: false,
      errors: [
        { code: 'missing_tenant_id', message: 'tenantId is required', recoverable: false },
      ],
    }
  }

  const raw = input as Record<string, unknown>
  const errors: DashboardApiError[] = []

  if (!('tenantId' in raw) || raw.tenantId === undefined || raw.tenantId === null) {
    errors.push({ code: 'missing_tenant_id', message: 'tenantId is required', recoverable: false })
  } else if (typeof raw.tenantId !== 'string' || raw.tenantId.trim() === '') {
    errors.push({
      code: 'invalid_tenant_id',
      message: 'tenantId must be a non-empty string',
      recoverable: false,
    })
  }

  if ('workspaceId' in raw && raw.workspaceId !== undefined && typeof raw.workspaceId !== 'string') {
    errors.push({
      code: 'invalid_workspace_id',
      message: 'workspaceId must be a string',
      recoverable: false,
    })
  }

  if ('portfolioId' in raw && raw.portfolioId !== undefined && typeof raw.portfolioId !== 'string') {
    errors.push({
      code: 'invalid_portfolio_id',
      message: 'portfolioId must be a string',
      recoverable: false,
    })
  }

  if ('userId' in raw && raw.userId !== undefined && typeof raw.userId !== 'string') {
    errors.push({
      code: 'invalid_user_id',
      message: 'userId must be a string',
      recoverable: false,
    })
  }

  if (
    'includeSignals' in raw &&
    raw.includeSignals !== undefined &&
    typeof raw.includeSignals !== 'boolean'
  ) {
    errors.push({
      code: 'invalid_include_signals',
      message: 'includeSignals must be a boolean',
      recoverable: false,
    })
  }

  if (
    'includeMetadata' in raw &&
    raw.includeMetadata !== undefined &&
    typeof raw.includeMetadata !== 'boolean'
  ) {
    errors.push({
      code: 'invalid_include_metadata',
      message: 'includeMetadata must be a boolean',
      recoverable: false,
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const request: DashboardApiRequest = {
    tenantId: raw.tenantId as string,
    ...(raw.workspaceId !== undefined && { workspaceId: raw.workspaceId as string }),
    ...(raw.portfolioId !== undefined && { portfolioId: raw.portfolioId as string }),
    ...(raw.userId !== undefined && { userId: raw.userId as string }),
    ...(raw.includeSignals !== undefined && { includeSignals: raw.includeSignals as boolean }),
    ...(raw.includeMetadata !== undefined && { includeMetadata: raw.includeMetadata as boolean }),
  }

  return { valid: true, request, errors: [] }
}
