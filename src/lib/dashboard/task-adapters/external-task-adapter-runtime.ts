import type { DashboardTaskProjectionRequest, DashboardTaskProjectionReport } from './types'
import { projectDashboardActions } from './adapter-projection-engine'
import { buildDashboardTaskProjectionReport } from './adapter-report-builder'

export function runDashboardTaskAdapterRuntime(
  request: DashboardTaskProjectionRequest,
): DashboardTaskProjectionReport {
  const normalizedRequest: DashboardTaskProjectionRequest = {
    actions: request.actions ?? [],
    adapters: request.adapters ?? [],
  }

  const projections = projectDashboardActions(normalizedRequest)
  return buildDashboardTaskProjectionReport({ request: normalizedRequest, projections })
}
