import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { user } = await requireAuthenticatedUser();

  const { data: request } = await supabase.from("capability_requests").select("*").eq("id", id).maybeSingle();
  if (!request) return Response.json({ error: "request_not_found" }, { status: 404 });

  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({
      user,
      action: "workspace.manage",
      routeId: "/api/sdk/capabilities/requests/[id]/approve",
      workspaceId: request.workspace_id,
      resourceType: "workspace",
      resourceId: request.workspace_id,
    }),
  );
  if (!decision.allowed) return Response.json({ error: "forbidden", decision }, { status: 403 });

  await supabase.from("capability_requests").update({ status: "approved", evaluator_user_id: user.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("capability_grants").insert({ capability_request_id: id, workspace_id: request.workspace_id, granted_user_id: request.requester_user_id, granted_by_user_id: user.id, target_resource_type: request.target_resource_type, target_resource_id: request.target_resource_id, permission: request.requested_permission, scope: request.requested_scope, expires_at: request.grant_expires_at ?? null });
  return Response.json({ ok: true, decision });
}
