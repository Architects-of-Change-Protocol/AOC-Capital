import type {
  DashboardTaskLifecycleEvent,
  DashboardTaskLifecycleRecord,
  DashboardTaskLifecycleStore,
} from '../task-lifecycle'

export type { DashboardTaskLifecycleEvent, DashboardTaskLifecycleRecord, DashboardTaskLifecycleStore }

export type DashboardPersistentLifecycleProvider = 'supabase' | 'vault'

export interface DashboardPersistentLifecycleStoreConfig {
  provider: DashboardPersistentLifecycleProvider
  tenantId: string
  workspaceId?: string
  tableName?: string
}

export interface DashboardPersistentLifecycleStoreHealth {
  provider: DashboardPersistentLifecycleProvider
  healthy: boolean
  warnings: string[]
  errors: string[]
}

export interface DashboardPersistentLifecycleHydrationResult {
  records: DashboardTaskLifecycleRecord[]
  events: DashboardTaskLifecycleEvent[]
  warnings: string[]
}

export interface DashboardLifecycleReplayResult {
  replayed: number
  reconstructed: DashboardTaskLifecycleRecord[]
  warnings: string[]
}

export interface DashboardPersistentLifecycleRuntimeReport {
  generatedAt: string
  hydratedRecords: number
  hydratedEvents: number
  replayedRecords: number
  reconciledRecords: number
  warnings: string[]
  healthy: boolean
  executiveSummary: string
}

export const DEFAULT_DASHBOARD_LIFECYCLE_TABLE = 'dashboard_task_lifecycle_records'
