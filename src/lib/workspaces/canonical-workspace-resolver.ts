import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { logContinuityIssue } from "@/lib/auth/auth-continuity-diagnostics";

export type WorkspaceResolution = {
  workspaceId: string | null;
  role: "owner" | "admin" | "pm" | "viewer" | null;
  status: "resolved" | "missing_membership" | "missing_workspace";
  recovered: boolean;
  issues: string[];
};

export async function resolveCanonicalWorkspace(userId: string, preferredWorkspaceId?: string | null): Promise<WorkspaceResolution> {
  const supabase = createSupabaseServiceRoleClient({ routeId: "canonical-workspace-resolver", operation: "resolve", reason: "continuity", systemActor: "system", actorUserId: userId });
  const { data: memberships } = await supabase
    .from("workspace_memberships")
    .select("workspace_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!memberships?.length) return { workspaceId: null, role: null, status: "missing_membership", recovered: false, issues: ["missing_membership"] };

  const ids = memberships.map((m) => m.workspace_id);
  const { data: workspaces } = await supabase.from("workspaces").select("id, status").in("id", ids);
  const allowed = new Set((workspaces ?? []).filter((w) => w.status !== "archived" && w.status !== "deleted").map((w) => w.id));

  const preferred = preferredWorkspaceId && memberships.find((m) => m.workspace_id === preferredWorkspaceId && allowed.has(m.workspace_id));
  const fallback = memberships.find((m) => allowed.has(m.workspace_id));
  const chosen = preferred ?? fallback ?? null;

  if (!chosen) {
    logContinuityIssue("workspace", { code: "workspace_missing", severity: "warn", message: "No active workspace for memberships" }, { userId, membershipCount: memberships.length });
    return { workspaceId: null, role: null, status: "missing_workspace", recovered: false, issues: ["missing_workspace"] };
  }

  return { workspaceId: chosen.workspace_id, role: chosen.role, status: "resolved", recovered: Boolean(preferredWorkspaceId && preferredWorkspaceId !== chosen.workspace_id), issues: preferred ? [] : ["fallback_workspace"] };
}
