import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCapabilityRequest } from "@/lib/security/capability-flow";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { SDK_GOVERNANCE_ACTIONS } from "@/lib/aoc/runtime/governance-actions";
import { apiCreated, apiPaginated, apiUnauthorized, apiValidationError, getRequestId } from "@/lib/api/http";
import { parsePagination, requireId } from "@/lib/api/validation";

export async function GET(request: Request) {
  const meta = { requestId: getRequestId(request), version: "v1" };
  const user = await getAuthUser();
  if (!user) return apiUnauthorized(meta);
  try {
    const url = new URL(request.url);
    const workspaceId = requireId("workspaceId", url.searchParams.get("workspaceId"));
    const { limit } = parsePagination(url);

    const decision = await authorizeRuntimeAction(
      buildEnterpriseRuntimeRequest({ user, action: SDK_GOVERNANCE_ACTIONS.CAPABILITIES_READ, routeId: "/api/sdk/capabilities/requests", workspaceId, resourceType: "workspace", resourceId: workspaceId }),
    );
    if (!decision.allowed) return Response.json({ error: "Forbidden", decisionId: decision.decisionId }, { status: 403 });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("capability_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(limit + 1);
    if (error) throw new Error("query_failed");
    const rows = data ?? [];
    return apiPaginated(rows.slice(0, limit), { limit, nextCursor: rows.length > limit ? String(rows[limit].id) : null }, meta);
  } catch (error) {
    return apiValidationError(meta, { reason: (error as Error).message });
  }
}

export async function POST(request: Request) {
  const meta = { requestId: getRequestId(request), version: "v1" };
  const user = await getAuthUser();
  if (!user) return apiUnauthorized(meta);
  try {
    const body = await request.json();
    requireId("workspaceId", body.workspaceId);
    const created = await createCapabilityRequest(body);
    return apiCreated(created, meta);
  } catch (error) {
    return apiValidationError(meta, { reason: (error as Error).message });
  }
}
