import type { DashboardSourceKind, DashboardSourceSnapshot } from '../source-hydration/types'
import type { DashboardSourceSnapshotRecord } from './types'

export function mapSnapshotToRecord(snapshot: DashboardSourceSnapshot): DashboardSourceSnapshotRecord {
  return {
    id: snapshot.id,
    tenant_id: snapshot.tenantId,
    workspace_id: snapshot.workspaceId ?? null,
    portfolio_id: snapshot.portfolioId ?? null,
    source_kind: snapshot.sourceKind,
    payload: snapshot.payload,
    generated_at: snapshot.generatedAt,
    expires_at: snapshot.expiresAt ?? null,
    schema_version: snapshot.schemaVersion,
    runtime_version: snapshot.runtimeVersion,
  }
}

export function mapRecordToSnapshot(record: DashboardSourceSnapshotRecord): DashboardSourceSnapshot {
  if (
    !record.id ||
    !record.tenant_id ||
    !record.source_kind ||
    !record.generated_at ||
    !record.schema_version ||
    !record.runtime_version
  ) {
    throw new Error('Invalid snapshot record: missing required fields.')
  }
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workspaceId: record.workspace_id ?? undefined,
    portfolioId: record.portfolio_id ?? undefined,
    sourceKind: record.source_kind,
    payload: record.payload,
    generatedAt: record.generated_at,
    expiresAt: record.expires_at ?? undefined,
    schemaVersion: record.schema_version,
    runtimeVersion: record.runtime_version,
  }
}

export function buildSnapshotRecordScopeFilter(input: {
  tenantId: string
  workspaceId?: string
  portfolioId?: string
  sourceKind?: DashboardSourceKind
}): {
  tenant_id: string
  workspace_id: string | null
  portfolio_id: string | null
  source_kind?: DashboardSourceKind
} {
  const filter: {
    tenant_id: string
    workspace_id: string | null
    portfolio_id: string | null
    source_kind?: DashboardSourceKind
  } = {
    tenant_id: input.tenantId,
    workspace_id: input.workspaceId ?? null,
    portfolio_id: input.portfolioId ?? null,
  }
  if (input.sourceKind !== undefined) {
    filter.source_kind = input.sourceKind
  }
  return filter
}
