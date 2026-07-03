// AOC Capital — Cancel / Withdraw Draft Trade Intent (PR #13).
//
// The only place a draft-cancellation touches the database. Signals
// recommend. Humans create drafts. Humans may withdraw drafts. Humans submit
// drafts. Risk Constitution decides. Paper simulation follows governed
// approval. Real execution remains locked.
//
// Accepts only a tradeIntentId — there is no client-suppliable symbol, side,
// quantity, notional, strategy, status, or cancellation reason for this flow
// to trust. Re-reads the trade intent fresh from the database by id, rejects
// anything that isn't still a submittable draft before writing anything, then
// calls cancel_draft_trade_intent_and_audit()
// (20260912000000_aoc_capital_cancel_draft_trade_intent.sql) through the
// existing privileged, service-role write path, which locks the draft row,
// re-validates status and tenant/portfolio, checks no paper position exists
// for it, updates the status to 'cancelled', releases the source signal's
// converted marker (only if it still points at this draft), and writes the
// draft_trade_intent_cancelled audit event — all in one transaction.
//
// This never runs the Level 1 risk policy engine, never calls
// submit_draft_trade_intent_for_review or evaluate_and_record_trade_intent,
// never inserts trade_decisions or paper_positions, and never enables real
// execution. Cancellation is a separate, explicit user-confirmed action: the
// system never automatically cancels a draft.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { privileged } from "@/lib/trading/trade-service";
import type { PaperSignalRecommendationRow, TradeIntentRow } from "@/lib/trading/database-contract";

export class DraftTradeIntentNotFoundError extends Error {
  constructor() {
    super("Draft trade intent not found.");
    this.name = "DraftTradeIntentNotFoundError";
  }
}

export class TradeIntentNotDraftError extends Error {
  constructor(status: string) {
    super(`Only draft trade intents can be cancelled (this trade intent's status is "${status}").`);
    this.name = "TradeIntentNotDraftError";
  }
}

export class DraftTradeIntentHasPaperPositionError extends Error {
  constructor() {
    super("Cannot cancel a draft trade intent that already has a paper position.");
    this.name = "DraftTradeIntentHasPaperPositionError";
  }
}

export class DraftTradeIntentCancelFailedError extends Error {
  constructor(message: string) {
    super(`Unable to cancel draft trade intent: ${message}`);
    this.name = "DraftTradeIntentCancelFailedError";
  }
}

const TRADE_INTENT_COLUMNS =
  "id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at,cancelled_at,cancelled_by";

async function getDraftTradeIntent(companyId: string, portfolioId: string, intentId: string): Promise<TradeIntentRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_intents")
    .select(TRADE_INTENT_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("id", intentId)
    .maybeSingle();
  return (data ?? null) as TradeIntentRow | null;
}

/** Same eligibility rule enforced both here (for a fast, friendly error) and inside the atomic RPC (the authoritative, race-safe copy). Only a draft can be cancelled. */
function assertCancellable(intent: TradeIntentRow): void {
  if (intent.status !== "draft") throw new TradeIntentNotDraftError(intent.status);
}

export type CancelDraftTradeIntentInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  portfolioId: string;
  intentId: string;
};

export type CancelDraftTradeIntentResult = {
  intent: TradeIntentRow;
  signal: PaperSignalRecommendationRow | null;
};

/**
 * Cancels a single draft trade intent — a user-confirmed action, never
 * automatic. Only tradeIntentId is accepted; symbol, side, quantity,
 * notional, strategy, and status are never read from the client. Never runs
 * risk review, never creates a paper position, never places an order.
 */
export async function cancelDraftTradeIntent(input: CancelDraftTradeIntentInput): Promise<CancelDraftTradeIntentResult> {
  const intent = await getDraftTradeIntent(input.companyId, input.portfolioId, input.intentId);
  if (!intent) throw new DraftTradeIntentNotFoundError();
  assertCancellable(intent);

  const supabase = privileged("capital/draft-trade-intent-cancel", "cancel_draft_trade_intent_and_audit", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("cancel_draft_trade_intent_and_audit", {
    p_company_id: input.companyId,
    p_portfolio_id: input.portfolioId,
    p_trade_intent_id: input.intentId,
    p_actor: input.actor,
  });

  if (error || !data) {
    const message = error?.message ?? "";
    if (message.toLowerCase().includes("not cancellable")) throw new TradeIntentNotDraftError(intent.status);
    if (message.toLowerCase().includes("not found")) throw new DraftTradeIntentNotFoundError();
    if (message.toLowerCase().includes("already has a paper position")) throw new DraftTradeIntentHasPaperPositionError();
    throw new DraftTradeIntentCancelFailedError(message || "unknown error");
  }

  return data as CancelDraftTradeIntentResult;
}
