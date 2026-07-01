import {
  DASHBOARD_SOURCE_KINDS,
  type DashboardSnapshotStore,
  type DashboardSourceHydrationRequest,
  type DashboardSourceSnapshot,
} from './types'

export function buildDashboardSnapshotKey(input: {
  tenantId: string
  workspaceId?: string
  portfolioId?: string
  sourceKind: string
}): string {
  return [input.tenantId, input.workspaceId ?? '*', input.portfolioId ?? '*', input.sourceKind].join('::')
}

export function createInMemoryDashboardSnapshotStore(): DashboardSnapshotStore {
  const store = new Map<string, DashboardSourceSnapshot>()

  return {
    async saveSnapshot(snapshot) {
      const key = buildDashboardSnapshotKey(snapshot)
      const current = store.get(key)
      if (!current || Date.parse(snapshot.generatedAt) >= Date.parse(current.generatedAt)) {
        store.set(key, snapshot)
      }
    },
    async getLatestSnapshot(request) {
      const key = buildDashboardSnapshotKey(request)
      return store.get(key) ?? null
    },
    async listLatestSnapshots(request: DashboardSourceHydrationRequest) {
      const snapshots = DASHBOARD_SOURCE_KINDS.map((sourceKind) =>
        store.get(buildDashboardSnapshotKey({ ...request, sourceKind })),
      ).filter((v): v is DashboardSourceSnapshot => !!v)

      return snapshots.sort((a, b) => a.sourceKind.localeCompare(b.sourceKind))
    },
  }
}
