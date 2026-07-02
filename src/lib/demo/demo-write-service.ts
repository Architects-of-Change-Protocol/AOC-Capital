// AOC Capital Demo Strategy Sandbox — governed write orchestrator (PR #5).
//
// Runs the canned scenario from scenario.ts entirely through the existing
// governed write paths: confirmAdvisorRecommendation() (advisor-write-service.ts)
// and createTradeIntent() / closePaperPosition() / markPositionToMarket()
// (trade-service.ts), which in turn are the only callers of
// evaluate_and_record_trade_intent() / close_paper_position() /
// mark_paper_position(). This module adds no new privileged writes of its
// own beyond a single audit_ledger row (via recordAuditEvent) marking the
// scenario complete — it never bypasses the risk policy engine, never writes
// paper_positions/trade_intents/trade_decisions directly, and never unlocks
// real execution. Idempotent: once the 'demo_scenario_loaded' marker exists
// for a company, calling loadDemoScenario() again is a no-op.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmAdvisorRecommendation } from "@/lib/advisor/advisor-write-service";
import type { AdvisorRecommendation } from "@/lib/advisor/types";
import {
  closePaperPosition,
  createTradeIntent,
  listMarketSignals,
  listPaperPositions,
  markPositionToMarket,
  recordAuditEvent,
} from "@/lib/trading/trade-service";
import type { PaperPositionRow, PortfolioRow, TradeDecisionReason } from "@/lib/trading/database-contract";
import { DEMO_INTAKE, buildDemoScenarioPlan, type DemoTradeIntentStep, type DemoTradeStepId } from "./scenario";

export const DEMO_SCENARIO_EVENT_TYPE = "demo_scenario_loaded" as const;

/** Reads whether the demo scenario marker exists for this company — the idempotency check. Read-only; no writes. */
export async function isDemoScenarioLoaded(companyId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_ledger")
    .select("id")
    .eq("company_id", companyId)
    .eq("event_type", DEMO_SCENARIO_EVENT_TYPE)
    .limit(1)
    .maybeSingle();
  return data !== null && data !== undefined;
}

export type DemoStepResult = {
  step: DemoTradeIntentStep;
  verdict: "approved" | "rejected";
  reasons: TradeDecisionReason[];
  position: PaperPositionRow | null;
  closedRealizedPnlUsd: number | null;
};

export type LoadDemoScenarioResult =
  | { alreadyLoaded: true }
  | {
      alreadyLoaded: false;
      recommendation: AdvisorRecommendation;
      portfolio: PortfolioRow;
      steps: DemoStepResult[];
    };

export type LoadDemoScenarioInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
};

/**
 * Loads the demo scenario: advisor confirmation -> seeded market signals ->
 * scripted trade intents (each evaluated live by the Level 1 risk policy
 * engine) -> closes for the two "close" steps -> an audited mark-to-market on
 * every position still open -> a final demo_scenario_loaded audit marker.
 * Every write goes through the same governed paths a real user's actions
 * would use; this function only sequences them.
 */
export async function loadDemoScenario(input: LoadDemoScenarioInput): Promise<LoadDemoScenarioResult> {
  const { companyId, actorUserId, actor } = input;

  if (await isDemoScenarioLoaded(companyId)) {
    return { alreadyLoaded: true };
  }

  const confirmResult = await confirmAdvisorRecommendation({ companyId, actorUserId, actor, intake: DEMO_INTAKE });
  const recommendation = confirmResult.recommendation;
  const portfolio = confirmResult.portfolio;

  const signals = await listMarketSignals(companyId);
  const signalIdBySymbol = new Map(signals.map((signal) => [signal.symbol, signal.id]));

  const plan = buildDemoScenarioPlan(new Date());
  const steps: DemoStepResult[] = [];
  const positionsByStepId = new Map<DemoTradeStepId, PaperPositionRow>();

  for (const action of plan) {
    if (action.kind === "submit_intent") {
      const step = action.step;
      const signalId = step.source === "signal" ? (signalIdBySymbol.get(step.signalSymbol ?? step.symbol) ?? null) : null;

      const result = await createTradeIntent({
        companyId,
        actorUserId,
        actor,
        portfolioId: portfolio.id,
        symbol: step.symbol,
        side: step.side,
        quantity: step.quantity,
        notionalUsd: step.notionalUsd,
        leverage: step.leverage,
        source: step.source,
        signalId,
      });

      if (result.position) positionsByStepId.set(step.id, result.position);
      steps.push({ step, verdict: result.decision.verdict, reasons: result.decision.reasons, position: result.position, closedRealizedPnlUsd: null });
      continue;
    }

    // close_position: the referenced submit_intent may not have opened a
    // position (e.g. pre-existing portfolio state caused an unexpected
    // rejection) — skip gracefully rather than throwing.
    const position = positionsByStepId.get(action.close.refId);
    if (!position) continue;

    const closed = await closePaperPosition({
      companyId,
      positionId: position.id,
      actor,
      actorUserId,
      closeReason: action.close.closeReason,
    });
    positionsByStepId.set(action.close.refId, closed);

    const matching = steps.find((s) => s.step.id === action.close.refId);
    if (matching) matching.closedRealizedPnlUsd = closed.realized_pnl_usd;
  }

  // Audited mark-to-market on every position the scenario left open, so the
  // audit ledger carries an explicit position_marked_to_market event for each
  // (routine bulk refreshes elsewhere never write this audit event).
  const openPositions = (await listPaperPositions(companyId)).filter(
    (position) => position.status === "open" && position.portfolio_id === portfolio.id
  );
  for (const position of openPositions) {
    await markPositionToMarket(companyId, position.id, actor, actorUserId, { audit: true });
  }

  await recordAuditEvent(
    {
      company_id: companyId,
      event_type: DEMO_SCENARIO_EVENT_TYPE,
      subject_type: "portfolio",
      subject_id: portfolio.id,
      actor,
      payload: {
        stepCount: steps.length,
        approvedCount: steps.filter((s) => s.verdict === "approved").length,
        rejectedCount: steps.filter((s) => s.verdict === "rejected").length,
        closedCount: steps.filter((s) => s.closedRealizedPnlUsd !== null).length,
        openCount: openPositions.length,
        paperOnly: true,
      },
    },
    actorUserId
  );

  return { alreadyLoaded: false, recommendation, portfolio, steps };
}
