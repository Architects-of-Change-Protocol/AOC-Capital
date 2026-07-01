import { normalizeConnectorRegistry } from './connector-registry'
import { selectExecutableLifecycles } from './execution-selector'
import { executeLifecycleThroughConnector } from './connector-execution-engine'
import { applyLiveExecutionResultToLifecycle, buildDashboardLiveExecutionReport } from './execution-result-engine'
import type { DashboardLiveExecutionReport, DashboardLiveExecutionRequest, DashboardLiveExecutionResult } from './types'

export async function runDashboardLiveAdapterConnectorRuntime(request: DashboardLiveExecutionRequest): Promise<DashboardLiveExecutionReport> {
  const generatedAt = request.now ?? new Date().toISOString()
  const connectors = normalizeConnectorRegistry(request.connectors)
  const lifecycles = await request.store.listLifecycles()
  const selection = selectExecutableLifecycles({
    lifecycles,
    requestedLifecycleIds: request.requestedLifecycleIds,
    requestedAdapters: request.requestedAdapters,
    maxExecutions: request.maxExecutions,
  })

  const results: DashboardLiveExecutionResult[] = [...selection.skipped]
  const events = []

  for (const lifecycle of selection.selected) {
    const connector = connectors[lifecycle.adapter as keyof typeof connectors]
    const result = await executeLifecycleThroughConnector({ lifecycle, connector, mode: request.mode, now: generatedAt })
    const applied = await applyLiveExecutionResultToLifecycle({ lifecycle, result, store: request.store, actor: request.actor, now: generatedAt })
    results.push(result)
    events.push(applied.event)
  }

  return buildDashboardLiveExecutionReport({ generatedAt, mode: request.mode, results, events })
}
