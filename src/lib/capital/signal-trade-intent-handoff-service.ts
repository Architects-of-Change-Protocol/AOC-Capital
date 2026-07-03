// AOC Capital — Signal Recommendation to Trade Intent Draft Handoff (PR #11).
//
// The only place a signal-to-draft conversion touches the database. Signals
// recommend. Humans confirm. Draft intents prepare. Risk Constitution
// decides — later, on a separate, explicit submit action that is out of
// scope for this PR.
//
// Re-reads the signal fresh from the database by id — never trusts a
// client-supplied symbol, side, quantity, or notional. Rejects a signal that
// isn't convertible before writing anything, then calls
// create_draft_trade_intent_from_signal_and_audit()
// (20260909000000_aoc_capital_signal_trade_intent_draft_handoff.sql) through
// the existing privileged, service-role write path, which inserts the draft
// trade intent, marks the signal converted, and writes the
// signal_converted_to_draft_trade_intent audit event in one transaction.
//
// This never evaluates the Level 1 risk policy engine, never opens a paper
// position, and never enables real execution: the resulting trade_intents
// row is created with status 'draft', not 'pending', so it is never picked
// up by evaluate_and_record_trade_intent().

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { privileged } from "@/lib/trading/trade-service";
import type { PaperSignalRecommendationRow, TradeIntentRow } from "@/lib/trading/database-contract";
import { PAPER_SIGNAL_RECOMMENDATION_COLUMNS } from "./signal-engine-service";

export class SignalNotFoundError extends Error {
  constructor() {
    super("Signal recommendation not found for this workspace.");
    this.name = "SignalNotFoundError";
  }
}

export class SignalAlreadyConvertedError extends Error {
  constructor() {
    super("This signal has already been converted to a draft trade intent.");
    this.name = "SignalAlreadyConvertedError";
  }
}

export class SignalNotConvertibleError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SignalNotConvertibleError";
  }
}

async function getSignalForConversion(companyId: string, portfolioId: string, signalId: string): Promise<PaperSignalRecommendationRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_signal_recommendations")
    .select(PAPER_SIGNAL_RECOMMENDATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("id", signalId)
    .maybeSingle();
  return (data ?? null) as PaperSignalRecommendationRow | null;
}

/** Same eligibility rule enforced both here (for a fast, friendly error) and inside the atomic RPC (the authoritative, race-safe copy). Only an active paper_buy_candidate with a suggested notional and an observed market price can be sized into a draft. */
function assertConvertible(signal: PaperSignalRecommendationRow): void {
  if (signal.converted_trade_intent_id) throw new SignalAlreadyConvertedError();
  if (signal.action !== "paper_buy_candidate") {
    throw new SignalNotConvertibleError(`Only paper_buy_candidate signals can be converted to a draft trade intent (this signal's action is "${signal.action}").`);
  }
  if (signal.status !== "active") {
    throw new SignalNotConvertibleError(`Only active signals can be converted to a draft trade intent (this signal's status is "${signal.status}").`);
  }
  if (signal.suggested_notional_usd === null || signal.suggested_notional_usd <= 0) {
    throw new SignalNotConvertibleError("This signal has no suggested paper notional to convert.");
  }
  if (signal.market_price_usd === null || signal.market_price_usd <= 0) {
    throw new SignalNotConvertibleError("This signal has no observed market price to size a draft trade intent from.");
  }
}

export type ConvertSignalToDraftTradeIntentInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  portfolioId: string;
  signalId: string;
};

export type ConvertSignalToDraftTradeIntentResult = {
  intent: TradeIntentRow;
  signal: PaperSignalRecommendationRow;
};

/**
 * Converts a single active paper_buy_candidate signal into a draft trade
 * intent — a user-confirmed handoff, never automatic. Side is always "buy"
 * (the only side a paper_buy_candidate can represent); quantity is derived
 * from the signal's own suggested_notional_usd and market_price_usd. Never
 * evaluates the Risk Constitution and never opens a paper position.
 */
export async function convertSignalToDraftTradeIntent(input: ConvertSignalToDraftTradeIntentInput): Promise<ConvertSignalToDraftTradeIntentResult> {
  const signal = await getSignalForConversion(input.companyId, input.portfolioId, input.signalId);
  if (!signal) throw new SignalNotFoundError();
  assertConvertible(signal);

  const supabase = privileged("capital/signal-trade-intent-handoff", "convert_signal_to_draft_trade_intent", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("create_draft_trade_intent_from_signal_and_audit", {
    p_company_id: input.companyId,
    p_portfolio_id: input.portfolioId,
    p_signal_id: input.signalId,
    p_actor: input.actor,
    p_audit_payload: {
      paper_only: true,
      real_execution_locked: true,
      portfolio_id: input.portfolioId,
      signal_id: input.signalId,
      strategy_key: signal.strategy_key,
      strategy_name: signal.strategy_name,
      symbol: signal.symbol,
      suggested_notional_usd: signal.suggested_notional_usd,
      market_price_usd: signal.market_price_usd,
      draft_status: "draft",
    },
  });

  if (error || !data) {
    const message = error?.message ?? "";
    if (message.toLowerCase().includes("already converted")) throw new SignalAlreadyConvertedError();
    if (message.toLowerCase().includes("not convertible")) throw new SignalNotConvertibleError(message);
    throw new Error(`Unable to convert signal to a draft trade intent: ${message || "unknown error"}`);
  }

  return data as ConvertSignalToDraftTradeIntentResult;
}
