import { getAuthUser } from "@/lib/auth";
import { buildContinuityContext, type OperationalMemoryEntry } from "@/lib/operational-memory-v1";
import { AccessDeniedError, requireProjectAccess } from "@/aoc/runtime-consumer";
import { verifyAgentAttestation } from "@/lib/security/agent-attestation";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/copilot/memory", message: "Unauthorized", reason: "unauthorized" });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (agentToken || agentId || workspaceId) {
    if (!agentToken || !agentId || !workspaceId) return denyResponse({ status: 403, routeId: "/api/copilot/memory", message: "Incomplete agent attestation headers.", reason: "missing_attestation_headers", actorUserId: user.id, eventType: "malformed_attestation" });
    try {
      await verifyAgentAttestation({ token: agentToken, expectedAgentId: agentId, workspaceId, permission: "read", projectId: projectId || undefined });
    } catch (error) {
      if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/copilot/memory", message: "Agent attestation denied.", actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "invalid_attestation" });
      throw error;
    }
  }

  if (projectId) {
    try {
      await requireProjectAccess(projectId);
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return denyFromAccessError(error, { status: 403, routeId: "/api/copilot/memory", message: "Invalid project context.", actorUserId: user.id, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
      }
      throw error;
    }
  }
  const continuity = await buildContinuityContext(user.companyId, projectId);
  const now = Date.now();

  const formatEntry = (item: OperationalMemoryEntry, withAge = false): string => {
    const ageDays = Math.floor(Math.max(0, (now - Date.parse(item.createdAt)) / 86_400_000));
    const ageSuffix = withAge && ageDays >= 1 ? ` [${ageDays}d unresolved]` : "";
    return `${item.memoryText}${ageSuffix} (${item.sourceType})`;
  };

  return Response.json({
    blockers: continuity.blockers.map((item) => formatEntry(item, true)),
    recentDecisions: continuity.decisions.map((item) => formatEntry(item, false)),
    stakeholderPressure: continuity.stakeholders.map((item) => formatEntry(item, false)),
    criticalRisks: continuity.risks.map((item) => formatEntry(item, false)),
    concerns: continuity.unresolved.map((item: OperationalMemoryEntry) => formatEntry(item, true)).slice(0, 12),
  });
}
