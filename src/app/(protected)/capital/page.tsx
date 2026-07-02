import { requireAuthUser } from "@/lib/auth";
import { loadPortfolioOverview } from "@/lib/trading/trade-service";
import type { StrategyHealth } from "@/lib/trading/portfolio-summary";

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${warn ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/5"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${warn ? "text-amber-200" : "text-white"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

const HEALTH_COPY: Record<StrategyHealth, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  caution: { label: "Caution", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  breached: { label: "Breached", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

export default async function PortfolioOverviewPage() {
  const user = await requireAuthUser();
  const { portfolio, positions, capitalLevels, summary } = await loadPortfolioOverview(user.companyId);

  const openPositions = positions.filter((p) => p.status === "open");
  const healthCopy = HEALTH_COPY[summary.strategyHealth];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Capital Command Center</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{portfolio.name}</h2>
          <p className="mt-1 text-sm text-slate-400">Starting simulated capital: ${summary.baseCapitalUsd.toFixed(2)}</p>
        </div>
        <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${healthCopy.className}`}>Strategy Health: {healthCopy.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Simulated Equity" value={`$${summary.simulatedEquityUsd.toFixed(2)}`} sub={`Starting capital $${summary.baseCapitalUsd.toFixed(2)}`} />
        <StatCard label="Simulated Cash" value={`$${summary.simulatedCashUsd.toFixed(2)}`} />
        <StatCard
          label="Open Exposure"
          value={`$${summary.openExposureUsd.toFixed(2)}`}
          sub={`${summary.openExposurePct.toFixed(1)}% of capital`}
          warn={summary.openExposurePct >= 48}
        />
        <StatCard label="Open Positions" value={`${summary.openPositionsCount}`} sub={`Limit ${summary.maxOpenPositions}`} warn={summary.openPositionsCount >= summary.maxOpenPositions} />
        <StatCard label="Realized P&L" value={`$${summary.realizedPnlUsd.toFixed(2)}`} sub="All-time, closed positions only" />
        <StatCard label="Unrealized P&L" value={`$${summary.unrealizedPnlUsd.toFixed(2)}`} sub="Open positions, mark-to-market" />
        <StatCard label="Total P&L" value={`$${summary.totalPnlUsd.toFixed(2)}`} sub={`${summary.totalPnlPct.toFixed(2)}% of starting capital`} />
        <StatCard
          label="Daily Loss Remaining"
          value={`$${summary.dailyLossRemainingUsd.toFixed(2)}`}
          sub={`Limit -$${summary.maxDailyLossUsd.toFixed(2)} · rolling 24h, realized only`}
          warn={summary.dailyLossRemainingUsd <= 0}
        />
        <StatCard
          label="Weekly Loss Remaining"
          value={`$${summary.weeklyLossRemainingUsd.toFixed(2)}`}
          sub={`Limit -$${summary.maxWeeklyLossUsd.toFixed(2)} · rolling 7d, realized only`}
          warn={summary.weeklyLossRemainingUsd <= 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Open Positions</h3>
          <div className="mt-3 space-y-2">
            {openPositions.length === 0 && <p className="text-sm text-slate-500">No open paper positions.</p>}
            {openPositions.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-sm">
                <span className="text-white">{p.symbol}</span>
                <span className="text-slate-400">
                  {p.side} · {p.quantity} @ ${p.entry_price_usd.toFixed(2)}
                </span>
                <span className={p.unrealized_pnl_usd >= 0 ? "text-emerald-300" : "text-rose-300"}>${p.unrealized_pnl_usd.toFixed(2)}</span>
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
