import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { resolveOnboardingState } from "@/lib/auth/resolve-onboarding-state";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { getAuthUser } from "@/lib/auth";

/**
 * @deprecated Use resolvePostAuthRedirectPath which resolves canonical onboarding state.
 * This sync helper remains only for legacy callers that have no async context.
 */
const toRedirectPathLegacy = (user: User | null) =>
  resolvePostAuthDestination({
    isAuthenticated: Boolean(user),
    onboardingCompleted: user?.user_metadata?.onboarding_completed === true,
  }).destination;

export const getPostAuthRedirectPath = (user: User | null) => toRedirectPathLegacy(user);

/**
 * Resolves the post-auth redirect path using the canonical onboarding state resolver.
 * Preferred over getPostAuthRedirectPath for all server-side callers.
 */
export const resolvePostAuthRedirectPath = async (supabase: SupabaseClient) => {
  const {
    data: { user: rawUser },
  } = await supabase.auth.getUser();

  if (!rawUser) {
    return resolvePostAuthDestination({ isAuthenticated: false }).destination;
  }

  // Use canonical resolver
  const authUser = await getAuthUser();
  if (authUser) {
    const workspace = await resolveCanonicalWorkspace(authUser.id);
    const onboardingState = await resolveOnboardingState(authUser, workspace.workspaceId);
    return resolvePostAuthDestination({ isAuthenticated: true, onboardingState }).destination;
  }

  // Fallback to JWT boolean if getAuthUser fails
  return toRedirectPathLegacy(rawUser);
};
