import type { PmoTenant } from "./pmo-tenant-types";

type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validatePmoTenantPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["Payload must be an object"] };
  }
  const t = payload as Partial<PmoTenant>;

  if (!t.identity?.pmoName?.trim()) errors.push("identity.pmoName is required");
  if (!t.identity?.organizationName?.trim()) errors.push("identity.organizationName is required");
  if (!t.identity?.pmoType) errors.push("identity.pmoType is required");
  if (!t.identity?.operatingModel) errors.push("identity.operatingModel is required");

  if (!t.vault?.provider) errors.push("vault.provider is required");

  if (!t.governance?.methodology) errors.push("governance.methodology is required");
  if (!t.governance?.reportingCadence) errors.push("governance.reportingCadence is required");
  if (!t.governance?.projectScale) errors.push("governance.projectScale is required");
  if (!t.governance?.approvalGovernance) errors.push("governance.approvalGovernance is required");

  if (!Array.isArray(t.agents) || t.agents.length === 0) errors.push("agents must be a non-empty array");

  if (!t.createdAt) errors.push("createdAt is required");
  if (!t.updatedAt) errors.push("updatedAt is required");

  return errors.length ? { ok: false, errors } : { ok: true };
}
