import type { OperationalMemoryScope } from "./runtime-memory-types";

export type ScopeViolation = {
  type: "cross_tenant" | "cross_workspace" | "missing_required_scope";
  message: string;
};

export function validateOperationalScope(scope: OperationalMemoryScope): ScopeViolation | null {
  if (!scope.companyId?.trim()) {
    return { type: "missing_required_scope", message: "companyId is required for operational memory scoping" };
  }
  return null;
}

export function buildScopeKey(scope: OperationalMemoryScope): string {
  return [
    scope.companyId,
    scope.workspaceId ?? "none",
    scope.projectId ?? "none",
    scope.conversationId ?? "none",
    scope.interventionId ?? "none",
    scope.stakeholderId ?? "none",
  ].join("::");
}

export function buildPartialScopeKey(
  scope: Pick<OperationalMemoryScope, "companyId" | "workspaceId" | "projectId">,
): string {
  return [scope.companyId, scope.workspaceId ?? "none", scope.projectId ?? "none"].join("::");
}

export function scopesMatch(a: OperationalMemoryScope, b: OperationalMemoryScope): boolean {
  return (
    a.companyId === b.companyId &&
    (a.workspaceId ?? null) === (b.workspaceId ?? null) &&
    (a.projectId ?? null) === (b.projectId ?? null)
  );
}

export function scopeIsWithinBoundary(
  inner: OperationalMemoryScope,
  boundary: OperationalMemoryScope,
): boolean {
  if (inner.companyId !== boundary.companyId) return false;
  if (boundary.workspaceId !== null && inner.workspaceId !== boundary.workspaceId) return false;
  if (boundary.projectId !== null && inner.projectId !== boundary.projectId) return false;
  return true;
}

export function assertScopeIsolation(
  recordScope: OperationalMemoryScope,
  requestScope: OperationalMemoryScope,
): void {
  if (recordScope.companyId !== requestScope.companyId) {
    throw new Error(
      `operational_memory_scope_violation: cross-tenant access denied. record_company=${recordScope.companyId}, request_company=${requestScope.companyId}`,
    );
  }
  if (
    requestScope.workspaceId !== null &&
    recordScope.workspaceId !== null &&
    recordScope.workspaceId !== requestScope.workspaceId
  ) {
    throw new Error(
      `operational_memory_scope_violation: cross-workspace access denied. record_workspace=${recordScope.workspaceId}, request_workspace=${requestScope.workspaceId}`,
    );
  }
}
