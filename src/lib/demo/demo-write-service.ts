// AOC Capital Demo Strategy Sandbox — governed write orchestrator (PR #5).
//
// Runs the canned scenario from scenario.ts entirely through the existing
// governed write paths: confirmAdvisorRecommendation() (advisor-write-service.ts)
// and createTradeIntent() / closePaperPosition() / markPositionToMarket()
// (trade-service.ts), which in turn are the only callers of
// evaluate_and_record_trade_intent() / close_paper_position() /
// mark_paper_position(). This module never bypasses the risk policy engine,
// never writes paper_positions/trade_intents/trade_decisions directly, and
// never unlocks real execution.
//
// Idempotent: once the 'demo_scenario_loaded' marker exists for a company,
// calling loadDemoScenario() again is a no-op. That marker's payload also
// carries a DemoScenarioManifest (manifest.ts) — the exact set of row ids the
// run created — so resetDemoScenario() can undo a load precisely: it only
// ever deletes rows named in that manifest, scoped to the caller's
// company_id, never a broader "everything of this type" or "everything
// recent" delete. This keeps Reset Demo safe to run against a company that
// also has real (non-demo) portfolio activity — nothing outside the
// manifest is ever touched.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmAdvisorRecommendation } from "@/lib/advisor/advisor-write-service";
import type { AdvisorRecommendation } from "@/lib/advisor/types";
import {
  closePaperPosition,
  createTradeIntent,
  listMarketSignals,
  listPaperPositions,
  markPositionToMarket,
  privileged,
  recordAuditEvent,
} from "@/lib/trading/trade-service";
import type { PaperPositionRow, PortfolioRow, TradeDecisionReason } from "@/lib/trading/database-contract";
import { DEMO_INTAKE, buildDemoScenarioPlan, type DemoTradeIntentStep, type DemoTradeStepId } from "./scenario";
import { buildDemoScenarioPayload, parseDemoManifest, type DemoScenarioManifest } from "./manifest";

export const DEMO_SCENARIO_EVENT_TYPE = "demo_scenario_loaded" as const;
export const DEMO_SCENARIO_RESET_EVENT_TYPE = "demo_scenario_reset" as const;

/** Reads whether the demo scenario marker exists for this company — the idempotency check. Read-only; no writes. */
export async function isDemoScenarioLoaded(companyId: string): Promise<boolean> {
  const marker = await findDemoMarker(companyId);
  return marker !== null;
}

async function findDemoMarker(companyId: string): Promise<{ id: string; payload: unknown } | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_ledger")
    .select("id, payload")
    .eq("company_id", companyId)
    .eq("event_type", DEMO_SCENARIO_EVENT_TYPE)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; payload: unknown } | null) ?? null;
}

/** Fetches the ids of the two audit_ledger rows an advisor confirmation just wrote for `portfolioId`, one per event type. Precise (ordered by recency, one per type), so a prior real advisor run for the same portfolio is never picked up. */
async function fetchJustWrittenAdvisorAuditEventIds(companyId: string, portfolioId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const eventTypes = ["advisor_strategy_generated", "advisor_constitution_generated"] as const;
  const ids: string[] = [];
  for (const eventType of eventTypes) {
    const { data } = await supabase
      .from("audit_ledger")
      .select("id")
      .eq("company_id", companyId)
      .eq("subject_type", "portfolio")
      .eq("subject_id", portfolioId)
      .eq("event_type", eventType)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) ids.push((data as { id: string }).id);
  }
  return ids;
}

/** Fetches audit_ledger ids whose subject is exactly one of the trade intents or paper positions the scenario created — an identity match, not a time window, so it can never pick up unrelated real activity. */
async function fetchTradeAndPositionAuditEventIds(companyId: string, tradeIntentIds: string[], paperPositionIds: string[]): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const ids: string[] = [];

  if (tradeIntentIds.length > 0) {
    const { data } = await supabase.from("audit_ledger").select("id").eq("company_id", companyId).eq("subject_type", "trade_intent").in("subject_id", tradeIntentIds);
    for (const row of (data ?? []) as { id: string }[]) ids.push(row.id);
  }
  if (paperPositionIds.length > 0) {
    const { data } = await supabase.from("audit_ledger").select("id").eq("company_id", companyId).eq("subject_type", "paper_position").in("subject_id", paperPositionIds);
    for (const row of (data ?? []) as { id: string }[]) ids.push(row.id);
  }
  return ids;
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
 * every position still open -> a final demo_scenario_loaded audit marker
 * whose payload carries the DemoScenarioManifest for Reset Demo. Every write
 * goes through the same governed paths a real user's actions would use; this
 * function only sequences them and records what it did.
 */
