import { requireAuthUser } from "@/lib/auth";
import { ensureCapitalLevels, getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import { formatCurrencyOrUnavailable } from "@/lib/capital/capital-display-formatters";

const STATUS_STYLE: Record<string, string> = {
  locked: "border-white/10 bg-white/5 text-slate-300",
  active: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  breached: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
};

const GOVERNANCE_BADGES = ["Paper-only", "Read-only", "Real execution locked"] as const;

export default async function CapitalLevelsPage() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const levels = await ensureCapitalLevels(user.companyId, portfolio);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Capital Levels</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Static simulated capital tiers for this paper portfolio</h2>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {GOVERNANCE_BADGES.map((badge) => (
            <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          This page is read-only. Capital level thresholds are static configuration, not investment advice, and do not enable real
          execution.
        </p>
        <div className="mt-4 space-y-2">
          {levels.map((level) => (
            <div key={level.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">
              <span className="font-medium text-white">{level.level_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{formatCurrencyOrUnavailable(level.threshold_usd)}</span>
                <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[level.status]}`}>{level.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
