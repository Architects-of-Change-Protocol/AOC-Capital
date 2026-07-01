import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import { resolveOnboardingState } from "@/lib/auth/resolve-onboarding-state";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Your verification link is invalid or expired. Please log in again.")}`, request.url));
    }
  }

  const {
    data: { user: rawUser },
  } = await supabase.auth.getUser();

  if (!rawUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Use canonical resolver to determine onboarding state
  const authUser = await getAuthUser();
  let onboardingState;
  if (authUser) {
    const workspace = await resolveCanonicalWorkspace(authUser.id);
    onboardingState = await resolveOnboardingState(authUser, workspace.workspaceId);
  }

  const decision = resolvePostAuthDestination({
    isAuthenticated: true,
    onboardingState,
    requestedRoute: next,
    isRequestedRouteSafe: Boolean(next && isSafeContinuationRoute(next)),
  });

  return NextResponse.redirect(new URL(decision.destination, request.url));
}
