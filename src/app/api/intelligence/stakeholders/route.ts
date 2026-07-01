import { AccessDeniedError, requireProjectPermission, requireWorkspaceMembership } from "@/aoc/runtime-consumer";
import { denyFromAccessError } from "@/lib/security/deny-response";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";

  if (workspaceId) {
    try { await requireWorkspaceMembership(workspaceId); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/stakeholders", message: "Invalid workspace context.", workspaceId, eventType: "workspace_scope_violation" }); throw error; }
  }

  if (!projectId) {
    return Response.json(buildStakeholderRelationshipSnapshot(null, null));
  }

  try { await requireProjectPermission(projectId, "read"); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/stakeholders", message: "Invalid project context.", projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" }); throw error; }

  const snapshot = await readProjectMemorySnapshot(projectId);
  return Response.json(buildStakeholderRelationshipSnapshot(projectId, snapshot));
}
