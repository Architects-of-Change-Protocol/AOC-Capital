import type {
  DashboardTaskProjectionRequest,
  DashboardTaskProjection,
  DashboardTaskProjectionReport,
} from './types'

export function buildDashboardTaskProjectionReport(input: {
  request: DashboardTaskProjectionRequest
  projections: DashboardTaskProjection[]
}): DashboardTaskProjectionReport {
  const { request, projections } = input

  const successfulProjections = projections.filter((p) => p.valid).length
  const failedProjections = projections.filter((p) => !p.valid).length
  const warnings = projections.flatMap((p) => p.warnings)
  const totalActions = request.actions.length
  const totalAdapters = request.adapters.length

  const executiveSummary =
    `PMFreak projected ${totalActions} dashboard action(s) across ${totalAdapters} adapter(s), producing ${successfulProjections} successful task projection(s).`

  return {
    totalActions,
    totalAdapters,
    successfulProjections,
    failedProjections,
    projections,
    warnings,
    executiveSummary,
  }
}
