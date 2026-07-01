import type { PostAuthDecision } from "@/lib/auth/resolve-post-auth-destination";

export function debugAuthDecision(input: {
  requestedRoute?: string | null;
  onboardingCompleted: boolean;
  decision: PostAuthDecision;
}) {
  if (process.env.NODE_ENV !== "development") return;

  console.info("[auth-decision]", {
    requestedRoute: input.requestedRoute ?? null,
    onboardingCompleted: input.onboardingCompleted,
    destination: input.decision.destination,
    reason: input.decision.reason,
  });
}
