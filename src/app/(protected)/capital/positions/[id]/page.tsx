import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthUser } from "@/lib/auth";
import { getPositionDetail, PositionDetailNotFoundError } from "@/lib/capital/position-detail-service";
import {
  DECISION_APPROVED_NOTE,
  DECISION_MISSING_NOTE,
  EMPTY_NOT_AVAILABLE,
  EMPTY_NO_AUDIT_EVENTS,
  EMPTY_NO_TIMELINE,
  GOVERNANCE_BADGES,
  GOVERNANCE_NOTE,
  MISSING_UPSTREAM_RECORD,
  MTM_EMPTY_NOTE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  POSITION_HEADER_NOTE,
  SECTION_TITLES,
} from "@/lib/capital/position-detail-content";

type Props = { params: Promise<{ id: string }> };

const TRACEABILITY_STATUS_COPY: Record<string, { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  partial: { label: "Partial", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  position_only: { label: "Position Only", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

function fmtUsd(value: number | null): string {
  if (value === null) return EMPTY_NOT_AVAILABLE;
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
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

const TIMELINE_KIND_LABEL: Record<string, string> = {
  strategy_selected: "Strategy Selected",
  signal_generated: "Signal Generated",
  draft_created: "Draft Created",
  draft_cancelled: "Draft Cancelled",
  submitted_for_review: "Submitted For Review",
  risk_decision: "Risk Decision",
  position_opened: "Position Opened",
  marked_to_market: "Marked To Market",
  position_closed: "Position Closed",
  audit_event: "Audit Event",
};

export default async function PositionDetailPage({ params }: Props) {
  const user = await requireAuthUser();
  const { id } = await params;

  let detail;
  try {
    detail = await getPositionDetail(user.companyId, id);
  } catch (error) {
    if (error instanceof PositionDetailNotFoundError) notFound();
    throw error;
  }

  const { position, pnl, sourceChain, timeline, auditTrail, traceability, governance, relatedLinks } = detail;
  const traceabilityCopy = TRACEABILITY_STATUS_COPY[traceability.status];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* Section 1: Position Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{PAGE_TITLE}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{PAGE_SUBTITLE}</h2>

        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">{SECTION_TITLES.positionHeader}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold text-white">{position.symbol}</span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              position.status === "open" ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {position.status === "open" ? "Open" : "Closed"}
          </span>
          <span className="text-xs text-slate-500">Position {shortId(position.id)}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
          <span>Opened: {fmtDate(position.openedAt)}</span>
          <span>Closed: {position.closedAt ? fmtDate(position.closedAt) : "—"}</span>
          <span>Source: Paper simulation</span>
          <span>Trade intent: {shortId(position.tradeIntentId)}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {GOVERNANCE_BADGES.map((badge) => (
            <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">{POSITION_HEADER_NOTE}</p>
        <p className="mt-1 text-xs text-slate-500">{GOVERNANCE_NOTE}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href={relatedLinks.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            ← Back to Paper Positions
          </Link>
          <Link href={relatedLinks.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Back to Portfolio Overview
          </Link>
          <Link href={relatedLinks.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
            Back to Allocation & Exposure
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Section 2: Current Position Snapshot */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{SECTION_TITLES.currentSnapshot}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Quantity" value={`${position.quantity}`} />
              <StatCard label="Entry Price" value={fmtUsd(position.entryPriceUsd)} />
              <StatCard label="Current Price" value={fmtUsd(position.currentPriceUsd)} />
              <StatCard label="Entry Notional" value={fmtUsd(position.entryNotionalUsd)} />
              <StatCard label="Current Notional" value={fmtUsd(position.currentNotionalUsd)} />
              <StatCard label="Unrealized P&L" value={fmtUsd(pnl.unrealizedPnlUsd)} valueClassName={pnlClassName(pnl.unrealizedPnlUsd)} />
              <StatCard label="Unrealized P&L %" value={fmtPct(pnl.unrealizedPnlPct)} valueClassName={pnlClassName(pnl.unrealizedPnlUsd)} />
              <StatCard label="Last Mark-to-Market" value={fmtDate(position.lastMarkedToMarketAt)} />
              {position.status === "closed" ? (
                <StatCard label="Realized P&L" value={fmtUsd(pnl.realizedPnlUsd)} valueClassName={pnlClassName(pnl.realizedPnlUsd)} />
              ) : null}
            </div>
          </div>

          {/* Section 5: Lifecycle Timeline */}
          <SectionCard title={SECTION_TITLES.lifecycleTimeline}>
            <div className="space-y-2">
              {timeline.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_TIMELINE}</p>}
              {timeline.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {TIMELINE_KIND_LABEL[entry.kind] ?? entry.kind.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500">{fmtDate(entry.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{entry.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{entry.description}</p>
                  {entry.subjectType && entry.subjectId ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {entry.subjectType} {shortId(entry.subjectId)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 6: Mark-to-Market / Valuation History */}
          <SectionCard title={SECTION_TITLES.markToMarket}>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                <span>Last mark-to-market: {fmtDate(position.lastMarkedToMarketAt)}</span>
                <span>Current price: {fmtUsd(position.currentPriceUsd)}</span>
                <span>Current notional: {fmtUsd(position.currentNotionalUsd)}</span>
                <span>Entry notional: {fmtUsd(position.entryNotionalUsd)}</span>
              </div>
              <p className="text-xs text-slate-500">{MTM_EMPTY_NOTE}</p>
            </div>
          </SectionCard>

          {/* Section 7: P&L Breakdown */}
          <SectionCard title={SECTION_TITLES.pnlBreakdown}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Entry Notional" value={fmtUsd(position.entryNotionalUsd)} />
              <StatCard label="Current Notional" value={fmtUsd(position.currentNotionalUsd)} />
              <StatCard label="Unrealized P&L" value={fmtUsd(pnl.unrealizedPnlUsd)} valueClassName={pnlClassName(pnl.unrealizedPnlUsd)} />
              <StatCard label="Unrealized P&L %" value={fmtPct(pnl.unrealizedPnlPct)} valueClassName={pnlClassName(pnl.unrealizedPnlUsd)} />
              {pnl.realizedPnlUsd !== null ? <StatCard label="Realized P&L" value={fmtUsd(pnl.realizedPnlUsd)} valueClassName={pnlClassName(pnl.realizedPnlUsd)} /> : null}
              {pnl.totalPnlUsd !== null ? <StatCard label="Total Simulated P&L" value={fmtUsd(pnl.totalPnlUsd)} valueClassName={pnlClassName(pnl.totalPnlUsd)} /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          {/* Section 3: Source Chain */}
          <SectionCard title={SECTION_TITLES.sourceChain}>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                <p className="mb-1 font-medium text-white">Strategy</p>
                {sourceChain.strategy.traceStatus === "available" ? (
                  <div className="space-y-0.5 text-slate-400">
                    <p>{sourceChain.strategy.name}</p>
                    <p>Selected: {fmtDate(sourceChain.strategy.selectedAt)}</p>
                    <Link href={relatedLinks.performance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                      View Performance Review
                    </Link>
                  </div>
                ) : sourceChain.strategy.traceStatus === "not_applicable" ? (
                  <p className="text-slate-500">Not applicable — this draft was not sourced from a signal recommendation.</p>
                ) : (
                  <p className="text-slate-500">{MISSING_UPSTREAM_RECORD}</p>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                <p className="mb-1 font-medium text-white">Signal Recommendation</p>
                {sourceChain.signal.traceStatus === "available" ? (
                  <div className="space-y-0.5 text-slate-400">
                    <p>
                      {sourceChain.signal.symbol} · {sourceChain.signal.action?.replace(/_/g, " ")} · {sourceChain.signal.strength}
                    </p>
                    <p>Suggested notional: {fmtUsd(sourceChain.signal.suggestedNotionalUsd)}</p>
                    <p>Generated: {fmtDate(sourceChain.signal.generatedAt)}</p>
                    {sourceChain.signal.rationale ? <p>Rationale: {sourceChain.signal.rationale}</p> : null}
                    <Link href={relatedLinks.signals} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                      Open Signals
                    </Link>
                  </div>
                ) : sourceChain.signal.traceStatus === "not_applicable" ? (
                  <p className="text-slate-500">Not applicable — this draft was not sourced from a signal recommendation.</p>
                ) : (
                  <p className="text-slate-500">{MISSING_UPSTREAM_RECORD}</p>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                <p className="mb-1 font-medium text-white">Draft Trade Intent</p>
                {sourceChain.tradeIntent.traceStatus === "available" ? (
                  <div className="space-y-0.5 text-slate-400">
                    <p>
                      {shortId(sourceChain.tradeIntent.id)} · {sourceChain.tradeIntent.side} · {sourceChain.tradeIntent.quantity}
                    </p>
                    <p>Notional: {fmtUsd(sourceChain.tradeIntent.notionalUsd)}</p>
                    <p>
                      Source: {sourceChain.tradeIntent.source} · Status: {sourceChain.tradeIntent.recordStatus}
                    </p>
                    <p>Created: {fmtDate(sourceChain.tradeIntent.createdAt)}</p>
                    <Link href={relatedLinks.tradeIntents} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                      Open Trade Intents
                    </Link>
                  </div>
                ) : (
                  <p className="text-slate-500">{MISSING_UPSTREAM_RECORD}</p>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                <p className="mb-1 font-medium text-white">Paper Position</p>
                <div className="space-y-0.5 text-slate-400">
                  <p>{shortId(position.id)}</p>
                  <p>Opened: {fmtDate(position.openedAt)}</p>
                  <p>
                    Entry: {fmtUsd(position.entryPriceUsd)} · Current: {fmtUsd(position.currentPriceUsd)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Risk Constitution Decision */}
          <SectionCard title={SECTION_TITLES.riskConstitutionDecision}>
            {sourceChain.decision.traceStatus === "available" ? (
              <div className="space-y-2 text-sm">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    sourceChain.decision.verdict === "approved"
                      ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200"
                      : "border-rose-300/30 bg-rose-300/[0.08] text-rose-200"
                  }`}
                >
                  {sourceChain.decision.verdict}
                </span>
                <p className="text-xs text-slate-400">Decided: {fmtDate(sourceChain.decision.createdAt)}</p>
                <ul className="space-y-1 text-xs text-slate-400">
                  {sourceChain.decision.reasons.map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
                {sourceChain.decision.verdict === "approved" ? <p className="text-xs text-slate-500">{DECISION_APPROVED_NOTE}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{DECISION_MISSING_NOTE}</p>
            )}
          </SectionCard>

          {/* Section 9: Governance & Safety */}
          <SectionCard title={SECTION_TITLES.governanceSafety}>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${traceabilityCopy.className}`}>Traceability: {traceabilityCopy.label}</span>
              </div>
              <p className="text-slate-400">{traceability.message}</p>
              <ul className="space-y-1 text-slate-400">
                {governance.paperOnly ? <li>• Paper-only simulation</li> : null}
                {governance.realExecutionLocked ? <li>• Real execution locked</li> : null}
                {!governance.brokerConnected ? <li>• No broker connected</li> : null}
                {!governance.liveOrderRoutingEnabled ? <li>• No live order routing</li> : null}
                <li>• No order placed</li>
                <li>• No withdrawal/deposit functionality</li>
                <li>• Position opened only through governed paper path</li>
                {governance.readOnly ? <li>• Read-only view</li> : null}
              </ul>
              <p className="text-slate-500">{GOVERNANCE_NOTE}</p>
            </div>
          </SectionCard>

          {/* Section 10: Related Links */}
          <SectionCard title={SECTION_TITLES.relatedLinks}>
            <div className="flex flex-col gap-2 text-xs">
              <Link href={relatedLinks.positions} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Back to Paper Positions
              </Link>
              <Link href={relatedLinks.allocation} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Back to Allocation & Exposure
              </Link>
              <Link href={relatedLinks.overview} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Back to Portfolio Overview
              </Link>
              <Link href={relatedLinks.tradeIntents} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Open Trade Intents
              </Link>
              <Link href={relatedLinks.signals} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Open Signals
              </Link>
              <Link href={relatedLinks.performance} className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                Open Performance Review
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Section 8: Audit Trail */}
      <SectionCard title={SECTION_TITLES.auditTrail}>
        <div className="space-y-2">
          {auditTrail.length === 0 && <p className="text-sm text-slate-500">{EMPTY_NO_AUDIT_EVENTS}</p>}
          {auditTrail.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{event.eventType.replace(/_/g, " ")}</span>
                <span className="text-xs text-slate-500">{fmtDate(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {event.subjectType} {shortId(event.subjectId)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{event.summary}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
