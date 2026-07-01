import { hydrateDashboardSourceData } from './hydration-resolver'
import { buildDashboardHydrationRecoveryPlan } from './recovery-engine'
import { validateDashboardSnapshots } from './snapshot-validator'
import type {
  DashboardHydrationResult,
  DashboardSnapshotStore,
  DashboardSourceHydrationRequest,
  DashboardSourceSnapshot,
} from './types'

export async function runDashboardSourceHydration(input: {
  request: DashboardSourceHydrationRequest
  store: DashboardSnapshotStore
}): Promise<DashboardHydrationResult & { recoveryPlan: ReturnType<typeof buildDashboardHydrationRecoveryPlan> }> {
  const hydration = await hydrateDashboardSourceData(input)
  const recoveryPlan = buildDashboardHydrationRecoveryPlan(hydration)
  return { ...hydration, recoveryPlan }
}

export async function saveDashboardSourceSnapshots(input: {
  store: DashboardSnapshotStore
  snapshots: DashboardSourceSnapshot[]
}): Promise<{ saved: number; invalid: number; errors: string[] }> {
  const validation = validateDashboardSnapshots(input.snapshots)

  for (const snapshot of validation.validSnapshots) {
    await input.store.saveSnapshot(snapshot)
  }

  return { saved: validation.validSnapshots.length, invalid: validation.invalidCount, errors: validation.errors }
}
