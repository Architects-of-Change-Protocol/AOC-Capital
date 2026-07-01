import { requireAuthUser } from "@/lib/auth";
import { loadPortfolioOverview } from "@/lib/trading/trade-service";
import { MAX_DAILY_SIMULATED_LOSS_USD, MAX_OPEN_POSITIONS, MAX_SIMULATED_EXPOSURE_RATIO, MAX_WEEKLY_SIMULATED_LOSS_USD } from "@/lib/trading/risk-policy-engine";

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${warn ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/5"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${warn ? "text-amber-200" : "text-white"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

export default async function PortfolioOverviewPage() {
  const user = await requireAuthUser();
  const { portfolio, state, positions, capitalLevels } = await loadPortfolioOverview(user.companyId);

  const exposureRatio = state.baseCapitalUsd > 0 ? state.currentExposureUsd / state.baseCapitalUsd : 0;
  const openPositions = positions.filter((p) => p.status === "open");

  let health: "healthy" | "watch" | "breach" = "healthy";
  if (exposureRatio > MAX_SIMULATED_EXPOSURE_RATIO || state.dailyPnlUsd <= -MAX_DAILY_SIMULATED_LOSS_USD || state.weeklyPnlUsd <= -MAX_WEEKLY_SIMULATED_LOSS_USD) {
    health = "breach";
  } else if (exposureRatio > MAX_SIMULATED_EXPOSURE_RATIO * 0.8 || state.openPositionCount >= MAX_OPEN_POSITIONS) {
    health = "watch";
  }

  const healthCopy = {
    healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
    watch: { label: "Watch", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
    breach: { label: "At Limit", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  }[health];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portfolio Brain</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{portfolio.name}</h2>
          <p className="mt-1 text-sm text-slate-400">Base simulated capital: ${portfolio.base_capital_usd.toFixed(2)}</p>
        </div>
        <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${healthCopy.className}`}>Strategy Health: {healthCopy.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Simulated Exposure" value={`${(exposureRatio * 100).toFixed(1)}%`} sub={`Limit ${MAX_SIMULATED_EXPOSURE_RATIO * 100}%`} warn={exposureRatio > MAX_SIMULATED_EXPOSURE_RATIO * 0.8} />
        <StatCard label="Open Paper Positions" value={`${state.openPositionCount}`} sub={`Limit ${MAX_OPEN_POSITIONS}`} warn={state.openPositionCount >= MAX_OPEN_POSITIONS} />
        <StatCard label="Daily Simulated P&L" value={`$${state.dailyPnlUsd.toFixed(2)}`} sub={`Loss limit -$${MAX_DAILY_SIMULATED_LOSS_USD.toFixed(2)}`} warn={state.dailyPnlUsd <= -MAX_DAILY_SIMULATED_LOSS_USD} />
        <StatCard label="Weekly Simulated P&L" value={`$${state.weeklyPnlUsd.toFixed(2)}`} sub={`Loss limit -$${MAX_WEEKLY_SIMULATED_LOSS_USD.toFixed(2)}`} warn={state.weeklyPnlUsd <= -MAX_WEEKLY_SIMULATED_LOSS_USD} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Open Positions</h3>
          <div className="mt-3 space-y-2">
            {openPositions.length === 0 && <p className="text-sm text-slate-500">No open paper positions.</p>}
            {openPositions.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-sm">
                <span className="text-white">{p.symbol}</span>
                <span className="text-slate-400">{p.side} · {p.quantity} @ ${p.entry_price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Capital Levels</h3>
          <div className="mt-3 space-y-2">
            {capitalLevels.map((level) => (
              <div key={level.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-sm">
                <span className="text-white">{level.level_name}</span>
                <span className="text-slate-400">${level.threshold_usd.toFixed(2)} · {level.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
