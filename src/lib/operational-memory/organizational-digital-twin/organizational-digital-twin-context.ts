import type { OrganizationalDigitalTwinRequest } from "./organizational-digital-twin-types";

export type OrganizationalDigitalTwinContext = { request: OrganizationalDigitalTwinRequest; nowIso: string; nowMs: number; evidence: string[]; governanceBoundaries: string[] };

export function buildOrganizationalDigitalTwinContext(request: OrganizationalDigitalTwinRequest): OrganizationalDigitalTwinContext {
  const nowIso = request.now ?? new Date().toISOString();
  return { request, nowIso, nowMs: Date.parse(nowIso), evidence: ["operational_memory_lineage", "continuity_retrieval", "executive_command_fragility"], governanceBoundaries: ["tenant_isolation", "workspace_isolation", "deterministic_only", "no_cross_tenant_synthesis"] };
}
