import type { DashboardAction } from '../action-center'
import type {
  DashboardTaskAdapterKind,
  DashboardTaskProjection,
  DashboardTaskProjectionRequest,
} from './types'
import { validateDashboardTaskProjection } from './adapter-validator'
import { buildDashboardTaskPayload } from './task-payload-builder'

export function projectDashboardActionToAdapter(input: {
  adapter: DashboardTaskAdapterKind
  action: DashboardAction
}): DashboardTaskProjection {
  const { adapter, action } = input
  const { valid, warnings, errors } = validateDashboardTaskProjection(input)

  if (!valid) {
    return { adapter, actionId: action.id, valid: false, warnings, errors }
  }

  const payload = buildDashboardTaskPayload(input)
  return { adapter, actionId: action.id, valid: true, payload, warnings, errors }
}

export function projectDashboardActions(
  request: DashboardTaskProjectionRequest,
): DashboardTaskProjection[] {
  const projections: DashboardTaskProjection[] = []

  for (const action of request.actions) {
    for (const adapter of request.adapters) {
      projections.push(projectDashboardActionToAdapter({ adapter, action }))
    }
  }

  return projections
}
