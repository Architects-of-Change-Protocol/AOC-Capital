import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getPortfolioOverview } from "@/lib/capital/portfolio-overview-service";
import {
  EMPTY_NO_ACTIVITY,
  EMPTY_NO_CANCELLED_DRAFTS,
  EMPTY_NO_DECISIONS,
  EMPTY_NO_DRAFT_INTENTS,
  EMPTY_NO_OPEN_POSITIONS,
  EMPTY_NO_SIGNALS,
  EMPTY_NO_STRATEGY_SELECTED,
  FRESHNESS_NOTE,
  GOVERNANCE_BADGES,
  NAV_LINKS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  REJECTED_DECISIONS_NOTE,
  SECTION_TITLES,
} from "@/lib/capital/portfolio-overview-content";

const GOVERNANCE_STATUS_COPY: Record<string, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  review_needed: { label: "Review Needed", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  blocked: { label: "Blocked", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_ready: { label: "No Data Yet", className: "border-white/10 bg-white/5 text-slate-400" },
};

const STRATEGY_STATUS_COPY: Record<string, { label: string; className: string }> = {
  none: { label: "No Strategy Selected", className: "border-white/10 bg-white/5 text-slate-400" },
  active: { label: "Active", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  stale: { label: "Stale", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  review_required: { label: "Performance Review Required", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
};

const INTENT_STATUS_STYLE: Record<string, string> = {
  draft: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100",
  pending: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200",
  approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  closed: "border-white/10 bg-white/5 text-slate-300",
  cancelled: "border-white/10 bg-white/5 text-slate-400",
};

function fmtUsd(value: number | null): string {
  if (value === null) return "Not available yet";
  return `$${value.toFixed(2)}`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function pnlClassName(value: number | null): string {
  if (value === null) return "text-slate-300";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function StatCard({ label, value, sub, valueClassName }: { label: string; value: string; sub?: string; valueClassName?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClassName ?? "text-white"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-xs text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
      View all →
    </Link>
  );
}

export default async function PortfolioOverviewDashboardPage() {
  const user = await requireAuthUser();
  const overview = await getPortfolioOverview(user.companyId);
  const { portfolio, strategy, signals, tradeIntents, decisions, positions, governance, recentActivity, nextAction } = overview;

  const governanceCopy = GOVERNANCE_STATUS_COPY[governance.status];
  const strategyCopy = STRATEGY_STATUS_COPY[strategy.status];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{PAGE_TITLE}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{PAGE_SUBTITLE}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {GOVERNANCE_BADGES.map((badge) => (
            <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">{FRESHNESS_NOTE}</p>
        <div className="mt-4">
          <Link
            href={NAV_LINKS.allocation}
            className="inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2]"
          >
            View Allocation & Exposure →
          </Link>
        </div>
      </div>

      {/* Section 1: Portfolio Summary */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.portfolioSummary}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Simulated Portfolio Value" value={fmtUsd(portfolio.simulatedPortfolioValueUsd)} sub={`Base capital ${fmtUsd(portfolio.baseCapitalUsd)}`} />
          <StatCard label="Simulated Cash / Available Capital" value={fmtUsd(portfolio.simulatedCashUsd)} />
          <StatCard label="Open Exposure" value={fmtUsd(portfolio.openExposureUsd)} />
          <StatCard label="Open Positions" value={`${portfolio.openPositionsCount}`} sub={`${portfolio.closedPositionsCount} closed`} />
          <StatCard label="Unrealized P&L" value={fmtUsd(portfolio.unrealizedPnlUsd)} valueClassName={pnlClassName(portfolio.unrealizedPnlUsd)} />
          <StatCard label="Realized P&L" value={fmtUsd(portfolio.realizedPnlUsd)} valueClassName={pnlClassName(portfolio.realizedPnlUsd)} />
          <StatCard label="Total P&L" value={fmtUsd(portfolio.totalPnlUsd)} valueClassName={pnlClassName(portfolio.totalPnlUsd)} />
          <StatCard label="Drafts Pending" value={`${tradeIntents.draftCount}`} sub="Waiting for submit or cancel" />
          <StatCard label="Last Mark-to-Market" value={fmtDate(portfolio.lastMarkedToMarketAt)} />
        </div>
      </div>

      {/* Middle grid: Strategy, Risk Constitution, Next Action */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Section 2: Strategy Summary */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{SECTION_TITLES.strategySummary}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${strategyCopy.className}`}>{strategyCopy.label}</span>
          </div>
          {strategy.name ? (
            <div className="space-y-2 text-sm">
              <p className="text-white">{strategy.name}</p>
              <p className="text-xs text-slate-400">Selected: {fmtDate(strategy.selectedAt)}</p>
              {strategy.recommendation ? <p className="text-xs text-slate-400">{strategy.recommendation}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{EMPTY_NO_STRATEGY_SELECTED}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={NAV_LINKS.strategyLibrary} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2]">
              Open Strategy Library
            </Link>
            <Link href={NAV_LINKS.performance} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100">
              View Performance Review
            </Link>
          </div>
        </div>

        {/* Section 3: Risk Constitution Status */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{SECTION_TITLES.riskConstitutionStatus}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-400">
            {governance.reasons.map((reason, index) => (
              <li key={index}>• {reason}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Real execution locked</span>
            <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Paper simulation only</span>
            <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">No broker connected</span>
            <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">No live order routing</span>
          </div>
        </div>

        {/* Section 10: Recommended Next Action */}
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.05] p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">{SECTION_TITLES.nextAction}</h2>
          <p className="text-sm font-medium text-white">{nextAction.title}</p>
          <p className="mt-2 text-sm text-slate-300">{nextAction.description}</p>
          {nextAction.href ? (
            <Link
              href={nextAction.href}
              className="mt-4 inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2]"
            >
              Open →
            </Link>
          ) : null}
        </div>
      </div>

      {/* Pipeline section: Signals, Draft Intents, Decisions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Section 4: Signal Pipeline */}
        <SectionCard title={SECTION_TITLES.signalPipeline} action={<ViewAllLink href={NAV_LINKS.signals} />}>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{signals.activeCount}</p>
              <p className="text-slate-400">Active</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{signals.convertibleCount}</p>
              <p className="text-slate-400">Convertible</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{signals.blockedCount}</p>
              <p className="text-slate-400">Blocked by Risk</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{signals.watchCount}</p>
              <p className="text-slate-400">Watch / No Action</p>
            </div>
          </div>
          <div className="space-y-2">
            {signals.recent.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_SIGNALS}</p>}
            {signals.recent.map((signal) => (
              <div key={signal.id} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{signal.symbol}</span>
                  <span className="text-slate-400">{signal.action.replace(/_/g, " ")}</span>
                </div>
                <p className="mt-1 text-slate-500">
                  {signal.status} · {signal.convertedTradeIntentId ? "converted to draft" : "not converted"}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 5: Draft Intent Pipeline */}
        <SectionCard title={SECTION_TITLES.draftIntentPipeline} action={<ViewAllLink href={NAV_LINKS.tradeIntents} />}>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{tradeIntents.draftCount}</p>
              <p className="text-slate-400">Pending Action</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{tradeIntents.cancelledCount}</p>
              <p className="text-slate-400">Cancelled</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{tradeIntents.approvedCount}</p>
              <p className="text-slate-400">Approved</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{tradeIntents.rejectedCount}</p>
              <p className="text-slate-400">Rejected</p>
            </div>
          </div>
          <div className="space-y-2">
            {tradeIntents.recent.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_DRAFT_INTENTS}</p>}
            {tradeIntents.recent.map((intent) => (
              <div key={intent.id} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    {intent.symbol} · {intent.side}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 ${INTENT_STATUS_STYLE[intent.status] ?? "border-white/10 bg-white/5 text-slate-300"}`}>{intent.status}</span>
                </div>
                <p className="mt-1 text-slate-500">
                  {intent.quantity} · ${intent.notionalUsd.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          {tradeIntents.cancelledCount === 0 ? <p className="mt-2 text-xs text-slate-600">{EMPTY_NO_CANCELLED_DRAFTS}</p> : null}
        </SectionCard>

        {/* Section 6: Decision Summary */}
        <SectionCard title={SECTION_TITLES.decisionSummary} action={<ViewAllLink href={NAV_LINKS.tradeIntents} />}>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{decisions.approvedCount}</p>
              <p className="text-slate-400">Approved</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{decisions.rejectedCount}</p>
              <p className="text-slate-400">Rejected</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/10 py-2">
              <p className="text-lg font-semibold text-white">{decisions.approvalRate !== null ? `${(decisions.approvalRate * 100).toFixed(0)}%` : "—"}</p>
              <p className="text-slate-400">Approval Rate</p>
            </div>
          </div>
          <div className="space-y-2">
            {decisions.recent.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_DECISIONS}</p>}
            {decisions.recent.map((decision) => (
              <div key={decision.id} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${decision.verdict === "approved" ? "text-emerald-300" : "text-rose-300"}`}>{decision.verdict}</span>
                  <span className="text-slate-500">{fmtDate(decision.createdAt)}</span>
                </div>
                {decision.reason ? <p className="mt-1 text-slate-500">{decision.reason}</p> : null}
              </div>
            ))}
          </div>
          {decisions.rejectedCount > 0 ? <p className="mt-2 text-xs text-slate-500">{REJECTED_DECISIONS_NOTE}</p> : null}
        </SectionCard>
      </div>

      {/* Section 7: Open Paper Positions */}
      <SectionCard title={SECTION_TITLES.openPaperPositions} action={<ViewAllLink href={NAV_LINKS.positions} />}>
        <div className="space-y-2">
          {positions.recentOpen.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_OPEN_POSITIONS}</p>}
          {positions.recentOpen.map((position) => (
            <div key={position.id} className="rounded-xl border border-emerald-300/10 bg-black/10 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-white">{position.symbol}</span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-3 py-1 text-xs text-emerald-200">Open</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                <span>Quantity: {position.quantity}</span>
                <span>Entry price: ${position.entryPriceUsd.toFixed(2)}</span>
                <span>Current price: {position.currentPriceUsd !== null ? `$${position.currentPriceUsd.toFixed(2)}` : "Not available yet"}</span>
                <span>Entry notional: ${position.entryNotionalUsd.toFixed(2)}</span>
                <span>Current notional: {position.currentNotionalUsd !== null ? `$${position.currentNotionalUsd.toFixed(2)}` : "Not available yet"}</span>
                <span className={pnlClassName(position.unrealizedPnlUsd)}>Unrealized P&L: {fmtUsd(position.unrealizedPnlUsd)}</span>
                <span>Opened: {fmtDate(position.openedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Section 8: Performance Snapshot */}
      <SectionCard title={SECTION_TITLES.performanceSnapshot} action={<ViewAllLink href={NAV_LINKS.performance} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total P&L" value={fmtUsd(portfolio.totalPnlUsd)} valueClassName={pnlClassName(portfolio.totalPnlUsd)} />
          <StatCard label="Realized P&L" value={fmtUsd(portfolio.realizedPnlUsd)} valueClassName={pnlClassName(portfolio.realizedPnlUsd)} />
          <StatCard label="Unrealized P&L" value={fmtUsd(portfolio.unrealizedPnlUsd)} valueClassName={pnlClassName(portfolio.unrealizedPnlUsd)} />
          <StatCard label="Open Exposure" value={fmtUsd(portfolio.openExposureUsd)} />
          <StatCard label="Open Positions" value={`${portfolio.openPositionsCount}`} />
          <StatCard label="Closed Positions" value={`${portfolio.closedPositionsCount}`} />
        </div>
      </SectionCard>

      {/* Section 9: Recent Activity */}
      <SectionCard title={SECTION_TITLES.recentActivity}>
        <div className="space-y-2">
          {recentActivity.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_ACTIVITY}</p>}
          {recentActivity.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white">{event.summary}</span>
                <span className="text-xs text-slate-500">{fmtDate(event.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
