import { getAuthUser } from "@/lib/auth";
import { denyResponse } from "@/lib/security/deny-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/governance/delegations", message: "Unauthorized", reason: "unauthorized" });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 });
  // SCOPED_CLIENT: RLS policy added in 20260515100000_rls_governance_fixes.sql
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("governance_delegations").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}
