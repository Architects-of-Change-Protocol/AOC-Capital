import type { DashboardLiveConnector, DashboardLiveConnectorRegistry } from './types'
import type { DashboardTaskAdapterKind } from '../task-adapters'

export function createStaticLiveConnector(input: {
  adapter: DashboardTaskAdapterKind
  externalTaskIdPrefix?: string
  shouldFail?: boolean
  retryable?: boolean
}): DashboardLiveConnector {
  return {
    adapter: input.adapter,
    async execute({ lifecycle, mode }) {
      if (mode === 'dry_run') return { status: 'simulated', message: `Simulated ${input.adapter} connector execution.`, externalTaskId: `simulated:${input.adapter}:${lifecycle.id}` }
      if (input.shouldFail) return { status: 'failed', message: `Connector execution failed for adapter ${input.adapter}.`, retryable: Boolean(input.retryable) }
      const prefix = input.externalTaskIdPrefix ?? 'external'
      return { status: 'created', message: `Connector execution completed for adapter ${input.adapter}.`, externalTaskId: `${prefix}:${input.adapter}:${lifecycle.id}` }
    },
  }
}

export function normalizeConnectorRegistry(connectors?: DashboardLiveConnectorRegistry): DashboardLiveConnectorRegistry {
  if (!connectors) return {}
  const normalized: DashboardLiveConnectorRegistry = {}
  for (const value of Object.values(connectors)) {
    if (value && value.adapter && typeof value.execute === 'function') normalized[value.adapter] = value
  }
  return normalized
}
