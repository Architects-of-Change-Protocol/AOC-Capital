import type { DashboardManualPushRequest, DashboardManualPushReport } from './types'
import { buildManualPushEnvelopes } from './push-envelope-builder'
import { simulateManualTaskPush } from './push-simulation-engine'
import { buildManualTaskPushReport } from './push-report-builder'

export function runDashboardManualTaskPush(
  request: DashboardManualPushRequest,
): DashboardManualPushReport {
  const generatedAt = new Date().toISOString()

  const { eligibilities, envelopes } = buildManualPushEnvelopes({ request, now: generatedAt })

  const simulations = simulateManualTaskPush({ envelopes })

  return buildManualTaskPushReport({
    request,
    eligibilities,
    envelopes,
    simulations,
    generatedAt,
  })
}
