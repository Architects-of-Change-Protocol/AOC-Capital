import type {
  DashboardManualPushRequest,
  DashboardManualPushEligibility,
  DashboardManualPushEnvelope,
  DashboardManualPushSimulation,
  DashboardManualPushReport,
} from './types'

export function buildManualTaskPushReport({
  request,
  eligibilities,
  envelopes,
  simulations,
  generatedAt,
}: {
  request: DashboardManualPushRequest
  eligibilities: DashboardManualPushEligibility[]
  envelopes: DashboardManualPushEnvelope[]
  simulations: DashboardManualPushSimulation[]
  generatedAt: string
}): DashboardManualPushReport {
  const totalProjections = request.projections.length
  const eligibleCount = eligibilities.filter((e) => e.eligible).length
  const ineligibleCount = eligibilities.filter((e) => !e.eligible).length
  const envelopeCount = envelopes.length
  const simulatedCount = simulations.filter((s) => s.status === 'simulated').length
  const skippedCount = totalProjections - envelopeCount

  const warnings: string[] = []

  if (!request.manualTriggerConfirmed) {
    warnings.push('Manual trigger was not confirmed. No envelopes were built.')
  }

  for (const eligibility of eligibilities) {
    for (const w of eligibility.warnings) {
      if (!warnings.includes(w)) {
        warnings.push(w)
      }
    }
  }

  let executiveSummary: string

  if (!request.manualTriggerConfirmed) {
    executiveSummary =
      'Manual task push was not executed because explicit trigger confirmation was missing.'
  } else if (envelopeCount === 0) {
    executiveSummary = 'No task projections were eligible for manual push.'
  } else if (request.mode === 'dry_run') {
    executiveSummary = `PMFreak simulated ${envelopeCount} manual task push envelope(s); no external tasks were created.`
  } else {
    executiveSummary = `PMFreak prepared ${envelopeCount} manual task push envelope(s) for explicit connector execution.`
  }

  return {
    mode: request.mode,
    generatedAt,
    totalProjections,
    eligibleCount,
    ineligibleCount,
    envelopeCount,
    simulatedCount,
    skippedCount,
    envelopes,
    simulations,
    warnings,
    executiveSummary,
  }
}
