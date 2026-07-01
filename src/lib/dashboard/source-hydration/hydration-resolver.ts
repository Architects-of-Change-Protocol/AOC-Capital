import { calculateAllSourceFreshness } from './freshness-engine'
import { validateDashboardSnapshots } from './snapshot-validator'
import {
  DASHBOARD_SOURCE_KINDS,
  type DashboardHydrationResult,
  type DashboardSnapshotStore,
  type DashboardSourceCompleteness,
  type DashboardSourceHydrationRequest,
  type DashboardSourceKind,
  type DashboardSourceSnapshot,
} from './types'

function computeCompleteness(
  validSnapshots: DashboardSourceSnapshot[],
  invalidSourceKinds: DashboardSourceKind[],
): DashboardSourceCompleteness {
  const presentSources = DASHBOARD_SOURCE_KINDS.filter((kind) => validSnapshots.some((s) => s.sourceKind === kind))
  const missingSources = DASHBOARD_SOURCE_KINDS.filter((kind) => !presentSources.includes(kind))
  const requiredSourcesPresent = presentSources.includes('executive_dashboard_report')

  let completenessScore = 0
  if (presentSources.length === 4) completenessScore = 100
  else if (requiredSourcesPresent) completenessScore = 70
  else if (presentSources.length > 0) completenessScore = 40

  return { requiredSourcesPresent, presentSources, missingSources, invalidSources: invalidSourceKinds, completenessScore }
}

function computeRiskLevel(result: {
  completeness: DashboardSourceCompleteness
  executiveFreshness?: { status: string }
  executivePresent: boolean
  executiveInvalid: boolean
}): DashboardHydrationResult['riskLevel'] {
  if (result.executiveInvalid || (!result.executivePresent && result.completeness.presentSources.length === 0)) return 'critical'
  if (!result.executivePresent && result.completeness.presentSources.length > 0) return 'high'
  if (result.executiveFreshness?.status === 'fresh' && result.completeness.completenessScore >= 70) return 'low'
  if (result.executiveFreshness?.status === 'stale' && result.completeness.completenessScore >= 70) return 'moderate'
  return 'critical'
}

export async function hydrateDashboardSourceData(input: {
  request: DashboardSourceHydrationRequest
  store: DashboardSnapshotStore
}): Promise<DashboardHydrationResult> {
  const rawSnapshots = await input.store.listLatestSnapshots(input.request)
  const validation = validateDashboardSnapshots(rawSnapshots)
  const freshness = calculateAllSourceFreshness(validation.validSnapshots, input.request.maxAgeMinutes ?? 60)

  const invalidSourceKinds = DASHBOARD_SOURCE_KINDS.filter(
    (kind) => !validation.validSnapshots.some((s) => s.sourceKind === kind) && rawSnapshots.some((s) => s.sourceKind === kind),
  )

  const completeness = computeCompleteness(validation.validSnapshots, invalidSourceKinds)
  const sourceData: DashboardHydrationResult['sourceData'] = {}

  for (const snapshot of validation.validSnapshots) {
    if (snapshot.sourceKind === 'executive_dashboard_report') sourceData.executiveDashboardReport = snapshot.payload
    if (snapshot.sourceKind === 'intervention_report') sourceData.interventionReport = snapshot.payload
    if (snapshot.sourceKind === 'decision_simulation_reports') sourceData.decisionSimulationReports = snapshot.payload
    if (snapshot.sourceKind === 'conflict_report') sourceData.conflictReport = snapshot.payload
  }

  const executiveFreshness = freshness.find((item) => item.sourceKind === 'executive_dashboard_report')
  const executiveInvalid = completeness.invalidSources.includes('executive_dashboard_report')
  const riskLevel = computeRiskLevel({
    completeness,
    executiveFreshness,
    executivePresent: !!sourceData.executiveDashboardReport,
    executiveInvalid,
  })

  const warnings: string[] = []
  if (!sourceData.executiveDashboardReport) warnings.push('Missing executive dashboard report.')
  freshness.filter((entry) => entry.status === 'stale').forEach((entry) => warnings.push(`Stale source: ${entry.sourceKind}.`))
  if (validation.invalidCount > 0) warnings.push('Invalid snapshots present.')
  completeness.missingSources
    .filter((sourceKind) => sourceKind !== 'executive_dashboard_report')
    .forEach((sourceKind) => warnings.push(`Optional source missing: ${sourceKind}.`))

  return { sourceData, snapshots: validation.validSnapshots, freshness, completeness, riskLevel, warnings }
}
