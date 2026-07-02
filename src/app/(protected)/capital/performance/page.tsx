import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio, markAllOpenPositions, getStrategyPerformance } from "@/lib/trading/trade-service";
import type { StrategyHealth } from "@/lib/trading/portfolio-summary";
import type { AdvisorRecommendationAction } from "@/lib/trading/strategy-performance";

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "positive" | "negative" | "warn" }) {
  const valueClass = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-rose-300" : tone === "warn" ? "text-amber-200" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

const HEALTH_COPY: Record<StrategyHealth, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  caution: { label: "Caution", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  breached: { label: "Breached", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

const RECOMMENDATION_COPY: Record<AdvisorRecommendationAction, { label: string; className: string }> = {
  continue: { label: "Continue Paper Monitoring", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  reduce_risk: { label: "Reduce Risk", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  pause: { label: "Pause", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  review_required: { label: "Review Required", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  not_ready_for_real_execution: { label: "Not Ready For Real Execution", className: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100" },
};

function pnlTone(value: number): "positive" | "negative" | undefined {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return undefined;
}

export default async function StrategyPerformancePage() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  await markAllOpenPositions(user.companyId, portfolio.id);
  const perf = await getStrategyPerformance(user.companyId, portfolio);

  const healthCopy = HEALTH_COPY[perf.strategyHealth];
  const recommendationCopy = RECOMMENDATION_COPY[perf.advisorRecommendation];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · Real execution is locked and gated for a future review
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strategy Performance Review</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{portfolio.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {perf.closedPositionsCount} closed paper trade{perf.closedPositionsCount === 1 ? "" : "s"} · {perf.openPositionsCount} open
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${healthCopy.className}`}>Risk Health: {healthCopy.label}</span>
          <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${recommendationCopy.className}`}>Advisor: {recommendationCopy.label}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Advisor Explanation</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{perf.advisorExplanation}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Starting Capital" value={`$${perf.startingCapitalUsd.toFixed(2)}`} />
        <StatCard label="Simulated Equity" value={`$${perf.simulatedEquityUsd.toFixed(2)}`} tone={pnlTone(perf.totalPnlUsd)} />
        <StatCard label="Total P&L" value={`$${perf.totalPnlUsd.toFixed(2)}`} sub={`${perf.totalReturnPct.toFixed(2)}% total return`} tone={pnlTone(perf.totalPnlUsd)} />
        <StatCard label="Realized P&L" value={`$${perf.realizedPnlUsd.toFixed(2)}`} sub="Closed positions only" tone={pnlTone(perf.realizedPnlUsd)} />
        <StatCard label="Unrealized P&L" value={`$${perf.unrealizedPnlUsd.toFixed(2)}`} sub="Open positions, mark-to-market" tone={pnlTone(perf.unrealizedPnlUsd)} />
        <StatCard label="Win Rate" value={`${perf.winRatePct.toFixed(1)}%`} sub={`${perf.closedPositionsCount} closed trade(s)`} />
        <StatCard label="Average Win" value={perf.avgWinUsd === null ? "—" : `$${perf.avgWinUsd.toFixed(2)}`} tone={perf.avgWinUsd === null ? undefined : "positive"} />
        <StatCard label="Average Loss" value={perf.avgLossUsd === null ? "—" : `$${perf.avgLossUsd.toFixed(2)}`} tone={perf.avgLossUsd === null ? undefined : "negative"} />
        <StatCard label="Profit Factor" value={perf.profitFactor === null ? "—" : perf.profitFactor.toFixed(2)} sub="Gross wins ÷ gross losses" tone={perf.profitFactor !== null && perf.profitFactor < 1 ? "warn" : undefined} />
        <StatCard label="Derived Max Drawdown" value={`${perf.maxDrawdownPct.toFixed(1)}%`} sub={`$${perf.maxDrawdownUsd.toFixed(2)} peak-to-trough`} tone={perf.maxDrawdownPct >= 15 ? "warn" : undefined} />
        <StatCard label="Current Drawdown" value={`${perf.currentDrawdownPct.toFixed(1)}%`} sub={`$${perf.currentDrawdownUsd.toFixed(2)} below peak`} tone={perf.currentDrawdownPct >= 15 ? "warn" : undefined} />
        <StatCard label="Exposure Usage" value={`${perf.exposureUsagePct.toFixed(1)}%`} sub="Of max Level 1 exposure ceiling" tone={perf.exposureUsagePct >= 80 ? "warn" : undefined} />
        <StatCard label="Daily Loss Usage" value={`${perf.dailyLossUsagePct.toFixed(1)}%`} sub="Rolling 24h, realized only" tone={perf.dailyLossUsagePct >= 50 ? "warn" : undefined} />
        <StatCard label="Weekly Loss Usage" value={`${perf.weeklyLossUsagePct.toFixed(1)}%`} sub="Rolling 7d, realized only" tone={perf.weeklyLossUsagePct >= 50 ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Best Trade</h3>
          {perf.bestTrade === null ? (
            <p className="mt-3 text-sm text-slate-500">No meaningful winning trade yet.</p>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <span className="text-white">{perf.bestTrade.symbol}</span>
              <span className="text-emerald-300">${perf.bestTrade.realizedPnlUsd.toFixed(2)}</span>
              <span className="text-xs text-slate-500">{new Date(perf.bestTrade.closedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Worst Trade</h3>
          {perf.worstTrade === null ? (
            <p className="mt-3 text-sm text-slate-500">No meaningful losing trade yet.</p>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <span className="text-white">{perf.worstTrade.symbol}</span>
              <span className="text-rose-300">${perf.worstTrade.realizedPnlUsd.toFixed(2)}</span>
              <span className="text-xs text-slate-500">{new Date(perf.worstTrade.closedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        Drawdown is derived from closed paper trades plus current open P&amp;L; it does not include full intratrade mark history.
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        This review is analytics over simulated paper-trading data only. It does not place, modify, or route any real order, and it does not
        grant, unlock, or enable real-money or live-exchange execution — future real execution (if ever offered) would remain a separate,
        explicitly gated capability.
      </div>
    </div>
  );
}
