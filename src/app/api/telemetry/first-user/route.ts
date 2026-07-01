import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getOrCreateOnboardingSessionId, logFirstUserTelemetryEvent, type FirstUserTelemetryEventType } from "@/lib/first-user-telemetry";

const allowed = new Set<FirstUserTelemetryEventType>([
  "onboarding_started",
  "onboarding_completed",
  "invite_link_opened",
  "invite_activation_attempted",
  "invite_activation_completed",
  "invite_activation_failed",
  "first_workspace_loaded",
  "first_copilot_interaction",
  "first_operational_memory_write",
  "first_follow_up_created",
  "onboarding_abandoned",
  "runtime_initialization_issue",
]);

export async function POST(request: Request) {
  const user = await getAuthUser();
  const body = await request.json().catch(() => null) as { eventType?: FirstUserTelemetryEventType; workspaceId?: string; inviteId?: string; metadata?: Record<string, unknown>; sessionId?: string } | null;
  if (!body?.eventType || !allowed.has(body.eventType)) return NextResponse.json({ error: "Invalid event type." }, { status: 400 });

  const sessionId = body.sessionId || await getOrCreateOnboardingSessionId();
  await logFirstUserTelemetryEvent({
    eventType: body.eventType,
    userId: user?.id ?? null,
    workspaceId: body.workspaceId ?? null,
    inviteId: body.inviteId ?? null,
    sessionId,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true, sessionId });
}
