"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { requireWorkspaceRole } from "@/aoc/runtime-consumer";

export async function createPolicyAction(formData: FormData) {
  const { user } = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  await requireWorkspaceRole(workspaceId, ["owner", "admin"]);
  const conditions = {
    allowedRoles: String(formData.get("allowedRoles") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
    justificationRequired: formData.get("justificationRequired") === "on",
    businessHoursOnly: formData.get("businessHoursOnly") === "on",
  };
  await supabase.from("capability_policies").insert({
    workspace_id: workspaceId,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    resource_type: String(formData.get("resourceType") ?? "project"),
    permission: String(formData.get("permission") ?? "read"),
    effect: String(formData.get("effect") ?? "require_approval"),
    priority: Number(formData.get("priority") ?? 100),
    conditions,
    created_by_user_id: user.id,
  });
  redirect("/policies?created=1");
}

export async function togglePolicyAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const policyId = String(formData.get("policyId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const enabled = String(formData.get("enabled") ?? "true") === "true";
  await requireWorkspaceRole(workspaceId, ["owner", "admin"]);
  await supabase.from("capability_policies").update({ enabled: !enabled, updated_at: new Date().toISOString() }).eq("id", policyId).eq("workspace_id", workspaceId);
  redirect("/policies?updated=1");
}
