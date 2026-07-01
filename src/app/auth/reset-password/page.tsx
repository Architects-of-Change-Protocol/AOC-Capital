"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/login?success=Password+updated.+Please+sign+in.");
    } catch {
      setErrorMessage("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Secure your account and continue.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="New password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm" />
        <input type="password" placeholder="Confirm password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm" />

        <button type="submit" disabled={loading} className="w-full rounded-xl border-2 border-black bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616] disabled:opacity-70">
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p> : null}
    </AuthShell>
  );
}
