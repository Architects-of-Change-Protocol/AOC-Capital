import type { DashboardPersistentLifecycleHydrationResult, DashboardTaskLifecycleStore } from './types'

export async function hydratePersistentLifecycleState(store: DashboardTaskLifecycleStore): Promise<DashboardPersistentLifecycleHydrationResult> {
  const records = await store.listLifecycles()
  const events = await store.listEvents()
  const warnings: string[] = []
  const hasEvent = new Set(events.map((e) => e.lifecycleId))
  for (const record of records) {
    if (!hasEvent.has(record.id)) warnings.push('Lifecycle has no event lineage.')
  }
  return { records, events, warnings }
}
