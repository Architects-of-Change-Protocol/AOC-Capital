import { requireAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const WORKSPACE_ROLES = ["owner", "admin", "pm", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const roleRank: Record<WorkspaceRole, number> = { owner: 4, admin: 3, pm: 2, viewer: 1 };

export async function requireWorkspaceRole(workspaceId: string, minimumRole: WorkspaceRole) {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: WorkspaceRole }>();

  if (!data?.role || roleRank[data.role] < roleRank[minimumRole]) {
    throw new Error("Insufficient workspace permissions.");
  }

  return { user, role: data.role };
}

export const canManageWorkspace = (role: WorkspaceRole) => role === "owner" || role === "admin";
export const canInviteMembers = (role: WorkspaceRole) => role === "owner" || role === "admin";
export const canManageBilling = (role: WorkspaceRole) => role === "owner";
