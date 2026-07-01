import type { ExecutiveCommandRequest } from "./executive-command-types";

export type ExecutiveCommandContext = { request: ExecutiveCommandRequest; nowMs: number; governanceBoundaries: string[]; evidence: string[] };

export function buildExecutiveCommandContext(request: ExecutiveCommandRequest): ExecutiveCommandContext {
  const nowMs = Date.parse(request.now ?? new Date().toISOString());
  return { request, nowMs: Number.isNaN(nowMs) ? Date.now() : nowMs, governanceBoundaries: ["tenant_isolation", "workspace_isolation", "deterministic_outputs", "auditable_reasoning"], evidence: ["continuity_retrieval", "cross_domain_correlation", "predictive_intelligence", "critical_path_intelligence", "autonomous_intervention", "intervention_learning"] };
}
