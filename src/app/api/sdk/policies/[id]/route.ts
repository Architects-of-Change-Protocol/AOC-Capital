import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { SDK_GOVERNANCE_ACTIONS } from "@/lib/aoc/runtime/governance-actions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const workspaceId = body.workspaceId ?? request.headers.get("x-pmf-workspace-id");
  if (!workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 });

  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({ user, action: SDK_GOVERNANCE_ACTIONS.POLICIES_MANAGE, routeId: "/api/sdk/policies/[id]", workspaceId, resourceType: "workspace", resourceId: workspaceId, metadata: { policyId: id } }),
  );
  if (!decision.allowed) return Response.json({ error: "Forbidden", decisionId: decision.decisionId }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  await supabase.from("capability_policies").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  return Response.json({ ok: true, decisionId: decision.decisionId });
}
