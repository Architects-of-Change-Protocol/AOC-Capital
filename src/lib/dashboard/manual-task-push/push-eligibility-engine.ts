import type {
  DashboardManualPushRequest,
  DashboardManualPushEligibility,
  DashboardTaskProjection,
} from './types'

export function evaluateManualPushEligibility({
  projection,
  request,
}: {
  projection: DashboardTaskProjection
  request: DashboardManualPushRequest
}): DashboardManualPushEligibility {
  const projectionId = `${projection.adapter}:${projection.actionId}`
  const reasons: string[] = []
  const warnings: string[] = [...projection.warnings]

  if (!request.manualTriggerConfirmed) {
    reasons.push('Manual trigger was not confirmed.')
  }

  if (!projection.valid) {
    reasons.push('Projection is invalid.')
  }

  if (!projection.payload) {
    reasons.push('Projection payload is missing.')
  }

  if (request.requestedAdapters && !request.requestedAdapters.includes(projection.adapter)) {
    reasons.push('Adapter was not requested.')
  }

  if (request.requestedActionIds && !request.requestedActionIds.includes(projection.actionId)) {
    reasons.push('Action was not requested.')
  }

  if (projection.errors.length > 0) {
    reasons.push('Projection contains errors.')
  }

  if (projection.adapter === 'email_queue') {
    warnings.push('Email queue projection requires human review before sending.')
  }

  const eligible = reasons.length === 0
  if (eligible) {
    reasons.push('Projection is eligible for manual push.')
  }

  return {
    projectionId,
    adapter: projection.adapter,
    actionId: projection.actionId,
    eligible,
    reasons,
    warnings,
  }
}

export function filterEligibleManualPushProjections(request: DashboardManualPushRequest): {
  eligibilities: DashboardManualPushEligibility[]
  eligibleProjections: DashboardTaskProjection[]
} {
  const eligibilities = request.projections.map((projection) =>
    evaluateManualPushEligibility({ projection, request }),
  )

  const eligibleProjections = request.projections.filter((_, i) => eligibilities[i].eligible)

  return { eligibilities, eligibleProjections }
}
