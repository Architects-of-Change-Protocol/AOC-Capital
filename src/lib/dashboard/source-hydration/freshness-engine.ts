import {
  DASHBOARD_SOURCE_KINDS,
  type DashboardSourceFreshness,
  type DashboardSourceKind,
  type DashboardSourceSnapshot,
} from './types'

export function calculateSourceFreshness(
  snapshot: DashboardSourceSnapshot | null,
  sourceKind: DashboardSourceKind,
  maxAgeMinutes = 60,
): DashboardSourceFreshness {
  if (!snapshot) {
    return { sourceKind, status: 'missing', freshnessScore: 0, reason: 'Source snapshot is missing.' }
  }

  const generatedAtMs = Date.parse(snapshot.generatedAt)
  if (Number.isNaN(generatedAtMs)) {
    return { sourceKind, status: 'invalid', freshnessScore: 0, reason: 'Source snapshot generatedAt is invalid.' }
  }

  if (snapshot.expiresAt) {
    const expiresAtMs = Date.parse(snapshot.expiresAt)
    if (!Number.isNaN(expiresAtMs) && Date.now() > expiresAtMs) {
      return {
        sourceKind,
        status: 'stale',
        freshnessScore: 25,
        reason: 'Source snapshot has expired.',
        ageMinutes: Math.max(0, (Date.now() - generatedAtMs) / 60000),
      }
    }
  }

  const ageMinutes = Math.max(0, (Date.now() - generatedAtMs) / 60000)

  if (ageMinutes <= maxAgeMinutes) {
    return {
      sourceKind,
      status: 'fresh',
      ageMinutes,
      freshnessScore: 100 - Math.min(40, (ageMinutes / maxAgeMinutes) * 40),
      reason: 'Source snapshot is fresh.',
    }
  }

  if (ageMinutes <= maxAgeMinutes * 3) {
    return {
      sourceKind,
      status: 'stale',
      ageMinutes,
      freshnessScore: 60 - Math.min(35, ((ageMinutes - maxAgeMinutes) / (maxAgeMinutes * 2)) * 35),
      reason: 'Source snapshot is stale.',
    }
  }

  return {
    sourceKind,
    status: 'stale',
    ageMinutes,
    freshnessScore: 10,
    reason: 'Source snapshot is severely stale.',
  }
}

export function calculateAllSourceFreshness(
  snapshots: DashboardSourceSnapshot[],
  maxAgeMinutes = 60,
): DashboardSourceFreshness[] {
  return DASHBOARD_SOURCE_KINDS.map((sourceKind) => {
    const snapshot = snapshots.find((candidate) => candidate.sourceKind === sourceKind) ?? null
    return calculateSourceFreshness(snapshot, sourceKind, maxAgeMinutes)
  })
}
