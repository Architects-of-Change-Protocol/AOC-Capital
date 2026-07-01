import type {
  DashboardManualPushEnvelope,
  DashboardManualPushSimulation,
  DashboardManualPushStatus,
} from './types'

export function simulateManualTaskPush({
  envelopes,
}: {
  envelopes: DashboardManualPushEnvelope[]
}): DashboardManualPushSimulation[] {
  return envelopes.map((envelope) => {
    if (envelope.mode === 'dry_run') {
      const status: DashboardManualPushStatus = 'simulated'
      return {
        envelopeId: envelope.id,
        adapter: envelope.adapter,
        actionId: envelope.actionId,
        status,
        simulatedExternalId: `simulated:${envelope.adapter}:${envelope.actionId}`,
        message: 'Manual push simulated; no external task was created.',
      }
    }

    const status: DashboardManualPushStatus = 'ready'
    return {
      envelopeId: envelope.id,
      adapter: envelope.adapter,
      actionId: envelope.actionId,
      status,
      simulatedExternalId: undefined,
      message: 'Manual push envelope is ready for explicit connector execution.',
    }
  })
}
