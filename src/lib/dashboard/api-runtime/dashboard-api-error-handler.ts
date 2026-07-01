import { buildFallbackDTO } from './dashboard-api-response-builder'
import type { DashboardApiError, DashboardApiResponse } from './types'

export function buildDashboardApiErrorResponse(errors: DashboardApiError[]): DashboardApiResponse {
  return {
    status: 'error',
    data: buildFallbackDTO(),
    warnings: errors.map((e) => e.message),
  }
}
