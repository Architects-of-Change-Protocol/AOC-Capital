import type { DashboardSourceHydrationRequest, DashboardSourceSnapshot } from '../source-hydration/types'
import { createPersistentDashboardSnapshotStore, getPersistentSnapshotStoreHealth } from './snapshot-store-factory'
import type {
  PersistentSnapshotStoreConfig,
  PersistentSnapshotStoreHealth,
  PersistentSnapshotStoreProvider,
} from './types'

export function runPersistentSnapshotStoreHealthCheck(config: PersistentSnapshotStoreConfig): PersistentSnapshotStoreHealth {
  return getPersistentSnapshotStoreHealth(config)
}

export async function savePersistentDashboardSnapshot(input: {
  config: PersistentSnapshotStoreConfig
  snapshot: DashboardSourceSnapshot
}): Promise<{ saved: boolean; provider: PersistentSnapshotStoreProvider }> {
  const store = createPersistentDashboardSnapshotStore(input.config)
  await store.saveSnapshot(input.snapshot)
  return { saved: true, provider: input.config.provider }
}

export async function hydratePersistentDashboardSnapshots(input: {
  config: PersistentSnapshotStoreConfig
  request: DashboardSourceHydrationRequest
}): Promise<{ provider: PersistentSnapshotStoreProvider; snapshots: DashboardSourceSnapshot[] }> {
  const store = createPersistentDashboardSnapshotStore(input.config)
  const snapshots = await store.listLatestSnapshots(input.request)
  return { provider: input.config.provider, snapshots }
}
