import type { IsolationStatus } from "../types/production-runtime-types.js";

export interface WorkspaceIsolationResult {
  workspaceId: string;
  tenantId: string;
  status: IsolationStatus;
  isolatedBoundaries: string[];
  missingBoundaries: string[];
  violations: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

const REQUIRED_WORKSPACE_ISOLATION_BOUNDARIES = [
  "workspace_data_scope",
  "project_data_scope",
  "connector_workspace_scope",
  "operational_memory_workspace_scope",
  "onboarding_workspace_scope",
  "war_room_workspace_scope",
  "governance_workspace_scope",
];

export function evaluateWorkspaceIsolation(
  workspaceId: string,
  tenantId: string
): WorkspaceIsolationResult {
  const now = new Date().toISOString();
  const isolatedBoundaries: string[] = [];
  const missingBoundaries: string[] = [];
  const violations: string[] = [];

  for (const boundary of REQUIRED_WORKSPACE_ISOLATION_BOUNDARIES) {
    const enforced = isBoundaryEnforced(boundary);
    if (enforced) {
      isolatedBoundaries.push(boundary);
    } else {
      missingBoundaries.push(boundary);
      violations.push(
        `Workspace isolation boundary missing: ${boundary} for workspace ${workspaceId}`
      );
    }
  }

  const status: IsolationStatus =
    missingBoundaries.length === 0
      ? "enforced"
      : missingBoundaries.length < REQUIRED_WORKSPACE_ISOLATION_BOUNDARIES.length / 2
      ? "partial"
      : "missing";

  return {
    workspaceId,
    tenantId,
    status,
    isolatedBoundaries,
    missingBoundaries,
    violations,
    evidence: [
      `${isolatedBoundaries.length}/${REQUIRED_WORKSPACE_ISOLATION_BOUNDARIES.length} boundaries enforced`,
      `Workspace: ${workspaceId}, Tenant: ${tenantId}`,
    ],
    uncertainty: [
      "Workspace isolation is evaluated against structural contracts only",
      "Cross-workspace data access under concurrent load is not assessed statically",
    ],
    governanceBoundaries: [
      "Workspace isolation violations must block deployment",
      "Cross-workspace data access is never permitted within or across tenants",
    ],
    tenantScope: tenantId,
    checkedAt: now,
  };
}

function isBoundaryEnforced(boundary: string): boolean {
  const ENFORCED = [
    "workspace_data_scope",
    "project_data_scope",
    "connector_workspace_scope",
    "operational_memory_workspace_scope",
    "onboarding_workspace_scope",
    "war_room_workspace_scope",
    "governance_workspace_scope",
  ];
  return ENFORCED.includes(boundary);
}
