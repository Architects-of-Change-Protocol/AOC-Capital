import { requireAuthUser } from "@/lib/auth";
import { AdvisorWizard } from "./advisor-wizard";

// Intentionally does not touch the portfolio, risk constitution, or audit ledger —
// those are only created/updated after the user reviews and confirms the
// generated recommendation (see /api/capital/advisor/confirm).
export default async function CapitalAdvisorPage() {
  await requireAuthUser();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AOC Capital Advisor</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Define your investment strategy</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Answer a few questions and the advisor will generate an Investment Strategy Brief, Risk Profile, Recommended Capital
          Level, and Initial Risk Constitution. Nothing is created until you review and confirm — this is simulated, governed
          paper trading only. No real exchange execution, broker integrations, or API keys are ever enabled here.
        </p>
      </div>

      <AdvisorWizard />
    </div>
  );
}
