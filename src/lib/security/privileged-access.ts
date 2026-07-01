import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { logSecurityEvent } from "@/lib/security/telemetry";

export type PrivilegedAccessContext = {
  routeId: string;
  operation: string;
  reason: string;
  workspaceId?: string | null;
  actorUserId?: string | null;
  systemActor?: "stripe_webhook" | "background_job" | "security_telemetry" | "system";
  allowTelemetryRecursionBypass?: boolean;
};

const assertContext = (context: PrivilegedAccessContext) => {
  if (!context.routeId || !context.operation || !context.reason) throw new Error("Missing required privileged access context fields.");
  if (!context.actorUserId && !context.systemActor) throw new Error("Privileged access requires actorUserId or systemActor.");
};

export const createPrivilegedSupabaseClient = (context: PrivilegedAccessContext): SupabaseClient => {
  assertContext(context);
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();

  if (!context.allowTelemetryRecursionBypass) {
    void logSecurityEvent("privileged_client_used", {
      workspaceId: context.workspaceId ?? null,
      actorUserId: context.actorUserId ?? null,
      actorRole: context.systemActor ?? null,
      routeId: context.routeId,
      metadata: { operation: context.operation, reason: context.reason },
    });
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
};

export const withPrivilegedDbAccess = async <T>(context: PrivilegedAccessContext, fn: (supabase: SupabaseClient) => Promise<T>) => {
  const supabase = createPrivilegedSupabaseClient(context);
  return fn(supabase);
};
