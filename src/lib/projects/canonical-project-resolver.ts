import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectResolution = {
  projectId: string | null;
  status: "resolved" | "missing" | "invalid";
  recovered: boolean;
  issues: string[];
};

export async function resolveCanonicalProject(workspaceId: string, requestedProjectId?: string | null): Promise<ProjectResolution> {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!projects?.length) return { projectId: null, status: "missing", recovered: false, issues: ["missing_project"] };
  if (requestedProjectId) {
    const match = projects.find((p) => p.id === requestedProjectId);
    if (match) return { projectId: match.id, status: "resolved", recovered: false, issues: [] };
    return { projectId: projects[0].id, status: "invalid", recovered: true, issues: ["invalid_requested_project"] };
  }

  return { projectId: projects[0].id, status: "resolved", recovered: false, issues: [] };
}
