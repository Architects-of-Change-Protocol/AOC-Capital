import { getAuthUser } from "@/lib/auth";
import { requireGovernancePermission } from "@/aoc/runtime-consumer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/telemetry";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // SCOPED_CLIENT: RLS policy added in 20260515100000_rls_governance_fixes.sql
  const supabase = await createSupabaseServerClient();
  const { data: req } = await supabase.from("governance_approval_requests").select("*").eq("id", id).maybeSingle();
  if (!req) return Response.json({ error: "Not found" }, { status: 404 });
  await requireGovernancePermission(req.workspace_id, "manage_workspace");
  if (req.status !== "pending_approval") return Response.json({ error: "Already resolved" }, { status: 409 });
  await supabase.from("governance_approval_requests").update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by_user_id: user.id }).eq("id", id);
  await supabase.from("governance_execution_grants").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("approval_request_id", req.id).eq("status", "active");
  await logSecurityEvent("approval_rejected", { workspaceId: req.workspace_id, projectId: req.project_id, actorUserId: req.actor_user_id, actorAgentId: req.actor_agent_id, requested_permission: req.requested_permission, metadata: { decisionId: req.decision_id, approvalRequestId: req.id, reviewerUserId: user.id, action: req.action, status: "rejected" } });
  return Response.json({ ok: true });
}
