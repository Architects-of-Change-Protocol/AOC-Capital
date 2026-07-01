import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logContinuityIssue } from "@/lib/auth/auth-continuity-diagnostics";
import { cookies, headers } from "next/headers";

export type RuntimeAuthContinuityReport = {
  ok: boolean;
  userId: string | null;
  expired: boolean;
  networkError: boolean;
  issues: string[];
};

export async function assertRuntimeAuthContinuity(): Promise<RuntimeAuthContinuityReport> {
  const supabase = await createSupabaseServerClient();

  const cookieStore = await cookies();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "(unknown)";
  const allCookies = cookieStore.getAll();
  const authCookieNames = allCookies
    .filter((c) => c.name.startsWith("sb-") || c.name.includes("supabase") || c.name.includes("auth"))
    .map((c) => c.name);
  console.log("[auth-continuity] pathname:", pathname);
  console.log("[auth-continuity] auth-related cookies present:", authCookieNames.length > 0 ? authCookieNames : "(none)");

  // getUser() validates the JWT against Supabase's server (authoritative).
  // Unlike getSession(), it does not silently pass expired tokens.
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log("[auth-continuity] getUser result:", user ? `userId=${user.id}` : `null (error: ${error?.message ?? "none"}, status: ${(error as { status?: number } | null)?.status ?? "n/a"})`);

  if (user) {
    return { ok: true, userId: user.id, expired: false, networkError: false, issues: [] };
  }

  // Distinguish a genuine auth failure (401/403) from a transient network or API
  // error. For network errors, fall back to getSession() to avoid bouncing an
  // authenticated user to /login when Supabase has a momentary hiccup.
  const errorStatus = (error as { status?: number } | null)?.status;
  const isAuthRejection = errorStatus === 401 || errorStatus === 403;
  const isNetworkError = !isAuthRejection && Boolean(error);

  if (isNetworkError) {
    console.log("[auth-continuity] getUser returned a non-auth error; falling back to getSession()");
    const { data: { session } } = await supabase.auth.getSession();
    const sessionExpiresAt = session?.expires_at ?? 0;
    const sessionValid = Boolean(session?.user) && sessionExpiresAt * 1000 > Date.now();
    console.log("[auth-continuity] getSession fallback:", sessionValid ? `userId=${session!.user.id}` : "no valid session");

    if (sessionValid) {
      logContinuityIssue(
        "auth",
        { code: "getuser_network_error_session_fallback", severity: "warn", message: error?.message ?? "getUser failed, session fallback used" },
        { pathname, errorStatus }
      );
      return { ok: true, userId: session!.user.id, expired: false, networkError: true, issues: ["getuser_network_error"] };
    }
  }

  const issue = isAuthRejection ? "auth_rejected" : "missing_session";
  logContinuityIssue(
    "auth",
    { code: issue, severity: "warn", message: error?.message ?? "No authenticated user" },
    { pathname, errorStatus }
  );
  return { ok: false, userId: null, expired: true, networkError: false, issues: [issue] };
}
