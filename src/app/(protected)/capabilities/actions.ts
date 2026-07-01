"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCapabilityRequest } from "@/lib/security/capability-flow";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { SDK_GOVERNANCE_ACTIONS } from "@/lib/aoc/runtime/governance-actions";

export async function createCapabilityRequestAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const targetResourceType = String(formData.get("targetResourceType") ?? "project") as "workspace" | "project" | "operational_memory" | "governance_object" | "ai_coprocess";
  const targetResourceId = String(formData.get("targetResourceId") ?? "");
  const requestedPermission = String(formData.get("requestedPermission") ?? "read") as "read" | "write" | "approve" | "manage" | "execute" | "delegate";
  const justification = String(formData.get("justification") ?? "");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");

  await createCapabilityRequest({ workspaceId, targetResourceType, targetResourceId, requestedPermission, requestedScope: { workspaceId, targetResourceId, permission: requestedPermission }, justification, expiresAt: expiresAtRaw || null });
  redirect("/capabilities?created=1");
}

export async function decideCapabilityRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const decisionValue = String(formData.get("decision") ?? "");
  const supabase = await createSupabaseServerClient();
  const { user } = await requireAuthenticatedUser();

  const { data: capRequest } = await supabase.from("capability_requests").select("*").eq("id", requestId).maybeSingle();
  if (!capRequest) redirect("/capabilities?error=request_not_found");

  const runtimeDecision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({
      user,
      action: SDK_GOVERNANCE_ACTIONS.CAPABILITIES_MANAGE,
      routeId: "decideCapabilityRequestAction",
      workspaceId: capRequest.workspace_id,
      resourceType: capRequest.target_resource_type,
      resourceId: capRequest.target_resource_id,
      metadata: { requestId, capabilityDecision: decisionValue, requestedPermission: capRequest.requested_permission },
    }),
  );
  if (!runtimeDecision.allowed) redirect("/capabilities?error=forbidden");

  if (decisionValue === "approve") {
    await supabase.from("capability_requests").update({ status: "approved", evaluator_user_id: user.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", requestId);
    const { data: grant } = await supabase.from("capability_grants").insert({ capability_request_id: requestId, workspace_id: capRequest.workspace_id, granted_user_id: capRequest.requester_user_id, granted_by_user_id: user.id, target_resource_type: capRequest.target_resource_type, target_resource_id: capRequest.target_resource_id, permission: capRequest.requested_permission, scope: capRequest.requested_scope, expires_at: capRequest.grant_expires_at ?? null }).select("id").single<{ id: string }>();
    await supabase.from("capability_audit_events").insert({ workspace_id: capRequest.workspace_id, request_id: requestId, grant_id: grant?.id ?? null, actor_user_id: user.id, event_type: "approved", event_detail: { decision: "approved", runtimeDecisionId: runtimeDecision.decisionId, runtimeAuthoritative: runtimeDecision.authoritative } });
  }

  if (decisionValue === "deny") {
    await supabase.from("capability_requests").update({ status: "denied", evaluator_user_id: user.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", requestId);
    await supabase.from("capability_audit_events").insert({ workspace_id: capRequest.workspace_id, request_id: requestId, actor_user_id: user.id, event_type: "denied", event_detail: { decision: "denied", runtimeDecisionId: runtimeDecision.decisionId } });
  }

  redirect("/capabilities?updated=1");
}

export async function revokeCapabilityGrantAction(formData: FormData) {
  const grantId = String(formData.get("grantId") ?? "");
  const supabase = await createSupabaseServerClient();
  const { user } = await requireAuthenticatedUser();
  const { data: grant } = await supabase.from("capability_grants").select("*").eq("id", grantId).maybeSingle();
  if (!grant) redirect("/capabilities?error=grant_not_found");

  // Runtime must authorize revocation before any DB write.
  const runtimeDecision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({
      user,
      action: SDK_GOVERNANCE_ACTIONS.CAPABILITIES_MANAGE,
      routeId: "revokeCapabilityGrantAction",
      workspaceId: grant.workspace_id,
      resourceType: grant.target_resource_type,
      resourceId: grant.target_resource_id,
      metadata: { grantId, requestedPermission: grant.permission },
    }),
  );
  if (!runtimeDecision.allowed) redirect("/capabilities?error=forbidden");

  await supabase.from("capability_grants").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by_user_id: user.id }).eq("id", grantId);
  await supabase.from("capability_requests").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", grant.capability_request_id);
  await supabase.from("capability_audit_events").insert({ workspace_id: grant.workspace_id, grant_id: grantId, request_id: grant.capability_request_id, actor_user_id: user.id, event_type: "revoked", event_detail: { decision: "revoked", runtimeDecisionId: runtimeDecision.decisionId, runtimeAuthoritative: runtimeDecision.authoritative } });
  redirect("/capabilities?revoked=1");
}
