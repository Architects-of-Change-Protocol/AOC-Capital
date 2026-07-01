import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // PRIVILEGED_ACCESS: Trust events span trust domains for cross-verifier synchronization and cannot be scoped to a single tenant's RLS context.
  // AUDIT_REF: service-role-risk-register.md
  const supabase = createPrivilegedSupabaseClient({ routeId: "api.governance.trust.events", operation: "list_trust_events", reason: "trusted_sync" });
  let query = supabase.from("capability_trust_events").select("*").order("created_at", { ascending: false }).limit(500);
  if (searchParams.get("trustDomain")) query = query.eq("trust_domain", searchParams.get("trustDomain"));
  if (searchParams.get("eventType")) query = query.eq("event_type", searchParams.get("eventType"));
  if (searchParams.get("severity")) query = query.eq("severity", searchParams.get("severity"));
  if (searchParams.get("since")) query = query.gte("created_at", searchParams.get("since"));
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ events: data ?? [] });
}
