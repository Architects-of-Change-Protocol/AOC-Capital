import type { DashboardTaskLifecycleRecord } from '../task-lifecycle'
import type { DashboardTaskAdapterKind } from '../task-adapters'
import type { DashboardLiveExecutionResult } from './types'

export function selectExecutableLifecycles(input: {
  lifecycles: DashboardTaskLifecycleRecord[]
  requestedLifecycleIds?: string[]
  requestedAdapters?: DashboardTaskAdapterKind[]
  maxExecutions?: number
}): { selected: DashboardTaskLifecycleRecord[]; skipped: DashboardLiveExecutionResult[] } {
  const selected: DashboardTaskLifecycleRecord[] = []
  const skipped: DashboardLiveExecutionResult[] = []

  for (const lifecycle of input.lifecycles) {
    let message: string | null = null
    if (input.requestedLifecycleIds?.length && !input.requestedLifecycleIds.includes(lifecycle.id)) message = 'Lifecycle is not in requested lifecycle IDs.'
    else if (input.requestedAdapters?.length && !input.requestedAdapters.includes(lifecycle.adapter as DashboardTaskAdapterKind)) message = 'Lifecycle adapter is not requested.'
    else if (lifecycle.status !== 'ready_for_execution') message = 'Lifecycle is not ready for execution.'
    else if (lifecycle.envelope.executionStatus !== 'ready') message = 'Envelope execution status is not ready.'
    else if (!lifecycle.envelope.payload) message = 'Envelope payload is missing.'

    if (message) skipped.push({ lifecycleId: lifecycle.id, envelopeId: lifecycle.envelopeId, adapter: lifecycle.adapter, status: 'skipped', message, retryable: false })
    else selected.push(lifecycle)
  }

  const max = typeof input.maxExecutions === 'number' && input.maxExecutions >= 0 ? input.maxExecutions : selected.length
  return { selected: selected.slice(0, max), skipped }
}
