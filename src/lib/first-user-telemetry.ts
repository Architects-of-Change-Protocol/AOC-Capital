import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export type FirstUserTelemetryEventType =
  | "onboarding_started"
  | "onboarding_completed"
  | "invite_link_opened"
  | "invite_activation_attempted"
  | "invite_activation_completed"
  | "invite_activation_failed"
  | "first_workspace_loaded"
  | "first_copilot_interaction"
  | "first_operational_memory_write"
  | "first_follow_up_created"
  | "onboarding_abandoned"
  | "runtime_initialization_issue";

const COOKIE_NAME = "pmfreak_onboarding_session";

export async function getOrCreateOnboardingSessionId() {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  store.set(COOKIE_NAME, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return sessionId;
}

export async function logFirstUserTelemetryEvent(input: { eventType: FirstUserTelemetryEventType; userId?: string | null; workspaceId?: string | null; inviteId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown>; }) {
  const supabase = createSupabaseServiceRoleClient({ routeId: "first-user-telemetry", operation: "service_role_query", reason: "operational_onboarding_visibility", systemActor: "system" });
  await supabase.from("first_user_telemetry_events").insert({
    event_type: input.eventType,
    user_id: input.userId ?? null,
    workspace_id: input.workspaceId ?? null,
    invite_id: input.inviteId ?? null,
    session_id: input.sessionId ?? null,
    metadata: input.metadata ?? {},
  });
}
