import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { isDemoScenarioLoaded } from "@/lib/demo/demo-write-service";
import { DEMO_INTAKE, buildDemoScenarioPlan } from "@/lib/demo/scenario";
import { runAdvisorRecommendation } from "@/lib/advisor/advisor-engine";
import {
  ensureRiskConstitution,
  getStrategyPerformance,
  listAuditLedger,
  listTradeDecisions,
  listTradeIntents,
  loadPortfolioOverview,
} from "@/lib/trading/trade-service";
import type { StrategyHealth } from "@/lib/trading/portfolio-summary";
import type { AdvisorRecommendationAction } from "@/lib/trading/strategy-performance";
import { DemoLoadButton } from "./demo-load-button";

const PIPELINE_STAGES = [
  "Advisor intake → Strategy Brief",
  "Level 1 Risk Constitution generated",
  "Scripted trade intents submitted",
  "Every intent evaluated live by the risk policy engine (approved and rejected)",
  "Approved intents open paper positions",
  "Positions marked to a deterministic simulated market price",
  "Two positions closed — one winner, one loser — with realized P&L",
  "Two positions left open, showing live unrealized P&L",
  "Strategy Performance Review computed from the resulting trade history",
  "Every step recorded in the audit ledger",
];

const DECISION_STATUS_STYLE: Record<string, string> = {
  approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
};

