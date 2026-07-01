import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import { AccessDeniedError, requireAgentScope } from "@/lib/security/access-guards";
import { logSecurityEvent } from "@/lib/security/telemetry";
import type { Permission } from "@/lib/security/rbac";

type AgentClaims = { agentId: string; workspaceId: string; exp: number; nonce?: string };

const parseToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new AccessDeniedError("Invalid agent token format.", { reason: "malformed_attestation" });
  return { encodedPayload, signature };
};

export async function verifyAgentAttestation(input: { token: string; expectedAgentId: string; workspaceId: string; permission: Permission; projectId?: string }) {
  const secret = process.env.PMFREAK_AGENT_TOKEN_SECRET;
  if (!secret) throw new AccessDeniedError("Missing agent attestation secret.");

  const { encodedPayload, signature } = parseToken(input.token);
  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    void logSecurityEvent("invalid_attestation", { workspaceId: input.workspaceId, actorAgentId: input.expectedAgentId, routeId: "verifyAgentAttestation", metadata: { reason: "signature_mismatch" } });
    throw new AccessDeniedError("Invalid agent token signature.", { reason: "invalid_signature" });
  }

  const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AgentClaims;
  if (claims.exp * 1000 < Date.now()) {
    void logSecurityEvent("expired_attestation", { workspaceId: input.workspaceId, actorAgentId: input.expectedAgentId, routeId: "verifyAgentAttestation" });
    throw new AccessDeniedError("Agent token expired.", { reason: "expired_attestation" });
  }
  if (claims.workspaceId !== input.workspaceId || claims.agentId !== input.expectedAgentId) {
    void logSecurityEvent("external_scope_violation", { workspaceId: input.workspaceId, actorAgentId: input.expectedAgentId, routeId: "verifyAgentAttestation", metadata: { tokenWorkspaceId: claims.workspaceId, tokenAgentId: claims.agentId } });
    throw new AccessDeniedError("Agent token binding mismatch.", { reason: "binding_mismatch" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: revoked } = await supabase.from("ai_agent_permissions").select("id").eq("workspace_id", input.workspaceId).eq("agent_id", input.expectedAgentId).not("revoked_at", "is", null).limit(1);
  if ((revoked ?? []).length > 0) throw new AccessDeniedError("Agent has been revoked.", { reason: "revoked_agent_access" });

  await requireAgentScope({ workspaceId: input.workspaceId, agentId: input.expectedAgentId, permission: input.permission, projectId: input.projectId });

  const nonce = createHash("sha256").update(input.token).digest("hex");
  // PRIVILEGED_ACCESS: Nonce replay protection is a security primitive — the check and insert must bypass RLS so a token cannot suppress its own revocation record.
  // AUDIT_REF: service-role-risk-register.md
  const privileged = createPrivilegedSupabaseClient({
    routeId: "verifyAgentAttestation",
    operation: "replay_nonce_check",
    reason: "replay_protection",
    workspaceId: input.workspaceId,
    systemActor: "system",
  });

  const { data: existing, error: lookupError } = await privileged
    .from("agent_attestation_nonces")
    .select("nonce")
    .eq("nonce", nonce)
    .maybeSingle();

  if (lookupError) throw new Error("Replay protection check failed: " + lookupError.message);

  if (existing) {
    void logSecurityEvent("replay_detected", { workspaceId: input.workspaceId, actorAgentId: claims.agentId, routeId: "verifyAgentAttestation", metadata: { nonce } });
    throw new AccessDeniedError("Token already used.", { reason: "replay_detected" });
  }

  const { error: insertError } = await privileged
    .from("agent_attestation_nonces")
    .insert({ nonce, agent_id: claims.agentId, workspace_id: claims.workspaceId, expires_at: new Date(claims.exp * 1000).toISOString() });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new AccessDeniedError("Token already used.", { reason: "replay_detected" });
    }
    throw new Error("Replay protection insert failed: " + insertError.message);
  }

  return claims;
}
