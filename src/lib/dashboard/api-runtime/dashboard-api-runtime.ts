import { validateDashboardApiRequest } from './request-validator'
import { resolveDashboardSourceData } from './source-data-resolver'
import { buildDashboardApiResponse } from './dashboard-api-response-builder'
import { buildDashboardApiErrorResponse } from './dashboard-api-error-handler'
import type { DashboardApiResponse, DashboardSourceData } from './types'

export function runDashboardApiRuntime(
  requestInput: unknown,
  preloadedSourceData?: DashboardSourceData,
): DashboardApiResponse {
  const validation = validateDashboardApiRequest(requestInput)

  if (!validation.valid || !validation.request) {
    return buildDashboardApiErrorResponse(validation.errors)
  }

  const { sourceData, warnings } = resolveDashboardSourceData(
    validation.request,
    preloadedSourceData,
  )

  return buildDashboardApiResponse({
    request: validation.request,
    sourceData,
    warnings,
  })
}
