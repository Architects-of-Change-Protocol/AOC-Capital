import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Check your email" subtitle="Confirm your account to start using PMFreak.">
      <p className="text-sm font-medium text-black/70">
        We sent a confirmation link to <span className="font-bold">{params.email ?? "your inbox"}</span>.
      </p>

      <p className="mt-3 text-xs font-medium text-black/50">
        Check spam/promotions if you don’t see it.
      </p>

      <div className="mt-6">
        <Link href="/login" className="inline-flex rounded-xl border-2 border-black bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616]">
          Go to login
        </Link>
      </div>
    </AuthShell>
  );
}
