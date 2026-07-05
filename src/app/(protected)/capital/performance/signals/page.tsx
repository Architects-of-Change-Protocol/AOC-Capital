import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getSignalCohortOutcomes } from "@/lib/capital/signal-cohort-outcome-service";
import {
  EMPTY_NOT_AVAILABLE,
  EMPTY_NO_SIGNAL_COHORTS,
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
  UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE,
} from "@/lib/capital/signal-cohort-outcome-content";

const SOURCE_CHAIN_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  partial: { label: "Partial", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  historical: { label: "Historical", className: "border-white/10 bg-white/5 text-slate-300" },
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

function fmtDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${value.toFixed(1)}d`;
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

export default async function SignalCohortOutcomesPage() {
  const user = await requireAuthUser();
  const report = await getSignalCohortOutcomes(user.companyId);
  const { portfolio, generatedAt, summary, lifecycleFunnel, cohortRows, incompleteOutcomeRows, governance } = report;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Section 1: Signal Cohort Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.cohortHeader}</p>
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
          <Link href={NAV_LINKS.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Attribution
          </Link>
          <Link href={NAV_LINKS.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Closed Performance
          </Link>
        </div>
      </div>

      {cohortRows.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{EMPTY_NO_SIGNAL_COHORTS}</div> : null}

      {/* Section 2: Signal Outcome Summary */}
      <SectionCard title={SECTION_TITLES.outcomeSummary}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Signals" value={fmtCount(summary.totalSignals)} />
          <StatCard label="Eligible Signal Candidates" value={fmtCount(summary.eligibleSignals)} />
          <StatCard label="Signals Converted to Drafts" value={fmtCount(summary.convertedSignals)} />
          <StatCard label="Signals Not Converted" value={fmtCount(summary.notConvertedSignals)} />
          <StatCard label="Drafts Cancelled" value={fmtCount(summary.cancelledDrafts)} />
          <StatCard label="Drafts Submitted for Review" value={fmtCount(summary.submittedReviews)} />
          <StatCard label="Reviews Approved" value={fmtCount(summary.approvedReviews)} valueClassName="text-emerald-300" />
          <StatCard label="Reviews Rejected" value={fmtCount(summary.rejectedReviews)} valueClassName="text-rose-300" />
          <StatCard label="Paper Positions Opened" value={fmtCount(summary.openedPositions)} />
          <StatCard label="Open Positions from Signals" value={fmtCount(summary.openPositions)} />
          <StatCard label="Closed Positions from Signals" value={fmtCount(summary.closedPositions)} />
          <StatCard label="Total Realized Simulated P&L" value={fmtUsd(summary.totalRealizedPnlUsd)} valueClassName={pnlClassName(summary.totalRealizedPnlUsd)} />
          <StatCard label="Total Unrealized Simulated P&L" value={fmtUsd(summary.totalUnrealizedPnlUsd)} valueClassName={pnlClassName(summary.totalUnrealizedPnlUsd)} />
          <StatCard label="Total Simulated P&L" value={fmtUsd(summary.totalSimulatedPnlUsd)} valueClassName={pnlClassName(summary.totalSimulatedPnlUsd)} />
          <StatCard label="Unlinked / Incomplete Signal Chains" value={fmtCount(summary.incompleteOutcomeCount)} />
          <StatCard
            label="Source-Chain Completeness"
            value={summary.overallSourceChainCompletenessPct !== null ? fmtPct(summary.overallSourceChainCompletenessPct) : EMPTY_NOT_AVAILABLE}
          />
        </div>
      </SectionCard>

      {/* Section 3: Signal Lifecycle Funnel */}
      <SectionCard title={SECTION_TITLES.lifecycleFunnel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Generated</th>
                <th className="py-2 pr-4">Eligible</th>
                <th className="py-2 pr-4">Converted</th>
                <th className="py-2 pr-4">Cancelled</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Rejected</th>
                <th className="py-2 pr-4">Opened</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Realized Available</th>
                <th className="py-2 pr-4">Unrealized Available</th>
                <th className="py-2 pr-4">Complete Chain</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 text-slate-300">
                <td className="py-2 pr-4 font-medium text-white">{lifecycleFunnel.signalCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.eligibleSignalCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.convertedSignalCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.cancelledDraftCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.submittedReviewCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.approvedReviewCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.rejectedReviewCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.openedPositionCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.openPositionCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.closedPositionCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.realizedOutcomeAvailableCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.unrealizedOutcomeAvailableCount}</td>
                <td className="py-2 pr-4">{lifecycleFunnel.completeSourceChainCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Eligibility Rate" value={fmtPct(lifecycleFunnel.eligibilityRate)} />
          <StatCard label="Signal → Draft Rate" value={fmtPct(lifecycleFunnel.signalToDraftRate)} />
          <StatCard label="Draft Submission Rate" value={fmtPct(lifecycleFunnel.draftSubmissionRate)} />
          <StatCard label="Review Approval Rate" value={fmtPct(lifecycleFunnel.reviewApprovalRate)} />
          <StatCard label="Approval → Position Rate" value={fmtPct(lifecycleFunnel.approvalToPositionRate)} />
          <StatCard label="Position Close Rate" value={fmtPct(lifecycleFunnel.positionCloseRate)} />
          <StatCard label="Realized Outcome Availability" value={fmtPct(lifecycleFunnel.realizedOutcomeAvailabilityRate)} />
          <StatCard label="Source-Chain Completeness" value={fmtPct(lifecycleFunnel.sourceChainCompletenessRate)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{LIFECYCLE_FUNNEL_NOTE}</p>
      </SectionCard>

      {/* Section 4: Cohort Conversion Rates */}
      <SectionCard title={SECTION_TITLES.cohortConversionRates}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Eligible</th>
                <th className="py-2 pr-4">Converted</th>
                <th className="py-2 pr-4">Not Converted</th>
                <th className="py-2 pr-4">Conversion Rate</th>
                <th className="py-2 pr-4">Cancelled</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Submission Rate</th>
                <th className="py-2 pr-4">Source Chain</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => {
                const sourceCopy = SOURCE_CHAIN_STATUS_COPY[row.sourceChainCompletenessStatus];
                return (
                  <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                    <td className="py-2 pr-4">{row.totalSignals}</td>
                    <td className="py-2 pr-4">{row.eligibleSignals}</td>
                    <td className="py-2 pr-4">{row.convertedSignals}</td>
                    <td className="py-2 pr-4">{row.notConvertedSignals}</td>
                    <td className="py-2 pr-4">{fmtPct(row.conversionRate)}</td>
                    <td className="py-2 pr-4">{row.cancelledDrafts}</td>
                    <td className="py-2 pr-4">{row.submittedReviews}</td>
                    <td className="py-2 pr-4">{fmtPct(row.submissionRate)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceCopy.className}`}>{sourceCopy.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 5: Risk Review Outcomes by Signal Cohort */}
      <SectionCard title={SECTION_TITLES.riskReviewOutcomes}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Rejected</th>
                <th className="py-2 pr-4">Approval Rate</th>
                <th className="py-2 pr-4">Rejection Rate</th>
                <th className="py-2 pr-4">Most Common Rejection Reason</th>
                <th className="py-2 pr-4">Latest Review</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => (
                <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                  <td className="py-2 pr-4">{row.submittedReviews}</td>
                  <td className="py-2 pr-4 text-emerald-300">{row.approvedReviews}</td>
                  <td className="py-2 pr-4 text-rose-300">{row.rejectedReviews}</td>
                  <td className="py-2 pr-4">{fmtPct(row.reviewApprovalRate)}</td>
                  <td className="py-2 pr-4">{fmtPct(row.reviewRejectionRate)}</td>
                  <td className="py-2 pr-4">{row.mostCommonRejectionReason ?? EMPTY_NOT_AVAILABLE}</td>
                  <td className="py-2 pr-4">{row.latestActivityAt ? fmtDate(row.latestActivityAt) : EMPTY_NOT_AVAILABLE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 6: Position Outcomes by Signal Cohort */}
      <SectionCard title={SECTION_TITLES.positionOutcomes}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Opened</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Close Rate</th>
                <th className="py-2 pr-4">Avg Holding Period</th>
                <th className="py-2 pr-4">Symbols</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => (
                <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                  <td className="py-2 pr-4">{row.openedPositionCount}</td>
                  <td className="py-2 pr-4">{row.openPositionCount}</td>
                  <td className="py-2 pr-4">{row.closedPositionCount}</td>
                  <td className="py-2 pr-4">{fmtPct(row.closeRate)}</td>
                  <td className="py-2 pr-4">{fmtDays(row.averageHoldingPeriodDays)}</td>
                  <td className="py-2 pr-4">{row.symbols.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 7: Realized P&L by Signal Cohort */}
      <SectionCard title={SECTION_TITLES.realizedPnl}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Total Realized P&L</th>
                <th className="py-2 pr-4">Weighted Return</th>
                <th className="py-2 pr-4">Avg Realized Return</th>
                <th className="py-2 pr-4">Best Closed</th>
                <th className="py-2 pr-4">Worst Closed</th>
                <th className="py-2 pr-4">Latest Closed</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => (
                <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                  <td className="py-2 pr-4">{row.closedPositionCount}</td>
                  <td className={`py-2 pr-4 ${pnlClassName(row.realizedPnlUsd)}`}>{fmtUsd(row.realizedPnlUsd)}</td>
                  <td className="py-2 pr-4">{fmtPct(row.weightedRealizedReturnPct)}</td>
                  <td className="py-2 pr-4">{fmtPct(row.averageRealizedReturnPct)}</td>
                  <td className="py-2 pr-4">{row.bestClosedPosition ? `${row.bestClosedPosition.symbol} ${fmtUsd(row.bestClosedPosition.realizedPnlUsd)}` : EMPTY_NOT_AVAILABLE}</td>
                  <td className="py-2 pr-4">{row.worstClosedPosition ? `${row.worstClosedPosition.symbol} ${fmtUsd(row.worstClosedPosition.realizedPnlUsd)}` : EMPTY_NOT_AVAILABLE}</td>
                  <td className="py-2 pr-4">{row.latestClosedPosition ? fmtDate(row.latestClosedPosition.closedAt) : EMPTY_NOT_AVAILABLE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{SIMULATED_OUTCOME_NOTE}</p>
      </SectionCard>

      {/* Section 8: Unrealized P&L / Open Exposure by Signal Cohort */}
      <SectionCard title={SECTION_TITLES.unrealizedPnl}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Entry Notional</th>
                <th className="py-2 pr-4">Current Notional</th>
                <th className="py-2 pr-4">Unrealized P&L</th>
                <th className="py-2 pr-4">Unrealized Return</th>
                <th className="py-2 pr-4">Exposure Share</th>
                <th className="py-2 pr-4">Symbols</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => (
                <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                  <td className="py-2 pr-4">{row.openPositionCount}</td>
                  <td className="py-2 pr-4">{fmtUsd(row.totalEntryNotionalOpenUsd)}</td>
                  <td className="py-2 pr-4">{fmtUsd(row.totalCurrentNotionalOpenUsd)}</td>
                  <td className={`py-2 pr-4 ${pnlClassName(row.unrealizedPnlUsd)}`}>{fmtUsd(row.unrealizedPnlUsd)}</td>
                  <td className="py-2 pr-4">{fmtPct(row.unrealizedReturnPct)}</td>
                  <td className="py-2 pr-4">{fmtPct(row.exposureShareOfPortfolio)}</td>
                  <td className="py-2 pr-4">{row.symbols.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Section 9: Governance & Source-Chain Completeness */}
      <SectionCard title={SECTION_TITLES.governanceCompleteness}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Source Chain</th>
                <th className="py-2 pr-4">Close Governance</th>
                <th className="py-2 pr-4">Unlinked Signals</th>
                <th className="py-2 pr-4">Historical Records</th>
                <th className="py-2 pr-4">Incomplete Chains</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => {
                const sourceCopy = SOURCE_CHAIN_STATUS_COPY[row.sourceChainCompletenessStatus];
                const governanceCopy = GOVERNANCE_STATUS_COPY[row.governanceCompletenessStatus];
                return (
                  <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceCopy.className}`}>{sourceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">{row.governance.unlinkedSignalsCount}</td>
                    <td className="py-2 pr-4">{row.governance.historicalRecordCount}</td>
                    <td className="py-2 pr-4">{row.governance.incompleteChainsCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{GOVERNANCE_COMPLETENESS_NOTE}</p>
      </SectionCard>

      {/* Section 10: Signal Cohort Table */}
      <SectionCard title={SECTION_TITLES.cohortTable}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Strategy Key</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Converted</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Rejected</th>
                <th className="py-2 pr-4">Opened</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Closed</th>
                <th className="py-2 pr-4">Open Exposure</th>
                <th className="py-2 pr-4">Unrealized P&L</th>
                <th className="py-2 pr-4">Realized P&L</th>
                <th className="py-2 pr-4">Win Rate</th>
                <th className="py-2 pr-4">Governance</th>
                <th className="py-2 pr-4">Latest Activity</th>
                <th className="py-2 pr-4">Links</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 && (
                <tr>
                  <td colSpan={16} className="py-3 text-slate-500">
                    {EMPTY_NO_SIGNAL_COHORTS}
                  </td>
                </tr>
              )}
              {cohortRows.map((row) => {
                const governanceCopy = GOVERNANCE_STATUS_COPY[row.governanceCompletenessStatus];
                return (
                  <tr key={row.cohortKey} className="border-b border-white/5 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{row.cohortLabel}</td>
                    <td className="py-2 pr-4">{row.strategyKey ?? "Unspecified"}</td>
                    <td className="py-2 pr-4">{row.totalSignals}</td>
                    <td className="py-2 pr-4">{row.convertedSignals}</td>
                    <td className="py-2 pr-4 text-emerald-300">{row.approvedReviews}</td>
                    <td className="py-2 pr-4 text-rose-300">{row.rejectedReviews}</td>
                    <td className="py-2 pr-4">{row.openedPositionCount}</td>
                    <td className="py-2 pr-4">{row.openPositionCount}</td>
                    <td className="py-2 pr-4">{row.closedPositionCount}</td>
                    <td className="py-2 pr-4">{fmtUsd(row.totalCurrentNotionalOpenUsd)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(row.unrealizedPnlUsd)}`}>{fmtUsd(row.unrealizedPnlUsd)}</td>
                    <td className={`py-2 pr-4 ${pnlClassName(row.realizedPnlUsd)}`}>{fmtUsd(row.realizedPnlUsd)}</td>
                    <td className="py-2 pr-4">{fmtPct(row.winRate)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${governanceCopy.className}`}>{governanceCopy.label}</span>
                    </td>
                    <td className="py-2 pr-4">{fmtDate(row.latestActivityAt)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={row.detailHrefs.signals} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                          {LINK_COPY.viewSignals}
                        </Link>
                        <Link href={row.detailHrefs.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                          {LINK_COPY.viewPositions}
                        </Link>
                        <Link href={row.detailHrefs.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                          {LINK_COPY.viewStrategyAttribution}
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

      {/* Section 11: Unconverted / Incomplete / Historical Signals */}
      <SectionCard title={SECTION_TITLES.unconvertedIncompleteHistorical}>
        <p className="mb-3 text-xs text-slate-500">{UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE}</p>
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
              {incompleteOutcomeRows.map((row) => (
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

      {/* Section 12: Methodology & Safety Notes */}
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

      {/* Section 13: Related Links */}
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
          <Link href={NAV_LINKS.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Strategy Attribution
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
        </div>
      </SectionCard>
    </div>
  );
}
