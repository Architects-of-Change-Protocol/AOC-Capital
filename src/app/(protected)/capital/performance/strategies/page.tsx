import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getStrategyPerformanceAttribution } from "@/lib/capital/strategy-performance-attribution-service";
import {
  EMPTY_NOT_AVAILABLE,
  EMPTY_NO_ATTRIBUTED_STRATEGIES,
  GOVERNANCE_BADGES,
  GOVERNANCE_COMPLETENESS_NOTE,
  HEADER_NOTE,
  LIFECYCLE_FUNNEL_NOTE,
  LINK_COPY,
  METHODOLOGY_NOTES,
  NAV_LINKS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  READ_ONLY_NOTE,
  SECTION_TITLES,
  SIMULATED_OUTCOME_NOTE,
  UNLINKED_RECORDS_NOTE,
} from "@/lib/capital/strategy-performance-attribution-content";

const SOURCE_CHAIN_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  unlinked: { label: "Unlinked", className: "border-white/10 bg-white/5 text-slate-400" },
};

const GOVERNANCE_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  partial: { label: "Partial", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  missing: { label: "Missing", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_applicable: { label: "Not Applicable", className: "border-white/10 bg-white/5 text-slate-400" },
};

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${(value * 100).toFixed(2)}%`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function fmtCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${value}`;
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

function pnlClassName(value: number | null | undefined): string {
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

export default async function StrategyPerformanceAttributionPage() {
  const user = await requireAuthUser();
  const report = await getStrategyPerformanceAttribution(user.companyId);
  const { portfolio, generatedAt, summary, strategyRows, unlinkedRecords, governance } = report;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Section 1: Attribution Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.attributionHeader}</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">{PAGE_TITLE}</h1>
        <h2 className="mt-1 text-sm text-slate-300">{PAGE_SUBTITLE}</h2>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
          <span>
            Portfolio: {portfolio.name} ({shortId(portfolio.id)})
          </span>
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
          <Link href={NAV_LINKS.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Closed Performance
          </Link>
          <Link href={NAV_LINKS.strategies} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Library
          </Link>
        </div>
      </div>

      {strategyRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{EMPTY_NO_ATTRIBUTED_STRATEGIES}</div>
      ) : null}

      {/* Section 2: Strategy Attribution Summary */}
      <SectionCard title={SECTION_TITLES.attributionSummary}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Attributable Strategies" value={fmtCount(summary.attributableStrategyCount)} />
          <StatCard label="Total Signals Attributed" value={fmtCount(summary.totalSignals)} />
          <StatCard label="Total Drafts Attributed" value={fmtCount(summary.totalDrafts)} />
          <StatCard label="Total Reviews Attributed" value={fmtCount(summary.totalSubmittedReviews)} />
          <StatCard label="Total Approved Reviews" value={fmtCount(summary.totalApprovedReviews)} valueClassName="text-emerald-300" />
          <StatCard label="Total Rejected Reviews" value={fmtCount(summary.totalRejectedReviews)} valueClassName="text-rose-300" />
          <StatCard label="Total Open Positions" value={fmtCount(summary.totalOpenPositions)} />
          <StatCard label="Total Closed Positions" value={fmtCount(summary.totalClosedPositions)} />
          <StatCard label="Total Realized Simulated P&L" value={fmtUsd(summary.totalRealizedPnlUsd)} valueClassName={pnlClassName(summary.totalRealizedPnlUsd)} />
          <StatCard label="Total Unrealized Simulated P&L" value={fmtUsd(summary.totalUnrealizedPnlUsd)} valueClassName={pnlClassName(summary.totalUnrealizedPnlUsd)} />
          <StatCard label="Total Simulated P&L" value={fmtUsd(summary.totalSimulatedPnlUsd)} valueClassName={pnlClassName(summary.totalSimulatedPnlUsd)} />
          <StatCard label="Unlinked / Historical Records" value={fmtCount(summary.unlinkedRecordCount + summary.historicalRecordCount)} />
          <StatCard
            label="Governance Completeness"
            value={summary.overallGovernanceCompletenessPct !== null ? fmtPct(summary.overallGovernanceCompletenessPct) : EMPTY_NOT_AVAILABLE}
          />
        </div>
      </SectionCard>

      {/* Section 3: Lifecycle Funnel by Strategy */}
      <SectionCard title={SECTION_TITLES.lifecycleFunnel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Signals</th>
                <th className="py-2 pr-4">Eligible</th>
                <th className="py-2 pr-4">Converted</th>
                <th className="py-2 pr-4">Drafts</th>
                <th className="py-2 pr-4">Cancelled</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Rejected</th>
                <th className="py-2 pr-4">Opened</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Signal→Draft</th>
                <th className="py-2 pr-4">Draft Sub. Rate</th>
                <th className="py-2 pr-4">Approval Rate</th>
                <th className="py-2 pr-4">Close Rate</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={16} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const f = row.lifecycleFunnel;
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4">{f.signalCount}</td>
                    <td className="py-2 pr-4">{f.eligibleSignalCount}</td>
                    <td className="py-2 pr-4">{f.convertedSignalCount}</td>
                    <td className="py-2 pr-4">{f.draftCount}</td>
                    <td className="py-2 pr-4">{f.cancelledDraftCount}</td>
                    <td className="py-2 pr-4">{f.submittedDraftCount}</td>
                    <td className="py-2 pr-4">{f.approvedReviewCount}</td>
                    <td className="py-2 pr-4">{f.rejectedReviewCount}</td>
                    <td className="py-2 pr-4">{f.openedPositionCount}</td>
                    <td className="py-2 pr-4">{f.openPositionCount}</td>
                    <td className="py-2 pr-4">{f.closedPositionCount}</td>
                    <td className="py-2 pr-4">{fmtPct(f.signalToDraftRate)}</td>
                    <td className="py-2 pr-4">{fmtPct(f.draftSubmissionRate)}</td>
                    <td className="py-2 pr-4">{fmtPct(f.reviewApprovalRate)}</td>
                    <td className="py-2 pr-4">{fmtPct(f.positionCloseRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{LIFECYCLE_FUNNEL_NOTE}</p>
      </SectionCard>

      {/* Section 4: Realized P&L by Strategy */}
      <SectionCard title={SECTION_TITLES.realizedPnl}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Total Realized P&L</th>
                <th className="py-2 pr-4">Weighted Return</th>
                <th className="py-2 pr-4">Avg Realized P&L</th>
                <th className="py-2 pr-4">Avg Realized Return</th>
                <th className="py-2 pr-4">Best Closed</th>
                <th className="py-2 pr-4">Worst Closed</th>
                <th className="py-2 pr-4">Latest Closed</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const r = row.realizedPerformance;
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4">{r.closedPositionsCount}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(r.totalRealizedPnlUsd)}`}>{fmtUsd(r.totalRealizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(r.weightedRealizedReturnPct)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(r.averageRealizedPnlUsd)}`}>{fmtUsd(r.averageRealizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(r.averageRealizedReturnPct)}</td>
                    <td className="py-2 pr-4">{r.bestClosedPosition ? `${r.bestClosedPosition.symbol} ${fmtUsd(r.bestClosedPosition.realizedPnlUsd)}` : EMPTY_NOT_AVAILABLE}</td>
                    <td className="py-2 pr-4">{r.worstClosedPosition ? `${r.worstClosedPosition.symbol} ${fmtUsd(r.worstClosedPosition.realizedPnlUsd)}` : EMPTY_NOT_AVAILABLE}</td>
                    <td className="py-2 pr-4">{r.latestClosedPosition ? fmtDate(r.latestClosedPosition.closedAt) : EMPTY_NOT_AVAILABLE}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 5: Unrealized P&L / Open Exposure by Strategy */}
      <SectionCard title={SECTION_TITLES.unrealizedPnl}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Entry Notional</th>
                <th className="py-2 pr-4">Current Notional</th>
                <th className="py-2 pr-4">Unrealized P&L</th>
                <th className="py-2 pr-4">Unrealized Return</th>
                <th className="py-2 pr-4">Exposure Share</th>
                <th className="py-2 pr-4">Symbols</th>
                <th className="py-2 pr-4">Valuation</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const u = row.unrealizedPerformance;
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4">{u.openPositionCount}</td>
                    <td className="py-2 pr-4">{fmtUsd(u.totalEntryNotionalOpenUsd)}</td>
                    <td className="py-2 pr-4">{fmtUsd(u.totalCurrentNotionalOpenUsd)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(u.unrealizedPnlUsd)}`}>{fmtUsd(u.unrealizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(u.unrealizedReturnPct)}</td>
                    <td className="py-2 pr-4">{fmtPct(u.exposureShareOfPortfolio)}</td>
                    <td className="py-2 pr-4">{u.symbols.join(", ") || "—"}</td>
                    <td className="py-2 pr-4">{u.valuationAvailabilityStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 6: Strategy Win / Loss / Flat Summary */}
      <SectionCard title={SECTION_TITLES.winLossFlat}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Winners</th>
                <th className="py-2 pr-4">Losers</th>
                <th className="py-2 pr-4">Flat</th>
                <th className="py-2 pr-4">Unknown</th>
                <th className="py-2 pr-4">Win Rate</th>
                <th className="py-2 pr-4">Avg Winner P&L</th>
                <th className="py-2 pr-4">Avg Loser P&L</th>
                <th className="py-2 pr-4">Payoff Ratio</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const w = row.winLoss;
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4 text-emerald-300">{w.winners}</td>
                    <td className="py-2 pr-4 text-rose-300">{w.losers}</td>
                    <td className="py-2 pr-4">{w.flat}</td>
                    <td className="py-2 pr-4">{w.unknown}</td>
                    <td className="py-2 pr-4">{fmtPct(w.winRate)}</td>
                    <td className="py-2 pr-4 text-emerald-300">{fmtUsd(w.averageWinnerPnlUsd)}</td>
                    <td className="py-2 pr-4 text-rose-300">{fmtUsd(w.averageLoserPnlUsd)}</td>
                    <td className="py-2 pr-4">{w.payoffRatio !== null ? w.payoffRatio.toFixed(2) : EMPTY_NOT_AVAILABLE}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{SIMULATED_OUTCOME_NOTE}</p>
      </SectionCard>

      {/* Section 7: Governance & Source-Chain Completeness */}
      <SectionCard title={SECTION_TITLES.governanceCompleteness}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Source Chain</th>
                <th className="py-2 pr-4">Close Governance</th>
                <th className="py-2 pr-4">Historical Records</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const sourceCopy = SOURCE_CHAIN_STATUS_COPY[row.governance.sourceChainStatus];
                const governanceCopy = GOVERNANCE_STATUS_COPY[row.governance.closeGovernanceCompletenessStatus];
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceCopy.className}`}>{sourceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">{row.governance.historicalRecordCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{GOVERNANCE_COMPLETENESS_NOTE}</p>
      </SectionCard>

      {/* Section 8: Strategy Attribution Table */}
      <SectionCard title={SECTION_TITLES.attributionTable}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Source Type</th>
                <th className="py-2 pr-4">Latest Activity</th>
                <th className="py-2 pr-4">Total Simulated P&L</th>
                <th className="py-2 pr-4">Win Rate</th>
                <th className="py-2 pr-4">Governance</th>
                <th className="py-2 pr-4">Links</th>
              </tr>
            </thead>
            <tbody>
              {strategyRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-slate-500">
                    {EMPTY_NO_ATTRIBUTED_STRATEGIES}
                  </td>
                </tr>
              )}
              {strategyRows.map((row) => {
                const totalSimulatedPnlUsd = row.realizedPerformance.totalRealizedPnlUsd + row.unrealizedPerformance.unrealizedPnlUsd;
                const governanceCopy = GOVERNANCE_STATUS_COPY[row.governance.closeGovernanceCompletenessStatus];
                return (
                  <tr key={row.strategyKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.strategyName}</td>
                    <td className="py-2 pr-4">{row.sourceType === "signal_strategy" ? "Signal Strategy" : "Unlinked"}</td>
                    <td className="py-2 pr-4">{fmtDate(row.latestActivityAt)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(totalSimulatedPnlUsd)}`}>{fmtUsd(totalSimulatedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(row.winLoss.winRate)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {row.detailHrefs.strategyLibrary ? (
                          <Link href={row.detailHrefs.strategyLibrary} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                            {LINK_COPY.viewStrategy}
                          </Link>
                        ) : null}
                        <Link href={row.detailHrefs.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                          {LINK_COPY.viewPositions}
                        </Link>
                        <Link href={row.detailHrefs.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                          {LINK_COPY.viewClosedPerformance}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 9: Unlinked / Historical Records */}
      <SectionCard title={SECTION_TITLES.unlinkedHistorical}>
        <p className="mb-3 text-xs text-slate-500">{UNLINKED_RECORDS_NOTE}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Record Type</th>
                <th className="py-2 pr-4">Count</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Readable</th>
                <th className="py-2 pr-4">Link</th>
              </tr>
            </thead>
            <tbody>
              {unlinkedRecords.map((row) => (
                <tr key={row.recordType} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{row.recordType.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4">{row.count}</td>
                  <td className="py-2 pr-4">{row.reason}</td>
                  <td className="py-2 pr-4">{row.readable ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">
                    {row.href ? (
                      <Link href={row.href} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                        {LINK_COPY.viewDetail}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 10: Methodology & Safety Notes */}
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
          <li>• Investment advice provided: {governance.investmentAdviceProvided ? "yes" : "no"}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{READ_ONLY_NOTE}</p>
      </SectionCard>

      {/* Section 11: Related Links */}
      <SectionCard title={SECTION_TITLES.relatedLinks}>
        <div className="flex flex-col gap-2 text-xs">
          <Link href={NAV_LINKS.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Portfolio Overview
          </Link>
          <Link href={NAV_LINKS.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Allocation & Exposure
          </Link>
          <Link href={NAV_LINKS.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Closed Performance
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
          <Link href={NAV_LINKS.signalCohorts} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Signal Cohorts
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
