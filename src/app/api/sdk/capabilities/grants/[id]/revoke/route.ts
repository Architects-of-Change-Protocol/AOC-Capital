import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { user } = await requireAuthenticatedUser();
  const { data: grant } = await supabase.from("capability_grants").select("*").eq("id", id).maybeSingle();
  if (!grant) return Response.json({ error: "grant_not_found" }, { status: 404 });

  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({ user, action: "workspace.manage", routeId: "/api/sdk/capabilities/grants/[id]/revoke", workspaceId: grant.workspace_id, resourceType: "workspace", resourceId: grant.workspace_id }),
  );
  if (!decision.allowed) return Response.json({ error: "forbidden", decision }, { status: 403 });

  await supabase.from("capability_grants").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by_user_id: user.id }).eq("id", id);
  return Response.json({ ok: true, decision });
}
