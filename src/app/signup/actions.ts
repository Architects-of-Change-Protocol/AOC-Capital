"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const role = String(formData.get("role") ?? "pm").trim();
  const requestedRoute = String(formData.get("next") ?? "").trim() || null;

  if (!email || !password || !fullName || !companyName) {
    redirect("/signup?error=Please+complete+all+required+fields");
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        full_name: fullName,
        company_name: companyName,
        role: role || "pm",
        onboarding_completed: false,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(`/signup/confirm-email?email=${encodeURIComponent(email)}`);
  }

  const safe = requestedRoute ? isSafeContinuationRoute(requestedRoute) : false;
  const decision = resolvePostAuthDestination({
    isAuthenticated: Boolean(data.user),
    onboardingCompleted: data.user?.user_metadata?.onboarding_completed === true,
    requestedRoute,
    isRequestedRouteSafe: safe,
  });
  redirect(decision.destination);
}
