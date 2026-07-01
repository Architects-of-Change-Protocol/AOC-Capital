"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) setErrorMessage(error.message);
      else {
        setSuccessMessage("Check your email for a password reset link.");
        setEmail("");
      }
    } catch {
      setErrorMessage("Unable to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your access" subtitle="Enter your email and we’ll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm" />

        <button type="submit" disabled={loading} className="w-full rounded-xl border-2 border-black bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616] disabled:opacity-70">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {successMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
      {errorMessage ? <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <p className="mt-6 text-sm">
        Back to <Link href="/login" className="font-bold">login</Link>
      </p>
    </AuthShell>
  );
}
