import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiOk, getRequestId } from "@/lib/api/http";
import { requireSdkUser, sdkDbError, sdkWorkspaceRequired } from "../../_shared";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { SDK_GOVERNANCE_ACTIONS } from "@/lib/aoc/runtime/governance-actions";

export async function GET(request: Request) {
  const meta = { requestId: getRequestId(request), version: "v1" };
  const auth = await requireSdkUser(meta);
  if ("response" in auth) return auth.response;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return sdkWorkspaceRequired(meta);

  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({ user: auth.user, action: SDK_GOVERNANCE_ACTIONS.CAPABILITIES_READ, routeId: "/api/sdk/capabilities/grants", workspaceId, resourceType: "workspace", resourceId: workspaceId }),
  );
  if (!decision.allowed) return Response.json({ error: "Forbidden", decisionId: decision.decisionId }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("capability_grants").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) return sdkDbError(meta, "/api/sdk/capabilities/grants", error.message, auth.user.id, workspaceId);
  return apiOk({ grants: data ?? [], decisionId: decision.decisionId }, meta);
}
