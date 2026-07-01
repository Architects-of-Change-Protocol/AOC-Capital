import { AccessDeniedError, requireProjectPermission, requireWorkspaceMembership } from "@/aoc/runtime-consumer";
import { denyFromAccessError } from "@/lib/security/deny-response";
import { buildOperationalCoordinationSnapshot } from "@/lib/coordination-orchestrator";
import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import { buildInterventionSnapshot } from "@/lib/intervention-engine";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";

const daysSince = (dateValue: string | null): number => {
  if (!dateValue) return 30;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return 30;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";

  if (workspaceId) {
    try { await requireWorkspaceMembership(workspaceId); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/coordination", message: "Invalid workspace context.", workspaceId, eventType: "workspace_scope_violation" }); throw error; }
  }

  let snapshot = null;

  if (projectId) {
    try { await requireProjectPermission(projectId, "read"); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/coordination", message: "Invalid project context.", projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" }); throw error; }
    snapshot = await readProjectMemorySnapshot(projectId);
  }

  const executionRisk = buildExecutionRiskSnapshot(projectId || null, snapshot);
  const stakeholderIntelligence = buildStakeholderRelationshipSnapshot(projectId || null, snapshot);
  const interventionIntelligence = buildInterventionSnapshot(projectId || null, snapshot);

  const coordination = buildOperationalCoordinationSnapshot({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    executionRisk,
    stakeholderIntelligence,
    interventionIntelligence,
    organizationalMemory: snapshot,
    timelineIntelligence: { daysSinceUpdate: daysSince(snapshot?.lastUpdatedAt ?? null), stale: daysSince(snapshot?.lastUpdatedAt ?? null) >= 7 },
  });

  return Response.json({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    generatedAt: coordination.generatedAt,
    executionRisk,
    stakeholderIntelligence,
    interventionIntelligence,
    organizationalMemory: snapshot,
    timelineIntelligence: coordination.commentary.find((item) => item.includes("Timeline intelligence")) ?? "Timeline signal not available.",
    coordination,
  });
}
