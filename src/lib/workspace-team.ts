import crypto from "node:crypto";
import { requireSeatAvailability } from "@/lib/feature-gates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireGovernancePermission } from "@/lib/security/access-guards";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@/lib/workspace-access";

const INVITE_TTL_DAYS = 7;

export async function getWorkspaceSeatSnapshot(input: { workspaceId: string; companyId: string; actorUserId: string; routeId: string }) {
  await requireGovernancePermission(input.workspaceId, "manage_members");
  // SCOPED_CLIENT: RLS policy added in 20260515100000_rls_governance_fixes.sql
  const supabase = await createSupabaseServerClient();
  const [{ count: activeSeats }, { count: pendingInvites }] = await Promise.all([
    supabase.from("workspace_memberships").select("user_id", { head: true, count: "exact" }).eq("workspace_id", input.workspaceId),
    supabase
      .from("workspace_invitations")
      .select("id", { head: true, count: "exact" })
      .eq("workspace_id", input.workspaceId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  const usedSeats = (activeSeats ?? 0) + (pendingInvites ?? 0);
  const seatGate = await requireSeatAvailability(input.companyId, usedSeats);
  return { activeSeats: activeSeats ?? 0, pendingInvites: pendingInvites ?? 0, usedSeats, seatGate };
}

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  companyId: string;
  inviterUserId: string;
  email: string;
  role: WorkspaceRole;
  routeId: string;
}) {
  if (!WORKSPACE_ROLES.includes(input.role)) throw new Error("Invalid role.");
  await requireGovernancePermission(input.workspaceId, "manage_members");
  // SCOPED_CLIENT: RLS policy added in 20260515100000_rls_governance_fixes.sql
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: duplicate } = await supabase
    .from("workspace_invitations")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ id: string }>();
  if (duplicate?.id) throw new Error("An active invitation already exists for this email.");

  const snapshot = await getWorkspaceSeatSnapshot({ workspaceId: input.workspaceId, companyId: input.companyId, actorUserId: input.inviterUserId, routeId: input.routeId });
  if (!snapshot.seatGate.ok) throw new Error(`Seat limit reached (${snapshot.seatGate.seatLimit}).`);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: input.workspaceId,
    company_id: input.companyId,
    email: normalizedEmail,
    role: input.role,
    token,
    invited_by_user_id: input.inviterUserId,
    expires_at: expiresAt,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  await supabase.from("workspace_audit_events").insert({
    workspace_id: input.workspaceId,
    actor_user_id: input.inviterUserId,
    event_type: "invitation_sent",
    payload: { email: normalizedEmail, role: input.role, expiresAt },
  });
}
