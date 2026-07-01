import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/workspaces";
import { AccessDeniedError } from "@/aoc/runtime-consumer";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";
import { requireAuthenticatedUser, requireWorkspaceMember } from "@/lib/security/server-authorization";

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const supabase = await createSupabaseServerClient();
    const workspaces = await getUserWorkspaces(user.id);
    const workspaceId = workspaces[0]?.id;

    if (!workspaceId) {
      return denyResponse({ status: 403, routeId: "/api/projects", message: "Workspace context required.", reason: "workspace_missing", actorUserId: user.id, eventType: "workspace_scope_violation" });
    }

    await requireWorkspaceMember(workspaceId);

    const { data: projects } = await supabase.from("projects").select("id,name").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    return NextResponse.json({ projects: projects ?? [] });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      if (String(error.metadata.reason) === "unauthorized") {
        return denyResponse({ status: 401, routeId: "/api/projects", message: "Unauthorized", reason: "unauthorized" });
      }
      return denyFromAccessError(error, { status: 403, routeId: "/api/projects", message: "Forbidden" });
    }
    throw error;
  }
}
