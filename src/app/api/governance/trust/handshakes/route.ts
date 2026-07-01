import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import { explainTrustHandshake } from "@/lib/security/trust-handshakes";

export async function GET() {
  // PRIVILEGED_ACCESS: Admin handshake listing is cross-tenant — all handshakes across all trust domains must be visible regardless of workspace ownership.
  // AUDIT_REF: service-role-risk-register.md
  const supabase = createPrivilegedSupabaseClient({ routeId: "api.governance.trust.handshakes", operation: "list_handshakes", reason: "admin_review" });
  const { data } = await supabase.from("capability_verifier_handshakes").select("*").order("created_at", { ascending: false }).limit(100);
  return Response.json({ handshakes: (data ?? []).map(explainTrustHandshake) });
}
