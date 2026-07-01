"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { requireWorkspaceRole } from "@/aoc/runtime-consumer";
import { grantAgentScope } from "@/aoc/runtime-consumer";

export async function createAgentAction(formData: FormData) {
  const { user } = await requireAuthenticatedUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  await requireWorkspaceRole(workspaceId, ["owner", "admin"]);
  const supabase = await createSupabaseServerClient();
  const metadata = { provider: String(formData.get("provider") ?? ""), model: String(formData.get("model") ?? ""), runtime: String(formData.get("runtime") ?? ""), toolAccess: String(formData.get("toolAccess") ?? "").split(",").map((v) => v.trim()).filter(Boolean), allowedDomains: String(formData.get("allowedDomains") ?? "").split(",").map((v) => v.trim()).filter(Boolean), dataSensitivityLevel: String(formData.get("dataSensitivityLevel") ?? "medium"), contactOwner: String(formData.get("contactOwner") ?? ""), externalIntegrationId: String(formData.get("externalIntegrationId") ?? "") };
  const { data } = await supabase.from("ai_agents").insert({ workspace_id: workspaceId, name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), agent_type: String(formData.get("agentType") ?? "copilot"), created_by_user_id: user.id, owner_user_id: user.id, purpose: String(formData.get("purpose") ?? ""), risk_level: String(formData.get("riskLevel") ?? "medium"), metadata }).select("id").single();
  await supabase.from("capability_audit_events").insert({ workspace_id: workspaceId, actor_user_id: user.id, actor_agent_id: data?.id ?? null, event_type: "agent_registered", event_detail: { purpose: String(formData.get("purpose") ?? ""), riskLevel: String(formData.get("riskLevel") ?? "medium") } });
  redirect("/trust/agents?created=1");
}

export async function setAgentStatusAction(formData: FormData) {
  const { user } = await requireAuthenticatedUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const status = String(formData.get("status") ?? "disabled");
  await requireWorkspaceRole(workspaceId, ["owner", "admin"]);
  const supabase = await createSupabaseServerClient();
  await supabase.from("ai_agents").update({ status, updated_at: new Date().toISOString() }).eq("id", agentId).eq("workspace_id", workspaceId);
  await supabase.from("capability_audit_events").insert({ workspace_id: workspaceId, actor_user_id: user.id, actor_agent_id: agentId, event_type: status === "revoked" ? "agent_revoked" : "agent_disabled", event_detail: { status } });
  redirect("/trust/agents?updated=1");
}

export async function grantAgentScopeAction(formData: FormData) {
  const { user } = await requireAuthenticatedUser();
  await grantAgentScope({ workspaceId: String(formData.get("workspaceId") ?? ""), agentId: String(formData.get("agentId") ?? ""), resourceType: String(formData.get("resourceType") ?? "project") as "workspace" | "project" | "operational_memory" | "governance_object" | "ai_coprocess" | "copilot", resourceId: String(formData.get("resourceId") ?? ""), permission: String(formData.get("permission") ?? "read") as "read" | "write" | "delete" | "write_memory" | "delete_memory" | "manage_members" | "manage_projects" | "manage_workspace" | "manage_ai" | "manage_billing" | "execute_ai_action" | "view_executive" | "upload_documents", expiresAt: String(formData.get("expiresAt") ?? "") || null, grantedByUserId: user.id });
  redirect("/trust/agents?scope_granted=1");
}
