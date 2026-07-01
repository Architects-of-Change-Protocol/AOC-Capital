import { getAuthUser } from "@/lib/auth";
import { grantAgentScope } from "@/aoc/runtime-consumer";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { SDK_GOVERNANCE_ACTIONS } from "@/lib/aoc/runtime/governance-actions";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 });

  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({ user, action: SDK_GOVERNANCE_ACTIONS.AGENTS_MANAGE, routeId: "/api/sdk/agents/scopes", workspaceId: body.workspaceId, resourceType: "workspace", resourceId: body.workspaceId, metadata: { agentId: body.agentId } }),
  );
  if (!decision.allowed) return Response.json({ error: "Forbidden", decisionId: decision.decisionId }, { status: 403 });

  await grantAgentScope({ workspaceId: body.workspaceId, agentId: body.agentId, resourceType: body.resourceType, resourceId: body.resourceId, permission: body.permission, expiresAt: body.expiresAt ?? null, grantedByUserId: user.id });
  return Response.json({ ok: true, decisionId: decision.decisionId });
}