const HEALTH_COPY: Record<StrategyHealth, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  caution: { label: "Caution", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  breached: { label: "Breached", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
};

const RECOMMENDATION_COPY: Record<AdvisorRecommendationAction, string> = {
  continue: "Continue Paper Monitoring",
  reduce_risk: "Reduce Risk",
  pause: "Pause",
  review_required: "Review Required",
  not_ready_for_real_execution: "Not Ready For Real Execution",
};

function pnlClassName(value: number): string {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function SectionCard({ step, title, subtitle, children }: { step: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] text-xs font-semibold text-cyan-100">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function DemoSandboxPage() {
  const user = await requireAuthUser();
  const loaded = await isDemoScenarioLoaded(user.companyId);

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
          Paper only · Simulation mode · No real money is being traded
        </div>

        <div className="rounded-2xl border border-cyan-200/30 bg-cyan-300/[0.06] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Demo Strategy Sandbox</p>
          <h2 className="mt-1 text-xl font-semibold text-white">See the entire AOC Capital story in one click</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Loads one coherent, deterministic paper-trading scenario through the same governed write paths a real user&apos;s actions go
            through — nothing here bypasses the Level 1 risk policy engine, and nothing unlocks real execution. Everything stays paper-only,
            simulated, and fully audited.
          </p>

          <ol className="mt-4 space-y-1.5 text-sm text-slate-300">
            {PIPELINE_STAGES.map((stage, index) => (
              <li key={stage} className="flex items-start gap-2">
                <span className="mt-0.5 text-xs text-cyan-300">{index + 1}.</span>
                <span>{stage}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <DemoLoadButton />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
          This does not implement real exchange execution, broker integrations, API keys, withdrawals, or live order routing. No real money
          is traded and no regulated financial advice or guaranteed profit is implied.
        </div>
      </div>
    );
  }

  const recommendation = runAdvisorRecommendation(DEMO_INTAKE);
  // loadPortfolioOverview() marks every open position to a fresh simulated price;
  // it must resolve before getStrategyPerformance() reads paper_positions, so it
  // isn't parallelized with the calls below.
  const overview = await loadPortfolioOverview(user.companyId);
  const [rules, performance, intents, decisions, auditEvents] = await Promise.all([
    ensureRiskConstitution(user.companyId),
    getStrategyPerformance(user.companyId, overview.portfolio),
    listTradeIntents(user.companyId),
    listTradeDecisions(user.companyId),
    listAuditLedger(user.companyId),
  ]);

  const decisionByIntent = new Map(decisions.map((d) => [d.trade_intent_id, d]));

  // The plan's entry prices are steered by the current UTC hour bucket, but
  // symbol/side/notional/leverage/source are fixed by the script regardless
  // of when this page renders — safe to key the narrative lookup on those.
  const narrativeKey = (row: { symbol: string; side: string; notional_usd: number; leverage: number; source: string }) =>
    `${row.symbol}:${row.side}:${row.notional_usd}:${row.leverage}:${row.source}`;
  const plan = buildDemoScenarioPlan(new Date());
  const submitSteps = plan.filter((action) => action.kind === "submit_intent").map((action) => action.step);
  const narrativeByKey = new Map(
    submitSteps.map((step) => [narrativeKey({ symbol: step.symbol, side: step.side, notional_usd: step.notionalUsd, leverage: step.leverage, source: step.source }), step.narrative])
  );
  const symbolByStepId = new Map(submitSteps.map((step) => [step.id, step.symbol]));
  const closeNarrativeByKey = new Map(
    plan
      .filter((action) => action.kind === "close_position")
      .map((action) => [`${symbolByStepId.get(action.close.refId)}:${action.close.closeReason}`, action.close.narrative])
  );

  const openPositions = overview.positions.filter((p) => p.status === "open");
  const closedPositions = overview.positions.filter((p) => p.status === "closed");
  const healthCopy = HEALTH_COPY[performance.strategyHealth];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Demo Strategy Sandbox</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Scenario loaded — {overview.portfolio.name}</h2>
          <p className="mt-1 text-sm text-slate-300">
            This scenario runs once per workspace through the real governed write paths above — reload this page any time to review it
            again.
          </p>
        </div>
        <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${healthCopy.className}`}>Strategy Health: {healthCopy.label}</span>
      </div>

      <SectionCard step={1} title="Advisor → Strategy Brief" subtitle="Guided onboarding output for this scenario's intake.">
        <p className="text-lg font-semibold text-white">{recommendation.brief.headline}</p>
        <p className="mt-2 text-sm text-slate-300">{recommendation.brief.summary}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Risk profile</span>
            <p className="mt-1 text-white">{recommendation.riskProfile}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Recommended capital</span>
            <p className="mt-1 text-white">${recommendation.capitalRecommendation.recommendedBaseCapitalUsd.toFixed(2)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard step={2} title="Risk Constitution — Level 1" subtitle="Enforced on every trade intent below, including the rejected one.">
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <span className="text-white">{rule.label}</span>
              <span className="text-xs text-slate-400">{rule.description}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard step={3} title="Trade Intents → Risk Decisions" subtitle="Every intent submitted in this scenario, with the risk policy engine's full reasoning.">
        <div className="space-y-2">
          {intents.slice(0, 10).map((intent) => {
            const decision = decisionByIntent.get(intent.id);
            const narrative = narrativeByKey.get(narrativeKey(intent));
            return (
              <div key={intent.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
                {narrative ? <p className="mb-2 text-sm text-slate-300">{narrative}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{intent.symbol}</span>
                    <span className="text-sm text-slate-400">
                      {intent.side} · {intent.quantity} · ${intent.notional_usd.toFixed(2)} · {intent.leverage}x · {intent.source}
                    </span>
                  </div>
                  {decision ? (
                    <span className={`rounded-full border px-3 py-1 text-xs ${DECISION_STATUS_STYLE[decision.verdict]}`}>{decision.verdict}</span>
                  ) : null}
                </div>
                {decision ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {decision.reasons.map((reason) => (
                      <li key={reason.ruleKey} className={reason.passed ? "text-slate-500" : "text-rose-300"}>
                        {reason.passed ? "✓" : "✕"} {reason.label} — {reason.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard step={4} title="Paper Positions → Mark-to-Market → Closed Positions" subtitle="Approved intents become positions; two were closed, two remain open and live-marked.">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Open</h4>
            <div className="space-y-2">
              {openPositions.length === 0 && <p className="text-sm text-slate-500">No open paper positions.</p>}
              {openPositions.map((p) => (
                <div key={p.id} className="rounded-xl border border-emerald-300/10 bg-black/10 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {p.symbol} · {p.quantity} @ ${p.entry_price_usd.toFixed(2)}
                    </span>
                    <span className={pnlClassName(p.unrealized_pnl_usd)}>
                      Unrealized P&L: ${p.unrealized_pnl_usd.toFixed(2)} ({p.unrealized_pnl_pct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Closed</h4>
            <div className="space-y-2">
              {closedPositions.length === 0 && <p className="text-sm text-slate-500">No closed paper positions.</p>}
              {closedPositions.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
                  {closeNarrativeByKey.get(`${p.symbol}:${p.close_reason}`) ? (
                    <p className="mb-2 text-slate-300">{closeNarrativeByKey.get(`${p.symbol}:${p.close_reason}`)}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {p.symbol} · {p.quantity} @ ${p.entry_price_usd.toFixed(2)} → ${p.close_price_usd?.toFixed(2) ?? "—"}
                    </span>
                    <span className={`font-medium ${pnlClassName(p.realized_pnl_usd)}`}>
                      Realized P&L: ${p.realized_pnl_usd.toFixed(2)} · {p.close_reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard step={5} title="P&L → Strategy Performance Review" subtitle="Computed from the closed/open positions above — real execution stays locked regardless of outcome.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Win rate</span>
            <p className="mt-1 text-white">{performance.winRatePct.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Profit factor</span>
            <p className="mt-1 text-white">{performance.profitFactor === null ? "—" : performance.profitFactor.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Total P&L</span>
            <p className={`mt-1 font-medium ${pnlClassName(performance.totalPnlUsd)}`}>${performance.totalPnlUsd.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <span className="text-slate-400">Advisor says</span>
            <p className="mt-1 text-white">{RECOMMENDATION_COPY[performance.advisorRecommendation]}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{performance.advisorExplanation}</p>
        <Link href="/capital/performance" className="mt-3 inline-block text-sm text-cyan-200 hover:text-cyan-100">
          View full Strategy Performance Review →
        </Link>
      </SectionCard>

      <SectionCard step={6} title="Audit Ledger" subtitle="Every event above, recorded in order.">
        <div className="space-y-2">
          {auditEvents.slice(0, 25).map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-2 text-xs">
              <span className="text-slate-300">{event.event_type.replace(/_/g, " ")}</span>
              <span className="text-slate-500">{new Date(event.occurred_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <Link href="/capital/audit-ledger" className="mt-3 inline-block text-sm text-cyan-200 hover:text-cyan-100">
          View full Audit Ledger →
        </Link>
      </SectionCard>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        This scenario is simulated paper trading only. It does not implement real exchange execution, broker integrations, API keys,
        withdrawals, or live order routing, and it does not imply real money is being traded, regulated financial advice, or guaranteed
        profits.
      </div>
    </div>
  );
}
