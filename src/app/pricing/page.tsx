"use client";

import { useState } from "react";
import { MarketingNavbar } from "@/components/marketing-navbar";

type Tier = "pro" | "pmo";

const plans = [
  {
    tier: "pro" as const,
    name: "Pro",
    price: "$49 / month",
    description: "For PMs who want clearer weekly priorities, better meeting prep, and faster follow-through.",
    features: ["Advanced AI actions", "Expanded upload + analysis limits", "Reporting exports"],
  },
  {
    tier: "pmo" as const,
    name: "PMO",
    price: "$199 / month",
    description: "For PMO and delivery teams who need shared visibility, aligned actions, and portfolio consistency.",
    features: ["Create PMO workspaces", "Invite team members", "PMO processes + directives"],
  },
  {
    tier: null,
    name: "Enterprise",
    price: "Custom",
    description: "For enterprise rollouts that need security review, procurement support, and guided onboarding.",
    features: ["Security + procurement support", "Tenant controls", "Guided rollout"],
  },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (tier: Tier) => {
    setLoadingTier(tier);
    setError(null);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setError("Unable to start checkout.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <>
      <MarketingNavbar />
      <main className="min-h-screen bg-white px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#ff008c]">PMFreak AI • Pricing</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose the plan that fits how you run projects</h1>
            <p className="mt-2 text-zinc-600">Start free, then upgrade when you need deeper support across teams.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-bold text-zinc-950">{plan.price}</p>
                <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  {plan.tier ? (
                    <button
                      type="button"
                      onClick={() => void checkout(plan.tier)}
                      disabled={loadingTier === plan.tier}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff008c] px-6 text-sm font-semibold text-white transition hover:bg-[#db0078] disabled:bg-zinc-400"
                    >
                      {loadingTier === plan.tier ? "Continuing..." : `Start  ${plan.name}`}
                    </button>
                  ) : (
                    <a
                      href="mailto:sales@pmfreak.ai?subject=PMFreak%20Enterprise"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                    >
                      Contact Sales
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>

          {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}
        </div>
      </main>
    </>
  );
}
