"use server";

import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/auth";
import { canInviteMembers, requireWorkspaceRole, WORKSPACE_ROLES, type WorkspaceRole } from "@/lib/workspace-access";
import { inviteWorkspaceMember } from "@/lib/workspace-team";

export async function sendInviteAction(formData: FormData) {
  const user = await requireAuthUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "viewer") as WorkspaceRole;

  if (!WORKSPACE_ROLES.includes(role)) throw new Error("Invalid role.");
  const access = await requireWorkspaceRole(workspaceId, "admin");
  if (!canInviteMembers(access.role)) throw new Error("Only owners/admins can invite.");

  await inviteWorkspaceMember({ workspaceId, companyId: user.companyId, inviterUserId: user.id, email, role, routeId: "/team/actions.sendInviteAction" });
  revalidatePath("/team");
}
