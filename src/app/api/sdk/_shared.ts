import { getAuthUser } from "@/lib/auth";
import { apiError, apiUnauthorized, type ApiMeta } from "@/lib/api/http";
import { logReliabilityEvent } from "@/lib/api/reliability";

export async function requireSdkUser(meta: ApiMeta) {
  const user = await getAuthUser();
  if (!user) return { response: apiUnauthorized(meta) };
  return { user };
}

export function sdkWorkspaceRequired(meta: ApiMeta) {
  return apiError({ code: "workspace_required", suggestedAction: "Select a workspace and retry." }, meta, 400);
}

export function sdkDbError(meta: ApiMeta, route: string, reason: string, userId?: string | null, workspaceId?: string | null) {
  logReliabilityEvent({ requestId: meta.requestId, route, userId, workspaceId, errorCode: "database_unavailable", recoverable: true, reason });
  return apiError({ code: "database_unavailable", reason, suggestedAction: "Please retry in a few moments." }, meta, 503);
}
