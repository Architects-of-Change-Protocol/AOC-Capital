import { resolveExecutionPayload } from './execution-payload-resolver'
import { validateLiveConnector } from './connector-validator'
import type { DashboardLiveConnector, DashboardLiveConnectorExecutionMode, DashboardLiveExecutionResult } from './types'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle'

export async function executeLifecycleThroughConnector(input: {
  lifecycle: DashboardTaskLifecycleRecord
  connector?: DashboardLiveConnector
  mode: DashboardLiveConnectorExecutionMode
  now: string
}): Promise<DashboardLiveExecutionResult> {
  const { lifecycle, connector, mode, now } = input
  const base = { lifecycleId: lifecycle.id, envelopeId: lifecycle.envelopeId, adapter: lifecycle.adapter }
  const payloadResolution = resolveExecutionPayload(lifecycle)
  if (!payloadResolution.valid || !payloadResolution.payload) return { ...base, status: 'failed', message: payloadResolution.errors.join(' '), retryable: false, error: payloadResolution.errors.join(' | ') }

  const validation = validateLiveConnector({ adapter: lifecycle.adapter, connector })
  if (!validation.valid) {
    const message = validation.errors.join(' ')
    if (validation.status === 'unavailable') return { ...base, status: 'skipped', message, retryable: false }
    return { ...base, status: 'failed', message, retryable: false, error: message }
  }


  if (!connector) return { ...base, status: 'failed', message: 'Connector unavailable after validation.', retryable: false, error: 'connector_unavailable' }

  try {
    const response = await connector.execute({ payload: payloadResolution.payload, lifecycle, mode, now })
    if (response.status === 'created') return { ...base, status: 'executed', externalTaskId: response.externalTaskId, message: response.message, retryable: Boolean(response.retryable) }
    if (response.status === 'simulated') return { ...base, status: 'simulated', externalTaskId: response.externalTaskId, message: response.message, retryable: false }
    return { ...base, status: response.retryable ? 'retry_scheduled' : 'failed', externalTaskId: response.externalTaskId, message: response.message, retryable: Boolean(response.retryable) }
  } catch (error) {
    const message = 'Connector execution threw an error.'
    return { ...base, status: 'failed', message, retryable: true, error: `${message} ${(error as Error)?.message ?? 'unknown'}` }
  }
}
