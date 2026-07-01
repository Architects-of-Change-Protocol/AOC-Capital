"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { resolvePostAuthRedirectPath } from "@/lib/auth-redirect";

export const loginAction = async (formData: FormData): Promise<void> => {
  if (!hasSupabaseEnv) {
    redirect("/login?error=Configure+Supabase+environment+variables");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const isUnverified = error.message.toLowerCase().includes("email not confirmed");
    const message = isUnverified ? "Please verify your email before logging in." : error.message;
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const redirectPath = await resolvePostAuthRedirectPath(supabase);
  redirect(redirectPath);
};
