import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getPortfolioGovernanceSnapshot } from "@/lib/capital/portfolio-governance-snapshot-service";
import {
  EMPTY_NOT_AVAILABLE,
  EMPTY_NO_GAPS,
  GOVERNANCE_BADGES,
  HEADER_NOTE,
  LINK_COPY,
  METHODOLOGY_NOTES,
  MVP_READINESS_NOTE,
  NAV_LINKS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  PAPER_ONLY_BOUNDARY_NOTE,
  READ_ONLY_NOTE,
  SECTION_TITLES,
  SIMULATED_PNL_NOTE,
  SOURCE_CHAIN_COMPLETENESS_NOTE,
} from "@/lib/capital/portfolio-governance-snapshot-content";

const GOVERNANCE_STATUS_COPY: Record<string, { label: string; className: string }> = {
  strong: { label: "Strong", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  acceptable: { label: "Acceptable", className: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200" },
  needs_review: { label: "Needs Review", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  incomplete: { label: "Incomplete", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_available: { label: "Not Available", className: "border-white/10 bg-white/5 text-slate-400" },
};

const READINESS_STATUS_COPY: Record<string, { label: string; className: string }> = {
  ready_for_review: { label: "Ready for Review", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  needs_minor_review: { label: "Needs Minor Review", className: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200" },
  needs_hardening: { label: "Needs Hardening", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  blocked: { label: "Blocked", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_available: { label: "Not Available", className: "border-white/10 bg-white/5 text-slate-400" },
};

const SEVERITY_COPY: Record<string, { label: string; className: string }> = {
  info: { label: "Info", className: "border-white/10 bg-white/5 text-slate-300" },
  low: { label: "Low", className: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200" },
  medium: { label: "Medium", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  high: { label: "High", className: "border-orange-300/30 bg-orange-300/[0.08] text-orange-200" },
  critical: { label: "Critical", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

const CHECKLIST_STATUS_COPY: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  warning: { label: "Warning", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  fail: { label: "Fail", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  not_available: { label: "Not Available", className: "border-white/10 bg-white/5 text-slate-400" },
};

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${(value * 100).toFixed(1)}%`;
}

function fmtCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_NOT_AVAILABLE;
  return `${value}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function fmtBool(value: boolean): string {
  return value ? "yes" : "no";
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

function StatusBadge({ status, copy }: { status: string; copy: Record<string, { label: string; className: string }> }) {
  const entry = copy[status] ?? { label: status, className: "border-white/10 bg-white/5 text-slate-400" };
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${entry.className}`}>{entry.label}</span>;
}

export default async function PortfolioGovernanceSnapshotPage() {
  const user = await requireAuthUser();
  const report = await getPortfolioGovernanceSnapshot(user.companyId);
  const {
    portfolio,
    generatedAt,
    executiveSummary,
    paperOnlyBoundary,
    lifecycleCompleteness,
    sourceChainCompleteness,
    auditEvidence,
    openExposure,
    simulatedPnl,
    strategyAttributionHealth,
    signalCohortHealth,
    governanceGaps,
    mvpIntegrationReadiness,
    governance,
  } = report;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Section 1: Governance Snapshot Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.header}</p>
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
        </div>
      </div>

      {/* Section 2: Executive Governance Summary */}
      <SectionCard title={SECTION_TITLES.executiveSummary}>
        <div className="mb-4 flex flex-wrap gap-3">
          <StatusBadge status={executiveSummary.overallGovernanceStatus} copy={GOVERNANCE_STATUS_COPY} />
          <StatusBadge status={executiveSummary.mvpReviewReadinessStatus} copy={READINESS_STATUS_COPY} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Overall Governance Status" value={GOVERNANCE_STATUS_COPY[executiveSummary.overallGovernanceStatus]?.label ?? executiveSummary.overallGovernanceStatus} />
          <StatCard label="Paper-Only Boundary Status" value={executiveSummary.paperOnlyBoundaryStatus === "intact" ? "Intact" : "Breached"} />
          <StatCard label="Real Execution Status" value={executiveSummary.realExecutionStatus === "locked" ? "Locked" : "Unlocked"} />
          <StatCard label="Open Exposure Posture" value={executiveSummary.openExposurePosture.replace(/_/g, " ")} />
          <StatCard label="Lifecycle Completeness" value={fmtPct(executiveSummary.lifecycleCompletenessScore)} />
          <StatCard label="Source-Chain Completeness" value={fmtPct(executiveSummary.sourceChainCompletenessScore)} />
          <StatCard label="Close Governance Completeness" value={fmtPct(executiveSummary.closeGovernanceCompletenessScore)} />
          <StatCard label="Audit Evidence Completeness" value={fmtPct(executiveSummary.auditEvidenceCompletenessScore)} />
          <StatCard label="Realized Simulated P&L" value={fmtUsd(executiveSummary.realizedPnlUsd)} valueClassName={pnlClassName(executiveSummary.realizedPnlUsd)} />
          <StatCard label="Unrealized Simulated P&L" value={fmtUsd(executiveSummary.unrealizedPnlUsd)} valueClassName={pnlClassName(executiveSummary.unrealizedPnlUsd)} />
          <StatCard label="Unlinked / Incomplete Records" value={fmtCount(executiveSummary.unlinkedRecordCount + executiveSummary.incompleteRecordCount)} />
          <StatCard label="Historical Records" value={fmtCount(executiveSummary.historicalRecordCount)} />
        </div>
      </SectionCard>

      {/* Section 3: Paper-Only Boundary Evidence */}
      <SectionCard title={SECTION_TITLES.paperOnlyBoundary}>
        <div className="grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          <p>Paper-only: {fmtBool(paperOnlyBoundary.paperOnly)}</p>
          <p>Real execution locked: {fmtBool(paperOnlyBoundary.realExecutionLocked)}</p>
          <p>Broker connected: {fmtBool(paperOnlyBoundary.brokerConnected)}</p>
          <p>Live order routing enabled: {fmtBool(paperOnlyBoundary.liveOrderRoutingEnabled)}</p>
          <p>Trading API keys present: {fmtBool(paperOnlyBoundary.tradingApiKeysPresent)}</p>
          <p>Withdrawals enabled: {fmtBool(paperOnlyBoundary.withdrawalsEnabled)}</p>
          <p>Deposits enabled: {fmtBool(paperOnlyBoundary.depositsEnabled)}</p>
          <p>Market data fetched by snapshot: {fmtBool(paperOnlyBoundary.marketDataFetched)}</p>
          <p>Mutations performed by snapshot: {fmtBool(paperOnlyBoundary.mutationsPerformed)}</p>
          <p>Investment advice provided: {fmtBool(paperOnlyBoundary.investmentAdviceProvided)}</p>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-slate-500">
          <li>• No broker integration surface detected in snapshot code.</li>
          <li>• No order placement surface detected in snapshot code.</li>
          <li>• No API-key storage introduced by this PR.</li>
          <li>• No withdrawal/deposit surface introduced by this PR.</li>
          <li>• Snapshot route is GET-only.</li>
          <li>• Snapshot service is read-only.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{PAPER_ONLY_BOUNDARY_NOTE}</p>
      </SectionCard>

      {/* Section 4: Lifecycle Completeness */}
      <SectionCard title={SECTION_TITLES.lifecycleCompleteness}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Strategies</th>
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
                <th className="py-2 pr-4">Close Reviews</th>
                <th className="py-2 pr-4">Realized Records</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 text-slate-300">
                <td className="py-2 pr-4 font-medium text-white">{lifecycleCompleteness.counts.strategies}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.signals}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.eligibleSignals}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.convertedSignals}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.drafts}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.cancelledDrafts}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.submittedDrafts}</td>
                <td className="py-2 pr-4 text-emerald-300">{lifecycleCompleteness.counts.approvedReviews}</td>
                <td className="py-2 pr-4 text-rose-300">{lifecycleCompleteness.counts.rejectedReviews}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.openedPositions}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.openPositions}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.closedPositions}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.closeReviews}</td>
                <td className="py-2 pr-4">{lifecycleCompleteness.counts.realizedOutcomeRecords}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Complete Chains" value={fmtCount(lifecycleCompleteness.completeChains)} />
          <StatCard label="Partial Chains" value={fmtCount(lifecycleCompleteness.partialChains)} />
          <StatCard label="Unlinked Chains" value={fmtCount(lifecycleCompleteness.unlinkedChains)} />
          <StatCard label="Historical Chains" value={fmtCount(lifecycleCompleteness.historicalChains)} />
          <StatCard label="Not Advanced" value={fmtCount(lifecycleCompleteness.notAdvancedChains)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Lifecycle completeness excludes signals that simply did not advance — it is not a measure of signal quality or advice.</p>
      </SectionCard>

      {/* Section 5: Source-Chain Completeness */}
      <SectionCard title={SECTION_TITLES.sourceChainCompleteness}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Complete" value={fmtCount(sourceChainCompleteness.complete)} />
          <StatCard label="Partial" value={fmtCount(sourceChainCompleteness.partial)} />
          <StatCard label="Missing" value={fmtCount(sourceChainCompleteness.missing)} />
          <StatCard label="Unlinked" value={fmtCount(sourceChainCompleteness.unlinked)} />
          <StatCard label="Historical" value={fmtCount(sourceChainCompleteness.historical)} />
          <StatCard label="Not Applicable" value={fmtCount(sourceChainCompleteness.notApplicable)} />
        </div>
        <StatCard label="Overall Source-Chain Completeness" value={fmtPct(sourceChainCompleteness.completenessPct)} />
        <p className="mt-3 text-xs text-slate-500">{SOURCE_CHAIN_COMPLETENESS_NOTE}</p>
      </SectionCard>

      {/* Section 6: Audit Evidence Summary */}
      <SectionCard title={SECTION_TITLES.auditEvidence}>
        <div className="mb-4">
          <StatusBadge status={auditEvidence.closeGovernanceStatus} copy={GOVERNANCE_STATUS_COPY} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Expected Audit Evidence" value={fmtCount(auditEvidence.expectedAuditEvidenceCount)} />
          <StatCard label="Resolved Audit Evidence" value={fmtCount(auditEvidence.resolvedAuditEvidenceCount)} />
          <StatCard label="Missing Audit Evidence" value={fmtCount(auditEvidence.missingAuditEvidenceCount)} />
          <StatCard label="Close Review Approved Audits" value={fmtCount(auditEvidence.closeReviewApprovedAuditCount)} />
          <StatCard label="Paper Position Closed Audits" value={fmtCount(auditEvidence.paperPositionClosedAuditCount)} />
          <StatCard label="Positions Missing Close Audit" value={fmtCount(auditEvidence.positionsMissingCloseAuditEvidence)} />
        </div>
      </SectionCard>

      {/* Section 7: Open Exposure & Risk Posture */}
      <SectionCard title={SECTION_TITLES.openExposure}>
        <div className="mb-4">
          <StatusBadge status={openExposure.posture} copy={{ low: { label: "Low", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" }, moderate: { label: "Moderate", className: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200" }, elevated: { label: "Elevated", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" }, high: { label: "High", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" }, not_available: { label: "Not Available", className: "border-white/10 bg-white/5 text-slate-400" } }} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open Position Count" value={fmtCount(openExposure.openPositionCount)} />
          <StatCard label="Total Entry Notional Open" value={fmtUsd(openExposure.totalEntryNotionalOpenUsd)} />
          <StatCard label="Total Current Notional Open" value={fmtUsd(openExposure.totalCurrentNotionalOpenUsd)} />
          <StatCard label="Unrealized Simulated P&L" value={fmtUsd(openExposure.unrealizedPnlUsd)} valueClassName={pnlClassName(openExposure.unrealizedPnlUsd)} />
          <StatCard label="Largest Symbol Weight" value={fmtPct(openExposure.largestSymbolWeight)} />
          <StatCard label="Exposure Limit Usage" value={fmtPct(openExposure.exposureLimitUsage)} />
        </div>
      </SectionCard>

      {/* Section 8: Realized / Unrealized Simulated P&L Summary */}
      <SectionCard title={SECTION_TITLES.simulatedPnl}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Realized Simulated P&L" value={fmtUsd(simulatedPnl.realizedPnlUsd)} valueClassName={pnlClassName(simulatedPnl.realizedPnlUsd)} />
          <StatCard label="Unrealized Simulated P&L" value={fmtUsd(simulatedPnl.unrealizedPnlUsd)} valueClassName={pnlClassName(simulatedPnl.unrealizedPnlUsd)} />
          <StatCard label="Total Simulated P&L" value={fmtUsd(simulatedPnl.totalSimulatedPnlUsd)} valueClassName={pnlClassName(simulatedPnl.totalSimulatedPnlUsd)} />
          <StatCard label="Weighted Realized Return" value={fmtPct(simulatedPnl.weightedRealizedReturnPct)} />
          <StatCard label="Open Positions" value={fmtCount(simulatedPnl.openPositionCount)} />
          <StatCard label="Closed Positions" value={fmtCount(simulatedPnl.closedPositionCount)} />
          <StatCard label="Missing Realized P&L" value={fmtCount(simulatedPnl.missingRealizedPnlCount)} />
          <StatCard label="Missing Unrealized P&L" value={fmtCount(simulatedPnl.missingUnrealizedPnlCount)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{SIMULATED_PNL_NOTE}</p>
      </SectionCard>

      {/* Section 9: Strategy Attribution Health */}
      <SectionCard title={SECTION_TITLES.strategyAttributionHealth}>
        <div className="mb-4">
          <StatusBadge status={strategyAttributionHealth.status} copy={GOVERNANCE_STATUS_COPY} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Attributable Strategies" value={fmtCount(strategyAttributionHealth.attributableStrategyCount)} />
          <StatCard label="Unlinked Records" value={fmtCount(strategyAttributionHealth.unlinkedRecordCount)} />
          <StatCard label="Historical Records" value={fmtCount(strategyAttributionHealth.historicalRecordCount)} />
          <StatCard label="Governance Completeness" value={fmtPct(strategyAttributionHealth.overallGovernanceCompletenessPct)} />
          <StatCard label="Realized Simulated P&L" value={fmtUsd(strategyAttributionHealth.totalRealizedPnlUsd)} valueClassName={pnlClassName(strategyAttributionHealth.totalRealizedPnlUsd)} />
          <StatCard label="Unrealized Simulated P&L" value={fmtUsd(strategyAttributionHealth.totalUnrealizedPnlUsd)} valueClassName={pnlClassName(strategyAttributionHealth.totalUnrealizedPnlUsd)} />
        </div>
        <div className="mt-4">
          <Link href={NAV_LINKS.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewStrategyAttribution}
          </Link>
        </div>
      </SectionCard>

      {/* Section 10: Signal Cohort Health */}
      <SectionCard title={SECTION_TITLES.signalCohortHealth}>
        <div className="mb-4">
          <StatusBadge status={signalCohortHealth.status} copy={GOVERNANCE_STATUS_COPY} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Signals" value={fmtCount(signalCohortHealth.totalSignals)} />
          <StatCard label="Eligible Signals" value={fmtCount(signalCohortHealth.eligibleSignals)} />
          <StatCard label="Converted Signals" value={fmtCount(signalCohortHealth.convertedSignals)} />
          <StatCard label="Not Converted" value={fmtCount(signalCohortHealth.notConvertedSignals)} />
          <StatCard label="Submitted Reviews" value={fmtCount(signalCohortHealth.submittedReviews)} />
          <StatCard label="Approved Reviews" value={fmtCount(signalCohortHealth.approvedReviews)} valueClassName="text-emerald-300" />
          <StatCard label="Rejected Reviews" value={fmtCount(signalCohortHealth.rejectedReviews)} valueClassName="text-rose-300" />
          <StatCard label="Opened Positions" value={fmtCount(signalCohortHealth.openedPositions)} />
          <StatCard label="Open Positions" value={fmtCount(signalCohortHealth.openPositions)} />
          <StatCard label="Closed Positions" value={fmtCount(signalCohortHealth.closedPositions)} />
          <StatCard label="Incomplete Outcomes" value={fmtCount(signalCohortHealth.incompleteOutcomeCount)} />
          <StatCard label="Historical Records" value={fmtCount(signalCohortHealth.historicalRecordCount)} />
          <StatCard label="Source-Chain Completeness" value={fmtPct(signalCohortHealth.overallSourceChainCompletenessPct)} />
        </div>
        <div className="mt-4">
          <Link href={NAV_LINKS.signalCohorts} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewSignalCohorts}
          </Link>
        </div>
      </SectionCard>

      {/* Section 11: Unlinked / Incomplete / Historical Records */}
      <SectionCard title={SECTION_TITLES.governanceGaps}>
        {governanceGaps.every((g) => g.count === 0) ? <p className="mb-3 text-xs text-slate-400">{EMPTY_NO_GAPS}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Label</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Count</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Impact</th>
                <th className="py-2 pr-4">Link</th>
              </tr>
            </thead>
            <tbody>
              {governanceGaps.map((gap) => (
                <tr key={gap.id} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4">{gap.category.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4 font-medium text-white">{gap.label}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={gap.severity} copy={SEVERITY_COPY} />
                  </td>
                  <td className="py-2 pr-4">{gap.count}</td>
                  <td className="py-2 pr-4">{gap.description}</td>
                  <td className="py-2 pr-4">{gap.impact}</td>
                  <td className="py-2 pr-4">
                    {gap.relatedHref ? (
                      <Link href={gap.relatedHref} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
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

      {/* Section 12: MVP Integration Review Readiness */}
      <SectionCard title={SECTION_TITLES.mvpReadiness}>
        <div className="mb-4">
          <StatusBadge status={mvpIntegrationReadiness.status} copy={READINESS_STATUS_COPY} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">Checklist Item</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {mvpIntegrationReadiness.checklist.map((item) => (
                <tr key={item.key} className="border-b border-white/5 text-slate-300">
                  <td className="py-2 pr-4 font-medium text-white">{item.label}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={item.status} copy={CHECKLIST_STATUS_COPY} />
                  </td>
                  <td className="py-2 pr-4">{item.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{MVP_READINESS_NOTE}</p>
      </SectionCard>

      {/* Section 13: Methodology & Safety Notes */}
      <SectionCard title={SECTION_TITLES.methodologySafety}>
        <ul className="space-y-1 text-xs text-slate-400">
          {METHODOLOGY_NOTES.map((note) => (
            <li key={note}>• {note}</li>
          ))}
          <li>• Paper-only: {fmtBool(governance.paperOnly)}</li>
          <li>• Read-only: {fmtBool(governance.readOnly)}</li>
          <li>• Real execution locked: {fmtBool(governance.realExecutionLocked)}</li>
          <li>• Broker connected: {fmtBool(governance.brokerConnected)}</li>
          <li>• Live order routing enabled: {fmtBool(governance.liveOrderRoutingEnabled)}</li>
          <li>• Market data fetched on this page: {fmtBool(governance.marketDataFetched)}</li>
          <li>• Mutations performed by this page: {fmtBool(governance.mutationsPerformed)}</li>
          <li>• LLM called by this page: {fmtBool(governance.llmCalled)}</li>
          <li>• Investment advice provided: {fmtBool(governance.investmentAdviceProvided)}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{READ_ONLY_NOTE}</p>
      </SectionCard>

      {/* Section 14: Related Links */}
      <SectionCard title={SECTION_TITLES.relatedLinks}>
        <div className="flex flex-col gap-2 text-xs">
          <Link href={NAV_LINKS.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewOverview}
          </Link>
          <Link href={NAV_LINKS.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewAllocation}
          </Link>
          <Link href={NAV_LINKS.closedPerformance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewClosedPerformance}
          </Link>
          <Link href={NAV_LINKS.strategyAttribution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewStrategyAttribution}
          </Link>
          <Link href={NAV_LINKS.signalCohorts} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewSignalCohorts}
          </Link>
          <Link href={NAV_LINKS.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewPositions}
          </Link>
          <Link href={NAV_LINKS.signals} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewSignals}
          </Link>
          <Link href={NAV_LINKS.tradeIntents} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewTradeIntents}
          </Link>
          <Link href={NAV_LINKS.strategies} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewStrategyLibrary}
          </Link>
          <Link href={NAV_LINKS.investorConstitution} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            {LINK_COPY.viewInvestorConstitution}
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
