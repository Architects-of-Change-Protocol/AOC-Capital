import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getClosedPositionPerformance } from "@/lib/capital/closed-position-performance-service";
import {
  EMPTY_NOT_AVAILABLE,
  EMPTY_NO_CLOSED_POSITIONS,
  GOVERNANCE_BADGES,
  GOVERNANCE_EVIDENCE_COMPLETE_NOTE,
  GOVERNANCE_EVIDENCE_MISSING_NOTE,
  HEADER_NOTE,
  LINK_COPY,
  METHODOLOGY_NOTES,
  NAV_LINKS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  READ_ONLY_NOTE,
  SECTION_TITLES,
  SIMULATED_PERFORMANCE_NOTE,
  SOURCE_ATTRIBUTION_NOTE,
} from "@/lib/capital/closed-position-performance-content";

const OUTCOME_COPY: Record<string, { label: string; className: string }> = {
  winner: { label: "Winner", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  loser: { label: "Loser", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  flat: { label: "Flat", className: "border-white/10 bg-white/5 text-slate-300" },
  unknown: { label: "Unknown", className: "border-white/10 bg-white/5 text-slate-400" },
};

const GOVERNANCE_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  partial: { label: "Partial", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  missing: { label: "Missing", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_applicable: { label: "Not Applicable", className: "border-white/10 bg-white/5 text-slate-400" },
};

const SOURCE_CHAIN_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  partial: { label: "Partial", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  unlinked: { label: "Unlinked", className: "border-white/10 bg-white/5 text-slate-400" },
};

function fmtUsd(value: number | null): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${(value * 100).toFixed(2)}%`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function fmtDays(value: number | null): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${value.toFixed(1)}d`;
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

function pnlClassName(value: number | null): string {
  if (value === null || value === undefined) return "text-slate-300";
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

export default async function ClosedPositionPerformancePage() {
  const user = await requireAuthUser();
  const report = await getClosedPositionPerformance(user.companyId);
  const { portfolio, generatedAt, summary, realizedVsUnrealized, winLoss, bySymbol, bySource, rows, governanceEvidence, governance } = report;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Section 1: Performance Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.performanceHeader}</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">{PAGE_TITLE}</h1>
        <h2 className="mt-1 text-sm text-slate-300">{PAGE_SUBTITLE}</h2>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
          <span>Portfolio: {portfolio.name} ({shortId(portfolio.id)})</span>
          <span>Report generated: {fmtDate(generatedAt)}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {GOVERNANCE_BADGES.map((badge) => (
            <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">{HEADER_NOTE}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href={NAV_LINKS.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            ← Back to Portfolio Overview
          </Link>
          <Link href={NAV_LINKS.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Allocation & Exposure
          </Link>
          <Link href={NAV_LINKS.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Paper Positions
          </Link>
        </div>
      </div>

      {summary.totalClosedPositions === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{EMPTY_NO_CLOSED_POSITIONS}</div>
      ) : null}

      {/* Section 2: Realized P&L Summary */}
      <SectionCard title={SECTION_TITLES.realizedPnlSummary}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Realized P&L" value={fmtUsd(summary.totalRealizedPnlUsd)} valueClassName={pnlClassName(summary.totalRealizedPnlUsd)} />
          <StatCard label="Total Realized P&L %" value={fmtPct(summary.totalRealizedPnlPct)} valueClassName={pnlClassName(summary.totalRealizedPnlPct)} />
          <StatCard label="Total Closed Positions" value={`${summary.totalClosedPositions}`} />
          <StatCard label="Total Entry Notional Closed" value={fmtUsd(summary.totalEntryNotionalClosedUsd)} />
          <StatCard label="Total Close Notional" value={fmtUsd(summary.totalCloseNotionalUsd)} />
          <StatCard label="Average Realized P&L" value={fmtUsd(summary.averageRealizedPnlUsd)} valueClassName={pnlClassName(summary.averageRealizedPnlUsd)} />
          <StatCard label="Average Realized Return" value={fmtPct(summary.averageRealizedReturnPct)} valueClassName={pnlClassName(summary.averageRealizedReturnPct)} />
          <StatCard
            label="Best Closed Position"
            value={summary.bestPosition ? fmtUsd(summary.bestPosition.realizedPnlUsd) : EMPTY_NOT_AVAILABLE}
            sub={summary.bestPosition?.symbol}
            valueClassName={pnlClassName(summary.bestPosition?.realizedPnlUsd ?? null)}
          />
          <StatCard
            label="Worst Closed Position"
            value={summary.worstPosition ? fmtUsd(summary.worstPosition.realizedPnlUsd) : EMPTY_NOT_AVAILABLE}
            sub={summary.worstPosition?.symbol}
            valueClassName={pnlClassName(summary.worstPosition?.realizedPnlUsd ?? null)}
          />
          <StatCard
            label="Latest Closed Position"
            value={summary.latestClosedPosition ? fmtDate(summary.latestClosedPosition.closedAt) : EMPTY_NOT_AVAILABLE}
            sub={summary.latestClosedPosition?.symbol}
          />
        </div>
      </SectionCard>

      {/* Section 3: Realized vs Unrealized Split */}
      <SectionCard title={SECTION_TITLES.realizedVsUnrealized}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Realized P&L (Closed)" value={fmtUsd(realizedVsUnrealized.realizedPnlUsd)} valueClassName={pnlClassName(realizedVsUnrealized.realizedPnlUsd)} />
          <StatCard label="Unrealized P&L (Open)" value={fmtUsd(realizedVsUnrealized.unrealizedPnlUsd)} valueClassName={pnlClassName(realizedVsUnrealized.unrealizedPnlUsd)} />
          <StatCard
            label="Total Simulated P&L"
            value={realizedVsUnrealized.totalPnlUsd !== null ? fmtUsd(realizedVsUnrealized.totalPnlUsd) : EMPTY_NOT_AVAILABLE}
            valueClassName={pnlClassName(realizedVsUnrealized.totalPnlUsd)}
          />
          <StatCard label="Open / Closed Positions" value={`${realizedVsUnrealized.openPositionsCount} / ${realizedVsUnrealized.closedPositionsCount}`} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{realizedVsUnrealized.note}</p>
      </SectionCard>

      {/* Section 4: Win / Loss / Flat Summary */}
      <SectionCard title={SECTION_TITLES.winLossFlat}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Winners" value={`${winLoss.winners}`} valueClassName="text-emerald-300" />
          <StatCard label="Losers" value={`${winLoss.losers}`} valueClassName="text-rose-300" />
          <StatCard label="Flat" value={`${winLoss.flat}`} />
          <StatCard label="Unknown" value={`${winLoss.unknown}`} />
          <StatCard label="Win Rate" value={fmtPct(winLoss.winRate)} />
          <StatCard label="Loss Rate" value={fmtPct(winLoss.lossRate)} />
          <StatCard label="Average Winner P&L" value={fmtUsd(winLoss.averageWinnerPnlUsd)} valueClassName="text-emerald-300" />
          <StatCard label="Average Loser P&L" value={fmtUsd(winLoss.averageLoserPnlUsd)} valueClassName="text-rose-300" />
          <StatCard label="Payoff Ratio" value={winLoss.payoffRatio !== null ? winLoss.payoffRatio.toFixed(2) : EMPTY_NOT_AVAILABLE} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{SIMULATED_PERFORMANCE_NOTE}</p>
      </SectionCard>

      {/* Section 5: Closed Performance by Symbol */}
      <SectionCard title={SECTION_TITLES.bySymbol}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">W / L / F / U</th>
                <th className="py-2 pr-4">Win Rate</th>
                <th className="py-2 pr-4">Total Realized P&L</th>
                <th className="py-2 pr-4">Avg Realized P&L</th>
                <th className="py-2 pr-4">Avg Realized Return</th>
                <th className="py-2 pr-4">Entry Notional</th>
                <th className="py-2 pr-4">Close Notional</th>
                <th className="py-2 pr-4">Latest Closed</th>
                <th className="py-2 pr-4">Governance</th>
              </tr>
            </thead>
            <tbody>
              {bySymbol.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-3 text-slate-500">
                    {EMPTY_NO_CLOSED_POSITIONS}
                  </td>
                </tr>
              )}
              {bySymbol.map((s) => {
                const governanceCopy = GOVERNANCE_STATUS_COPY[s.governanceCompleteness];
                return (
                  <tr key={s.symbol} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{s.symbol}</td>
                    <td className="py-2 pr-4">{s.closedPositionsCount}</td>
                    <td className="py-2 pr-4">
                      {s.winners} / {s.losers} / {s.flat} / {s.unknown}
                    </td>
                    <td className="py-2 pr-4">{fmtPct(s.winRate)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(s.totalRealizedPnlUsd)}`}>{fmtUsd(s.totalRealizedPnlUsd)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(s.averageRealizedPnlUsd)}`}>{fmtUsd(s.averageRealizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(s.averageRealizedReturnPct)}</td>
                    <td className="py-2 pr-4">{fmtUsd(s.totalEntryNotionalUsd)}</td>
                    <td className="py-2 pr-4">{fmtUsd(s.totalCloseNotionalUsd)}</td>
                    <td className="py-2 pr-4">{fmtDate(s.latestClosedAt)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 6: Closed Performance by Strategy / Source Chain */}
      <SectionCard title={SECTION_TITLES.bySource}>
        <p className="mb-3 text-xs text-slate-500">{SOURCE_ATTRIBUTION_NOTE}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy / Source</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Total Realized P&L</th>
                <th className="py-2 pr-4">Avg Realized Return</th>
                <th className="py-2 pr-4">Win Rate</th>
                <th className="py-2 pr-4">Symbols</th>
                <th className="py-2 pr-4">Latest Closed</th>
                <th className="py-2 pr-4">Traceability</th>
              </tr>
            </thead>
            <tbody>
              {bySource.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500">
                    {EMPTY_NO_CLOSED_POSITIONS}
                  </td>
                </tr>
              )}
              {bySource.map((s) => {
                const traceCopy = SOURCE_CHAIN_STATUS_COPY[s.traceabilityStatus];
                return (
                  <tr key={s.sourceStrategyId ?? "unlinked"} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{s.sourceStrategyName ?? "Unlinked / historical / source unavailable"}</td>
                    <td className="py-2 pr-4">{s.closedPositionsCount}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(s.totalRealizedPnlUsd)}`}>{fmtUsd(s.totalRealizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(s.averageRealizedReturnPct)}</td>
                    <td className="py-2 pr-4">{fmtPct(s.winRate)}</td>
                    <td className="py-2 pr-4">{s.symbols.join(", ")}</td>
                    <td className="py-2 pr-4">{fmtDate(s.latestClosedAt)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${traceCopy.className}`}>{traceCopy.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 7: Closed Position History */}
      <SectionCard title={SECTION_TITLES.closedPositionHistory}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Closed At</th>
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Entry Price</th>
                <th className="py-2 pr-4">Close Price</th>
                <th className="py-2 pr-4">Entry Notional</th>
                <th className="py-2 pr-4">Close Notional</th>
                <th className="py-2 pr-4">Realized P&L</th>
                <th className="py-2 pr-4">Realized %</th>
                <th className="py-2 pr-4">Holding Period</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 pr-4">Governance</th>
                <th className="py-2 pr-4">Source Chain</th>
                <th className="py-2 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-3 text-slate-500">
                    {EMPTY_NO_CLOSED_POSITIONS}
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const outcomeCopy = OUTCOME_COPY[row.outcome];
                const governanceCopy = GOVERNANCE_STATUS_COPY[row.governanceEvidenceStatus];
                const sourceCopy = SOURCE_CHAIN_STATUS_COPY[row.sourceChainStatus];
                return (
                  <tr key={row.id} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4">{fmtDate(row.closedAt)}</td>
                    <td className="py-2 pr-4 font-medium text-white">{row.symbol}</td>
                    <td className="py-2 pr-4">{row.quantity}</td>
                    <td className="py-2 pr-4">{fmtUsd(row.entryPriceUsd)}</td>
                    <td className="py-2 pr-4">{fmtUsd(row.closePriceUsd)}</td>
                    <td className="py-2 pr-4">{fmtUsd(row.entryNotionalUsd)}</td>
                    <td className="py-2 pr-4">{fmtUsd(row.closeNotionalUsd)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(row.realizedPnlUsd)}`}>{fmtUsd(row.realizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(row.realizedPnlPct)}</td>
                    <td className="py-2 pr-4">{fmtDays(row.holdingPeriodDays)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${outcomeCopy.className}`}>{outcomeCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceCopy.className}`}>{sourceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link href={row.detailHref} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                        {LINK_COPY.viewDetail}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 8: Governance Evidence */}
      <SectionCard title={SECTION_TITLES.governanceEvidence}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Closed Positions" value={`${governanceEvidence.totalClosedPositions}`} />
          <StatCard label="Governed Close Review Count" value={`${governanceEvidence.governedCloseReviewCount}`} />
          <StatCard label="With close_review_id" value={`${governanceEvidence.positionsWithCloseReviewId}`} />
          <StatCard label="With Approval Audit" value={`${governanceEvidence.positionsWithApprovedCloseReviewAudit}`} />
          <StatCard label="With Closed Audit" value={`${governanceEvidence.positionsWithClosedAudit}`} />
          <StatCard label="Complete Evidence" value={`${governanceEvidence.positionsWithCompleteEvidence}`} />
          <StatCard label="Missing Governed Evidence" value={`${governanceEvidence.positionsMissingGovernedEvidence}`} />
          <StatCard label="Historical / Legacy-Shaped" value={`${governanceEvidence.historicalLegacyShapedCount}`} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{GOVERNANCE_EVIDENCE_COMPLETE_NOTE}</p>
        {governanceEvidence.positionsMissingGovernedEvidence > 0 ? <p className="mt-1 text-xs text-slate-500">{GOVERNANCE_EVIDENCE_MISSING_NOTE}</p> : null}
      </SectionCard>

      {/* Section 9: Methodology & Safety Notes */}
      <SectionCard title={SECTION_TITLES.methodologySafety}>
        <ul className="space-y-1 text-xs text-slate-400">
          {METHODOLOGY_NOTES.map((note) => (
            <li key={note}>• {note}</li>
          ))}
          <li>• Paper-only: {governance.paperOnly ? "yes" : "no"}</li>
          <li>• Read-only: {governance.readOnly ? "yes" : "no"}</li>
          <li>• Real execution locked: {governance.realExecutionLocked ? "yes" : "no"}</li>
          <li>• Broker connected: {governance.brokerConnected ? "yes" : "no"}</li>
          <li>• Live order routing enabled: {governance.liveOrderRoutingEnabled ? "yes" : "no"}</li>
          <li>• Market data fetched on this page: {governance.marketDataFetched ? "yes" : "no"}</li>
          <li>• Mutations performed by this page: {governance.mutationsPerformed ? "yes" : "no"}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{READ_ONLY_NOTE}</p>
      </SectionCard>

      {/* Section 10: Related Links */}
      <SectionCard title={SECTION_TITLES.relatedLinks}>
        <div className="flex flex-col gap-2 text-xs">
          <Link href={NAV_LINKS.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Portfolio Overview
          </Link>
          <Link href={NAV_LINKS.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Allocation & Exposure
          </Link>
          <Link href={NAV_LINKS.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Paper Positions
          </Link>
          <Link href={NAV_LINKS.signals} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Signals
          </Link>
          <Link href={NAV_LINKS.tradeIntents} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Trade Intents
          </Link>
          <Link href={NAV_LINKS.strategies} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Library
          </Link>
          <Link href={NAV_LINKS.performance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Performance Review
          </Link>
          <Link href={NAV_LINKS.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Attribution
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
