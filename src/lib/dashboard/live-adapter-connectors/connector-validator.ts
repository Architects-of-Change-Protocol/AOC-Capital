import type { DashboardTaskLifecycleRecord } from '../task-lifecycle'
import type { DashboardConnectorValidationResult, DashboardLiveConnector, DashboardLiveConnectorRegistry } from './types'

export function validateLiveConnector(input: { adapter: string; connector?: DashboardLiveConnector }): DashboardConnectorValidationResult {
  const { adapter, connector } = input
  const errors: string[] = []
  if (!connector) errors.push('Connector is missing.')
  else {
    if (connector.adapter !== adapter) errors.push('Connector adapter mismatch.')
    if (typeof connector.execute !== 'function') errors.push('Connector execute function is missing.')
  }
  return { adapter, status: errors.length === 0 ? 'available' : connector ? 'invalid' : 'unavailable', valid: errors.length === 0, warnings: [], errors }
}

export function validateLiveConnectorRegistryForLifecycle(input: {
  lifecycle: DashboardTaskLifecycleRecord
  connectors: DashboardLiveConnectorRegistry
}): DashboardConnectorValidationResult {
  return validateLiveConnector({ adapter: input.lifecycle.adapter, connector: input.connectors[input.lifecycle.adapter as keyof DashboardLiveConnectorRegistry] })
}
