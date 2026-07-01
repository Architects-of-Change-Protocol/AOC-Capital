import type { DashboardTaskLifecycleRecord } from '../task-lifecycle'
import type { DashboardProjectedTaskPayload } from '../task-adapters'

export function resolveExecutionPayload(lifecycle: DashboardTaskLifecycleRecord): { valid: boolean; payload?: DashboardProjectedTaskPayload; errors: string[] } {
  const payload = lifecycle.envelope.payload
  const errors: string[] = []
  if (!payload) errors.push('Envelope payload is missing.')
  if (payload && !payload.title) errors.push('Payload title is missing.')
  if (payload && !payload.description) errors.push('Payload description is missing.')
  if (payload && !payload.adapter) errors.push('Payload adapter is missing.')
  return { valid: errors.length === 0, payload: errors.length === 0 ? payload : undefined, errors }
}
