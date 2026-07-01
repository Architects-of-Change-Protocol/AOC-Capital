import type { DashboardTaskLifecycleEvent, DashboardTaskLifecycleRecord, DashboardTaskLifecycleStatus, DashboardTaskLifecycleStore } from '../task-lifecycle'
import type {
  DashboardLiveConnectorExecutionMode,
  DashboardLiveExecutionReport,
  DashboardLiveExecutionResult,
} from './types'

function mapStatus(result: DashboardLiveExecutionResult, lifecycle: DashboardTaskLifecycleRecord): DashboardTaskLifecycleStatus {
  if (result.status === 'executed') return 'execution_completed'
  if (result.status === 'simulated') return 'execution_simulated'
  if (result.status === 'failed') return 'execution_failed'
  if (result.status === 'retry_scheduled') return 'execution_failed'
  return lifecycle.status
}

export async function applyLiveExecutionResultToLifecycle(input: {
  lifecycle: DashboardTaskLifecycleRecord
  result: DashboardLiveExecutionResult
  store: DashboardTaskLifecycleStore
  actor?: string
  now: string
}): Promise<{ lifecycle: DashboardTaskLifecycleRecord; event: DashboardTaskLifecycleEvent }> {
  const { lifecycle, result, store, actor, now } = input
  const previousStatus = lifecycle.status
  const nextStatus = mapStatus(result, lifecycle)
  const updated: DashboardTaskLifecycleRecord = {
    ...lifecycle,
    status: nextStatus,
    externalTaskId: result.externalTaskId ?? lifecycle.externalTaskId,
    retryCount: lifecycle.retryCount + (result.status === 'retry_scheduled' ? 1 : 0),
    updatedAt: now,
  }
  const eventType = result.status === 'executed' ? 'execution_completed' : result.status === 'simulated' ? 'execution_simulated' : result.status === 'failed' ? 'execution_failed' : result.status === 'retry_scheduled' ? 'retry_scheduled' : 'reconciled'
  const event: DashboardTaskLifecycleEvent = {
    id: `lifecycle-event:${lifecycle.id}:${result.status}:${new Date(now).getTime()}`,
    lifecycleId: lifecycle.id,
    eventType,
    occurredAt: now,
    actor,
    message: result.message,
    metadata: { adapter: result.adapter, externalTaskId: result.externalTaskId, retryable: result.retryable, error: result.error, previousStatus, nextStatus },
  }
  await store.saveLifecycle(updated)
  await store.saveEvent(event)
  return { lifecycle: updated, event }
}

export function buildDashboardLiveExecutionReport(input: {
  generatedAt: string
  mode: DashboardLiveConnectorExecutionMode
  results: DashboardLiveExecutionResult[]
  events: DashboardTaskLifecycleEvent[]
}): DashboardLiveExecutionReport {
  const count = (s: DashboardLiveExecutionResult['status']) => input.results.filter((r) => r.status === s).length
  const executed = count('executed'), simulated = count('simulated'), skipped = count('skipped'), failed = count('failed'), retryScheduled = count('retry_scheduled')
  const warnings = input.results.filter((r) => r.status === 'skipped' || r.status === 'failed' || Boolean(r.error)).map((r) => `${r.lifecycleId}: ${r.message}${r.error ? ` (${r.error})` : ''}`)
  let executiveSummary = 'No live adapter connector execution occurred.'
  if (executed > 0) executiveSummary = `PMFreak executed ${executed} lifecycle record(s) through live adapter connectors.`
  else if (simulated > 0) executiveSummary = `PMFreak simulated ${simulated} lifecycle connector execution(s); no external tasks were created.`
  else if (failed > 0) executiveSummary = `PMFreak failed to execute ${failed} lifecycle record(s).`
  else if (skipped > 0) executiveSummary = `PMFreak skipped ${skipped} lifecycle record(s); no eligible connector execution occurred.`
  return { generatedAt: input.generatedAt, mode: input.mode, attempted: input.results.length, executed, simulated, skipped, failed, retryScheduled, results: input.results, events: input.events, warnings, executiveSummary }
}
