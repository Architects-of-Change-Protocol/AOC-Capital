import type { DashboardTaskLifecycleRecord } from './types'

function sameState(a: DashboardTaskLifecycleRecord, b: DashboardTaskLifecycleRecord) {
  return a.status === b.status && a.retryCount === b.retryCount && a.updatedAt === b.updatedAt
}

export function reconcilePersistentLifecycleState(input: { hydrated: DashboardTaskLifecycleRecord[]; replayed: DashboardTaskLifecycleRecord[] }) {
  const replayById = new Map(input.replayed.map((x) => [x.id, x]))
  const warnings: string[] = []
  const reconciled = input.hydrated.map((record) => {
    const replayed = replayById.get(record.id)
    if (!replayed || sameState(record, replayed)) return record
    warnings.push('Lifecycle state reconciled from replay.')
    return replayed
  })
  return { reconciled, warnings }
}
