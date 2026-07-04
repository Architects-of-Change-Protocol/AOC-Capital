import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getAllocationExposureOverview } from "@/lib/capital/allocation-exposure-service";
import {
  CASH_DERIVED_NOTE,
  EMPTY_NO_BASE_CAPITAL,
  EMPTY_NO_NOTES,
  EMPTY_NO_OPEN_POSITIONS,
  EMPTY_NO_RISK_LIMIT,
  GOVERNANCE_BADGES,
  GOVERNANCE_NOTE,
  NAV_LINKS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  SECTION_TITLES,
} from "@/lib/capital/allocation-exposure-content";

const CONCENTRATION_STATUS_COPY: Record<string, { label: string; className: string }> = {
  no_data: { label: "No Data", className: "border-white/10 bg-white/5 text-slate-400" },
  diversified: { label: "Diversified", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  moderate_concentration: { label: "Moderate Concentration", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  high_concentration: { label: "High Concentration", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  single_symbol: { label: "Single Symbol", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

const EXPOSURE_POSTURE_COPY: Record<string, { label: string; className: string }> = {
  not_ready: { label: "Not Ready", className: "border-white/10 bg-white/5 text-slate-400" },
  idle: { label: "Idle", className: "border-white/10 bg-white/5 text-slate-400" },
  balanced: { label: "Balanced", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  watch_concentration: { label: "Watch Concentration", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  high_concentration: { label: "High Concentration", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  near_exposure_limit: { label: "Near Exposure Limit", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  over_exposure_limit: { label: "Over Exposure Limit", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

const NOTE_SEVERITY_STYLE: Record<string, string> = {
  info: "border-cyan-200/20 bg-cyan-300/[0.05]",
  watch: "border-amber-300/20 bg-amber-300/[0.05]",
  caution: "border-rose-300/20 bg-rose-300/[0.05]",
};

function fmtUsd(value: number | null): string {
  if (value === null) return "Not available yet";
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
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

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
      {label} →
    </Link>
  );
}

function ExposureBar({ weight, className }: { weight: number | null; className: string }) {
  const pct = weight === null ? 0 : Math.min(100, Math.max(0, weight * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function AllocationExposurePage() {
  const user = await requireAuthUser();
  const overview = await getAllocationExposureOverview(user.companyId);
  const { portfolio, allocation, symbols, positions, pnlContribution, governance, notes } = overview;

  const concentrationCopy = CONCENTRATION_STATUS_COPY[allocation.concentrationStatus];
  const postureCopy = EXPOSURE_POSTURE_COPY[allocation.exposurePosture];
  const investedPct = portfolio.exposureRatio !== null ? Math.min(100, Math.max(0, portfolio.exposureRatio * 100)) : null;

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
        <p className="mt-4 text-xs text-slate-500">{GOVERNANCE_NOTE}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href={NAV_LINKS.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            ← Back to Portfolio Overview
          </Link>
          <Link href={NAV_LINKS.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Open Paper Positions
          </Link>
          <Link href={NAV_LINKS.tradeIntents} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Review Trade Intents
          </Link>
          <Link href={NAV_LINKS.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Closed Performance
          </Link>
        </div>
      </div>

      {/* Section 1: Allocation Summary */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.allocationSummary}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Simulated Portfolio Value" value={fmtUsd(portfolio.simulatedPortfolioValueUsd)} sub={`Base capital ${fmtUsd(portfolio.baseCapitalUsd)}`} />
          <StatCard label="Open Exposure" value={fmtUsd(portfolio.openExposureUsd)} />
          <StatCard label="Available Simulated Cash" value={fmtUsd(portfolio.availableSimulatedCashUsd)} />
          <StatCard label="Exposure Ratio" value={fmtPct(portfolio.exposureRatio)} />
          <StatCard label="Open Positions" value={`${portfolio.openPositionsCount}`} />
          <StatCard label="Symbols" value={`${portfolio.openSymbolsCount}`} />
          <StatCard label="Largest Symbol Weight" value={fmtPct(allocation.largestSymbolWeight)} sub={allocation.largestSymbol ?? undefined} />
          <StatCard label="Unrealized P&L" value={fmtUsd(portfolio.unrealizedPnlUsd)} valueClassName={pnlClassName(portfolio.unrealizedPnlUsd)} />
        </div>
      </div>

      {/* Main grid: left = Exposure by Symbol / Position Contribution, right = Concentration / Cash / Notes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Section 2: Exposure by Symbol */}
          <SectionCard title={SECTION_TITLES.exposureBySymbol}>
            <div className="space-y-3">
              {symbols.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_OPEN_POSITIONS}</p>}
              {symbols.map((s) => (
                <div key={s.symbol} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">{s.symbol}</span>
                    <span className="text-xs text-slate-400">
                      {fmtUsd(s.currentNotionalUsd)} · {fmtPct(s.exposureWeight)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ExposureBar weight={s.exposureWeight} className="bg-cyan-300/70" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                    <span>Open positions: {s.openPositionsCount}</span>
                    <span className={pnlClassName(s.unrealizedPnlUsd)}>Unrealized P&L: {fmtUsd(s.unrealizedPnlUsd)}</span>
                    <span>Avg entry: {s.averageEntryPriceUsd !== null ? `$${s.averageEntryPriceUsd.toFixed(2)}` : "—"}</span>
                    <span>Current price: {s.currentPriceUsd !== null ? `$${s.currentPriceUsd.toFixed(2)}` : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 3: Position Contribution */}
          <SectionCard title={SECTION_TITLES.positionContribution} action={<ViewAllLink href={NAV_LINKS.positions} label="Open Paper Positions" />}>
            <div className="space-y-2">
              {positions.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_OPEN_POSITIONS}</p>}
              {positions.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/capital/positions/${p.id}`} className="font-medium text-white underline-offset-2 hover:text-cyan-100 hover:underline">
                      {p.symbol}
                    </Link>
                    <span className={`font-medium ${pnlClassName(p.unrealizedPnlUsd)}`}>
                      {fmtUsd(p.unrealizedPnlUsd)} {p.unrealizedPnlPct !== null ? `(${(p.unrealizedPnlPct * 100).toFixed(2)}%)` : ""}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                    <span>Quantity: {p.quantity}</span>
                    <span>Entry: ${p.entryPriceUsd.toFixed(2)}</span>
                    <span>Current: {p.currentPriceUsd !== null ? `$${p.currentPriceUsd.toFixed(2)}` : "Not available yet"}</span>
                    <span>Weight: {fmtPct(p.exposureWeight)}</span>
                    <span>Opened: {fmtDate(p.openedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 7: Allocation Table */}
          <SectionCard title={SECTION_TITLES.allocationTable}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="text-slate-400">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Symbol</th>
                    <th className="py-2 pr-4">Exposure</th>
                    <th className="py-2 pr-4">Weight</th>
                    <th className="py-2 pr-4">Quantity</th>
                    <th className="py-2 pr-4">Avg Entry</th>
                    <th className="py-2 pr-4">Current Price</th>
                    <th className="py-2 pr-4">Unrealized P&L</th>
                    <th className="py-2 pr-4">Positions</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-3 text-slate-500">
                        {EMPTY_NO_OPEN_POSITIONS}
                      </td>
                    </tr>
                  )}
                  {symbols.map((s) => (
                    <tr key={s.symbol} className="border-b border-white/5 text-slate-300">
                      <td className="py-2 pr-4 font-medium text-white">{s.symbol}</td>
                      <td className="py-2 pr-4">{fmtUsd(s.currentNotionalUsd)}</td>
                      <td className="py-2 pr-4">{fmtPct(s.exposureWeight)}</td>
                      <td className="py-2 pr-4">{s.totalQuantity}</td>
                      <td className="py-2 pr-4">{s.averageEntryPriceUsd !== null ? `$${s.averageEntryPriceUsd.toFixed(2)}` : "—"}</td>
                      <td className="py-2 pr-4">{s.currentPriceUsd !== null ? `$${s.currentPriceUsd.toFixed(2)}` : "—"}</td>
                      <td className={`py-2 pr-4 ${pnlClassName(s.unrealizedPnlUsd)}`}>{fmtUsd(s.unrealizedPnlUsd)}</td>
                      <td className="py-2 pr-4">{s.openPositionsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          {/* Section 4: Concentration & Risk Proximity */}
          <SectionCard title={SECTION_TITLES.concentrationRiskProximity}>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${concentrationCopy.className}`}>{concentrationCopy.label}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${postureCopy.className}`}>{postureCopy.label}</span>
              </div>
              <p className="text-xs text-slate-400">Dashboard exposure posture — not a compliance certification.</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <span>Largest symbol: {allocation.largestSymbol ?? "—"}</span>
                <span>Largest weight: {fmtPct(allocation.largestSymbolWeight)}</span>
                <span>Top 3 concentration: {fmtPct(allocation.topThreeConcentration)}</span>
                <span>Open symbols: {portfolio.openSymbolsCount}</span>
                <span>Exposure ratio: {fmtPct(portfolio.exposureRatio)}</span>
                <span>
                  Exposure limit usage:{" "}
                  {governance.riskLimitProximityAvailable && governance.exposureLimitUsage !== null ? fmtPct(governance.exposureLimitUsage) : EMPTY_NO_RISK_LIMIT}
                </span>
              </div>
              {governance.riskLimitProximityAvailable && governance.maxExposureRatio !== null ? (
                <p className="text-xs text-slate-500">Known Risk Constitution exposure ceiling: {fmtPct(governance.maxExposureRatio)}.</p>
              ) : (
                <p className="text-xs text-slate-500">{EMPTY_NO_RISK_LIMIT}</p>
              )}
            </div>
          </SectionCard>

          {/* Section 5: Cash vs Invested Simulation */}
          <SectionCard title={SECTION_TITLES.cashVsInvested}>
            {investedPct === null ? (
              <p className="text-sm text-slate-500">{EMPTY_NO_BASE_CAPITAL}</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="h-3 w-full overflow-hidden rounded-full bg-black/20">
                  <div className="h-full rounded-full bg-cyan-300/70" style={{ width: `${investedPct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>Invested: {fmtUsd(portfolio.openExposureUsd)}</span>
                  <span>Unallocated: {fmtUsd(portfolio.availableSimulatedCashUsd)}</span>
                  <span className={pnlClassName(portfolio.realizedPnlUsd)}>Realized P&L: {fmtUsd(portfolio.realizedPnlUsd)}</span>
                  <span className={pnlClassName(portfolio.unrealizedPnlUsd)}>Unrealized P&L: {fmtUsd(portfolio.unrealizedPnlUsd)}</span>
                </div>
                <p className="text-xs text-slate-500">{CASH_DERIVED_NOTE}</p>
              </div>
            )}
          </SectionCard>

          {/* Section 6: P&L Contribution */}
          <SectionCard title={SECTION_TITLES.pnlContribution}>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">Top Gainers</p>
                {pnlContribution.topGainers.length === 0 && <p className="text-xs text-slate-500">No unrealized gains yet.</p>}
                {pnlContribution.topGainers.map((g) => (
                  <div key={g.symbol} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium text-white">{g.symbol}</span>
                    <span className="text-emerald-300">{fmtUsd(g.unrealizedPnlUsd)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">Top Losers</p>
                {pnlContribution.topLosers.length === 0 && <p className="text-xs text-slate-500">No unrealized losses yet.</p>}
                {pnlContribution.topLosers.map((l) => (
                  <div key={l.symbol} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium text-white">{l.symbol}</span>
                    <span className="text-rose-300">{fmtUsd(l.unrealizedPnlUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Section 8: Exposure Notes */}
          <SectionCard title={SECTION_TITLES.exposureNotes}>
            <div className="space-y-2">
              {notes.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_NOTES}</p>}
              {notes.map((note, index) => (
                <div key={index} className={`rounded-xl border px-3 py-2 text-xs text-slate-200 ${NOTE_SEVERITY_STYLE[note.severity]}`}>
                  {note.message}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
