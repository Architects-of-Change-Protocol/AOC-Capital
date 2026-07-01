import { requireProjectPermission, requireWorkspaceMembership } from "@/aoc/runtime-consumer";
import { AccessDeniedError } from "@/aoc/runtime-consumer";
import { denyFromAccessError } from "@/lib/security/deny-response";
import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import { buildInterventionSnapshot } from "@/lib/intervention-engine";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";

  if (workspaceId) {
    try { await requireWorkspaceMembership(workspaceId); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/interventions", message: "Invalid workspace context.", workspaceId, eventType: "workspace_scope_violation" }); throw error; }
  }

  let snapshot = null;

  if (projectId) {
    try { await requireProjectPermission(projectId, "read"); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/interventions", message: "Invalid project context.", projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" }); throw error; }
    snapshot = await readProjectMemorySnapshot(projectId);
  }

  const intervention = buildInterventionSnapshot(projectId || null, snapshot);

  // Deterministic aggregation endpoint for intervention infra; all signals are explainable
  // and intentionally machine-readable for future autonomous intervention systems.
  return Response.json({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    generatedAt: intervention.generatedAt,
    executionRisk: buildExecutionRiskSnapshot(projectId || null, snapshot),
    stakeholderIntelligence: buildStakeholderRelationshipSnapshot(projectId || null, snapshot),
    organizationalMemory: snapshot,
    deliveryTelemetry: intervention.deliveryInstability,
    intervention,
  });
}
