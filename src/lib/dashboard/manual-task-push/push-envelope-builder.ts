import type {
  DashboardManualPushRequest,
  DashboardManualPushEligibility,
  DashboardManualPushEnvelope,
  DashboardManualPushStatus,
  DashboardTaskProjection,
} from './types'
import { filterEligibleManualPushProjections } from './push-eligibility-engine'

export function buildManualPushEnvelope({
  projection,
  eligibility,
  request,
  now,
}: {
  projection: DashboardTaskProjection
  eligibility: DashboardManualPushEligibility
  request: DashboardManualPushRequest
  now?: string
}): DashboardManualPushEnvelope | null {
  if (!eligibility.eligible || !projection.payload) {
    return null
  }

  const createdAt = now ?? new Date().toISOString()
  const ts = Date.parse(createdAt)
  const id = `manual-push:${projection.adapter}:${projection.actionId}:${ts}`

  const executionStatus: DashboardManualPushStatus =
    request.mode === 'dry_run' ? 'simulated' : 'ready'

  return {
    id,
    adapter: projection.adapter,
    actionId: projection.actionId,
    payload: projection.payload,
    mode: request.mode,
    requestedBy: request.requestedBy,
    createdAt,
    executionStatus,
    warnings: eligibility.warnings,
  }
}

export function buildManualPushEnvelopes({
  request,
  now,
}: {
  request: DashboardManualPushRequest
  now?: string
}): {
  eligibilities: DashboardManualPushEligibility[]
  envelopes: DashboardManualPushEnvelope[]
} {
  const { eligibilities, eligibleProjections } = filterEligibleManualPushProjections(request)

  const envelopes: DashboardManualPushEnvelope[] = []

  for (let i = 0; i < request.projections.length; i++) {
    const projection = request.projections[i]
    const eligibility = eligibilities[i]
    if (!eligibility.eligible) continue

    const envelope = buildManualPushEnvelope({ projection, eligibility, request, now })
    if (envelope) {
      envelopes.push(envelope)
    }
  }

  void eligibleProjections

  return { eligibilities, envelopes }
}
