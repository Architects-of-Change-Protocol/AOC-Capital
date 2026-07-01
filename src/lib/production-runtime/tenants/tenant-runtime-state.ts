import type { TenantProvisioningState } from "../types/production-runtime-types.js";
import { retrieveTenantProvisioningState } from "./tenant-provisioning.js";

export interface TenantRuntimeState {
  tenantId: string;
  isOperational: boolean;
  provisioning: TenantProvisioningState;
  activeWorkspaceCount: number;
  runtimeHealth: "operational" | "degraded" | "suspended";
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export function retrieveTenantRuntimeState(tenantId: string): TenantRuntimeState {
  const now = new Date().toISOString();
  const provisioning = retrieveTenantProvisioningState(tenantId);

  const isOperational =
    provisioning.status === "complete" || provisioning.status === "partial";

  const runtimeHealth =
    provisioning.status === "complete"
      ? "operational"
      : provisioning.status === "partial"
      ? "degraded"
      : "suspended";

  return {
    tenantId,
    isOperational,
    provisioning,
    activeWorkspaceCount: 0,
    runtimeHealth,
    evidence: [
      `Tenant ${tenantId} runtime state derived from provisioning`,
      `Provisioning status: ${provisioning.status}`,
    ],
    uncertainty: [
      "Active workspace count is not tracked in this static state snapshot",
      "Tenant suspension state depends on billing and governance systems",
    ],
    governanceBoundaries: [
      "Tenant runtime state must not expose cross-tenant data",
      "Runtime health modifications require governance authorization",
    ],
    tenantScope: tenantId,
    checkedAt: now,
  };
}
