import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessDeniedError } from "@/aoc/runtime-consumer";
import { requireAuthenticatedUser, requireProjectAccess } from "@/lib/security/server-authorization";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  let userId: string | null = null;
  const { id } = await params;
  const projectId = id.trim();

  if (!projectId) {
    return Response.json({ error: "projectId is required." }, { status: 400 });
  }

  try {
    const { user } = await requireAuthenticatedUser();
    userId = user.id;
    await requireProjectAccess(projectId, "read");
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      if (String(error.metadata.reason) === "unauthorized") {
        return denyResponse({ status: 401, routeId: "/api/projects/[id]", message: "Unauthorized", reason: "unauthorized" });
      }
      return denyFromAccessError(error, { status: 403, routeId: "/api/projects/[id]", message: "Invalid project context.", actorUserId: userId, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
    }
    throw error;
  }

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();

  if (!project) {
    return denyResponse({ status: 404, routeId: "/api/projects/[id]", message: "Project not found.", reason: "project_not_found_or_out_of_scope", actorUserId: userId, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
  }

  return Response.json(project);
}
