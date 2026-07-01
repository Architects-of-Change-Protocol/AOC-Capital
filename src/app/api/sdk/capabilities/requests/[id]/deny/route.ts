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
    buildEnterpriseRuntimeRequest({ user, action: "workspace.manage", routeId: "/api/sdk/capabilities/requests/[id]/deny", workspaceId: request.workspace_id, resourceType: "workspace", resourceId: request.workspace_id }),
  );
  if (!decision.allowed) return Response.json({ error: "forbidden", decision }, { status: 403 });

  await supabase.from("capability_requests").update({ status: "denied", evaluator_user_id: user.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  return Response.json({ ok: true, decision });
}
