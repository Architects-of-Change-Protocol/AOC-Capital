import type {
  DashboardTaskAdapterKind,
  DashboardTaskProjection,
  DashboardProjectedTaskPayload,
} from '../task-adapters'

export type { DashboardTaskAdapterKind, DashboardTaskProjection, DashboardProjectedTaskPayload }

export type DashboardManualPushMode = 'dry_run' | 'ready'

export type DashboardManualPushStatus = 'eligible' | 'ineligible' | 'skipped' | 'ready' | 'simulated'

export interface DashboardManualPushRequest {
  projections: DashboardTaskProjection[]
  mode: DashboardManualPushMode
  requestedAdapters?: DashboardTaskAdapterKind[]
  requestedActionIds?: string[]
  manualTriggerConfirmed: boolean
  requestedBy?: string
}

export interface DashboardManualPushEligibility {
  projectionId: string
  adapter: DashboardTaskAdapterKind
  actionId: string
  eligible: boolean
  reasons: string[]
  warnings: string[]
}

export interface DashboardManualPushEnvelope {
  id: string
  adapter: DashboardTaskAdapterKind
  actionId: string
  payload: DashboardProjectedTaskPayload
  mode: DashboardManualPushMode
  requestedBy?: string
  createdAt: string
  executionStatus: DashboardManualPushStatus
  warnings: string[]
}

export interface DashboardManualPushSimulation {
  envelopeId: string
  adapter: DashboardTaskAdapterKind
  actionId: string
  status: DashboardManualPushStatus
  simulatedExternalId?: string
  message: string
}

export interface DashboardManualPushReport {
  mode: DashboardManualPushMode
  generatedAt: string
  totalProjections: number
  eligibleCount: number
  ineligibleCount: number
  envelopeCount: number
  simulatedCount: number
  skippedCount: number
  envelopes: DashboardManualPushEnvelope[]
  simulations: DashboardManualPushSimulation[]
  warnings: string[]
  executiveSummary: string
}