export async function loadDemoScenario(input: LoadDemoScenarioInput): Promise<LoadDemoScenarioResult> {
  const { companyId, actorUserId, actor } = input;

  if (await isDemoScenarioLoaded(companyId)) {
    return { alreadyLoaded: true };
  }

  const confirmResult = await confirmAdvisorRecommendation({ companyId, actorUserId, actor, intake: DEMO_INTAKE });
  const recommendation = confirmResult.recommendation;
  const portfolio = confirmResult.portfolio;
  const advisorAuditEventIds = await fetchJustWrittenAdvisorAuditEventIds(companyId, portfolio.id);

  const signals = await listMarketSignals(companyId);
  const signalIdBySymbol = new Map(signals.map((signal) => [signal.symbol, signal.id]));

  const plan = buildDemoScenarioPlan(new Date());
  const steps: DemoStepResult[] = [];
  const positionsByStepId = new Map<DemoTradeStepId, PaperPositionRow>();
  const tradeIntentIds: string[] = [];

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

      tradeIntentIds.push(result.intent.id);
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

  const paperPositionIds = Array.from(positionsByStepId.values()).map((position) => position.id);
  const tradeAndPositionAuditEventIds = await fetchTradeAndPositionAuditEventIds(companyId, tradeIntentIds, paperPositionIds);

  const manifest: DemoScenarioManifest = {
    portfolioId: portfolio.id,
    tradeIntentIds,
    paperPositionIds,
    auditEventIds: [...advisorAuditEventIds, ...tradeAndPositionAuditEventIds],
  };

  await recordAuditEvent(
    {
      company_id: companyId,
      event_type: DEMO_SCENARIO_EVENT_TYPE,
      subject_type: "portfolio",
      subject_id: portfolio.id,
      actor,
      payload: buildDemoScenarioPayload({
        stepCount: steps.length,
        approvedCount: steps.filter((s) => s.verdict === "approved").length,
        rejectedCount: steps.filter((s) => s.verdict === "rejected").length,
        closedCount: steps.filter((s) => s.closedRealizedPnlUsd !== null).length,
        openCount: openPositions.length,
        manifest,
      }),
    },
    actorUserId
  );

  return { alreadyLoaded: false, recommendation, portfolio, steps };
}

export type ResetDemoScenarioResult =
  | { reset: false; reason: "not_loaded" | "manifest_unreadable" }
  | { reset: true; removedTradeIntents: number; removedPaperPositions: number; removedAuditEvents: number };

/**
 * Reverses a demo load: deletes only the rows named in the loaded run's
 * DemoScenarioManifest, scoped to the caller's company_id. Deleting
 * trade_intents cascades (via existing FK constraints — see
 * 20260901000000_aoc_capital_paper_trading.sql) to their trade_decisions and
 * paper_positions rows, so those never need a separate delete call. The
 * portfolio row, its base_capital_usd, the applied risk constitution, and
 * capital_levels are intentionally left untouched — they are shared,
 * singleton-per-company resources also used by real (non-demo) activity, not
 * "demo scenario data." After a successful reset, isDemoScenarioLoaded()
 * returns false again, so the demo can be reloaded from a clean slate.
 */
export async function resetDemoScenario(input: LoadDemoScenarioInput): Promise<ResetDemoScenarioResult> {
  const { companyId, actorUserId, actor } = input;

  const marker = await findDemoMarker(companyId);
  if (!marker) return { reset: false, reason: "not_loaded" };

  const manifest = parseDemoManifest(marker.payload);
  if (!manifest) return { reset: false, reason: "manifest_unreadable" };

  const service = privileged("demo/reset", "reset_demo_scenario", companyId, actorUserId);

  let removedTradeIntents = 0;
  if (manifest.tradeIntentIds.length > 0) {
    const { data } = await service.from("trade_intents").delete().eq("company_id", companyId).in("id", manifest.tradeIntentIds).select("id");
    removedTradeIntents = data?.length ?? 0;
  }

  const auditEventIdsToDelete = [...manifest.auditEventIds, marker.id];
  const { data: deletedAudit } = await service.from("audit_ledger").delete().eq("company_id", companyId).in("id", auditEventIdsToDelete).select("id");
  const removedAuditEvents = deletedAudit?.length ?? 0;

  await recordAuditEvent(
    {
      company_id: companyId,
      event_type: DEMO_SCENARIO_RESET_EVENT_TYPE,
      subject_type: "portfolio",
      subject_id: manifest.portfolioId,
      actor,
      payload: {
        paperOnly: true,
        removedTradeIntents,
        removedPaperPositions: manifest.paperPositionIds.length,
        removedAuditEvents,
      },
    },
    actorUserId
  );

  return { reset: true, removedTradeIntents, removedPaperPositions: manifest.paperPositionIds.length, removedAuditEvents };
}
