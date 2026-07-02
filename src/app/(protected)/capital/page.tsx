import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { loadPortfolioOverview } from "@/lib/trading/trade-service";
import type { StrategyHealth } from "@/lib/trading/portfolio-summary";
import {
  DISCOVERABILITY_LINKS,
  GUIDED_JOURNEY,
  LIVE_MARKET_DATA_DISCLOSURE,
  NOT_FINANCIAL_ADVICE_DISCLOSURE,
  PAPER_ONLY_BANNER,
  PRIMARY_ACTIONS,
  TRUST_LADDER,
  WHAT_IS_AOC_CAPITAL,
  WHAT_PAPER_TRADING_MEANS,
  WHY_REAL_EXECUTION_IS_LOCKED,
  type TrustLadderStatus,
} from "@/lib/capital/command-center-content";

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

const TRUST_STATUS_COPY: Record<TrustLadderStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  available: { label: "Available", className: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100" },
  locked: { label: "Locked · Future", className: "border-white/10 bg-white/5 text-slate-400" },
};

function PrimaryActionCard({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.05] p-5 transition hover:border-cyan-200/40 hover:bg-cyan-300/[0.09]"
    >
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{label}</span>
      <p className="mt-2 flex-1 text-sm text-slate-300">{description}</p>
      <span className="mt-3 text-sm text-cyan-200">Open →</span>
    </Link>
  );
}

export default async function PortfolioOverviewPage() {
  const user = await requireAuthUser();
  const { portfolio, positions, capitalLevels, summary } = await loadPortfolioOverview(user.companyId);

  const openPositions = positions.filter((p) => p.status === "open");
  const healthCopy = HEALTH_COPY[summary.strategyHealth];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">{PAPER_ONLY_BANNER}</div>

      {/* What is AOC Capital / why real execution is locked */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">What is AOC Capital</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{WHAT_IS_AOC_CAPITAL}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">What paper trading means</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{WHAT_PAPER_TRADING_MEANS}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Why real execution remains locked</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{WHY_REAL_EXECUTION_IS_LOCKED}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">{NOT_FINANCIAL_ADVICE_DISCLOSURE}</p>
        <p className="mt-2 text-xs text-slate-500">{LIVE_MARKET_DATA_DISCLOSURE}</p>
      </div>

      {/* Primary actions */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Get started</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PRIMARY_ACTIONS.map((action) => (
            <PrimaryActionCard key={action.href} href={action.href} label={action.label} description={action.description} />
          ))}
        </div>
      </div>

      {/* Guided journey */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Guided Journey</p>
        <h2 className="mt-1 text-lg font-semibold text-white">How everything fits together</h2>
        <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUIDED_JOURNEY.map((item) => {
            const content = (
              <>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs font-semibold ${
                      item.locked ? "border-white/10 bg-white/5 text-slate-500" : "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100"
                    }`}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${item.locked ? "text-slate-400" : "text-white"}`}>{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>
              </>
            );
            return (
              <li key={item.step} className="rounded-xl border border-white/5 bg-black/10 p-4">
                {item.href ? (
                  <Link href={item.href} className="block transition hover:opacity-80">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Trust / capability ladder */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Capability Ladder</p>
        <h2 className="mt-1 text-lg font-semibold text-white">What&apos;s unlocked today, and what stays gated</h2>
        <div className="mt-4 space-y-2">
          {TRUST_LADDER.map((level) => {
            const statusCopy = TRUST_STATUS_COPY[level.status];
            return (
              <div key={level.level} className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300">
                    {level.level}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{level.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{level.description}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusCopy.className}`}>{statusCopy.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your Portfolio</p>
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

      {/* Discoverability */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Explore every section</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVERABILITY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-white/5 bg-black/10 p-4 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.07]"
            >
              <p className="text-sm font-medium text-white">{link.label}</p>
              <p className="mt-1 text-xs text-slate-400">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
