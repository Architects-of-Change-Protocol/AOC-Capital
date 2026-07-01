import Link from "next/link";
import { AuthShell } from "@/ui-core/auth/auth-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Continue where you left off and stay ahead this week.">
      {params.error ? <p className="mb-4 text-sm text-red-600">{params.error}</p> : null}

      <form action="/api/login" method="post" className="space-y-4">
        {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
        <input name="email" type="email" placeholder="Email" required className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm" />
        <input name="password" type="password" placeholder="Password" required className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm" />

        <button type="submit" className="w-full rounded-xl border-2 border-black bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616]">
          Continue
        </button>
      </form>

      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="font-bold">Forgot password?</Link>
      </p>

      <p className="mt-6 text-sm">
        No account? <Link href={params.next ? `/signup?next=${encodeURIComponent(params.next)}` : "/signup"} className="font-bold">Start Free</Link>
      </p>
    </AuthShell>
  );
}
