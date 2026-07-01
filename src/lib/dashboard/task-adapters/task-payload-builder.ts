import type { DashboardAction } from '../action-center'
import type { DashboardTaskAdapterKind, DashboardProjectedTaskPayload } from './types'
import { getDashboardTaskAdapterCapabilities } from './adapter-capability-engine'

const PRIORITY_MAP: Record<string, string> = {
  critical: 'highest',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

function buildDescription(action: DashboardAction): string {
  const parts: string[] = [
    action.description,
    `Rationale: ${action.rationale}`,
    `Owner Lane: ${action.ownerLane}`,
    `Execution Lane: ${action.executionLane}`,
    `Escalation Required: ${action.escalationRoute.required ? 'Yes' : 'No'}`,
  ]
  if (action.escalationRoute.required && action.escalationRoute.reason) {
    parts.push(`Escalation Reason: ${action.escalationRoute.reason}`)
  }
  if (action.evidenceRequired.length > 0) {
    parts.push(`Evidence Required (${action.evidenceRequired.length}): ${action.evidenceRequired.join(', ')}`)
  }
  return parts.join('\n')
}

export function buildDashboardTaskPayload(input: {
  adapter: DashboardTaskAdapterKind
  action: DashboardAction
}): DashboardProjectedTaskPayload {
  const { adapter, action } = input
  const cap = getDashboardTaskAdapterCapabilities(adapter)

  const payload: DashboardProjectedTaskPayload = {
    adapter,
    title: action.title,
    description: buildDescription(action),
    priority: cap.supportsPriority ? (PRIORITY_MAP[action.priority] ?? action.priority) : '',
    metadata: {
      actionId: action.id,
      executionLane: action.executionLane,
      ownerLane: action.ownerLane,
      escalationRequired: action.escalationRoute.required,
      evidenceRequiredCount: action.evidenceRequired.length,
      source: action.source,
    },
  }

  if (cap.supportsLabels) {
    payload.labels = [
      `priority:${action.priority}`,
      `lane:${action.executionLane}`,
      `owner:${action.ownerLane}`,
    ]
  }

  if (cap.supportsDueDate && action.sla?.responseDueHours) {
    payload.dueHours = action.sla.responseDueHours
  }

  return payload
}
