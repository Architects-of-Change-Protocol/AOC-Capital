import { notFound, redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireAuthUser();
  const { token } = await params;
  const supabase = createSupabaseServiceRoleClient({ routeId: "/accept-invite/page", operation: "service_role_query", reason: "existing_privileged_flow", systemActor: "system" });

  const { data: invite } = await supabase.from("workspace_invitations").select("*").eq("token", token).maybeSingle();
  if (!invite) notFound();
  if (invite.status !== "pending") throw new Error("Invitation already used.");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase.from("workspace_invitations").update({ status: "expired" }).eq("id", invite.id);
    throw new Error("Invitation expired.");
  }

  const { error: memberError } = await supabase.from("workspace_memberships").upsert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role });
  if (memberError) throw new Error(memberError.message);

  await supabase.from("workspace_invitations").update({ status: "accepted", accepted_by_user_id: user.id, accepted_at: new Date().toISOString() }).eq("id", invite.id).eq("status", "pending");
  await supabase.from("workspace_audit_events").insert({ workspace_id: invite.workspace_id, actor_user_id: user.id, event_type: "invitation_accepted", payload: { invitationId: invite.id } });

  redirect("/team");
}
