// AOC Capital — Submit Draft Intent for Risk Constitution Review (PR #12).
//
// The only place a draft-submission touches the database. Signals recommend.
// Humans create drafts. Humans submit drafts. Risk Constitution decides.
// Paper simulation follows governed approval. Real execution remains locked.
//
// Re-reads the trade intent fresh from the database by id — never trusts a
// client-supplied symbol/side/quantity/notional/leverage; those were already
// fixed server-side when the draft was created (see
// signal-trade-intent-handoff-service.ts) and this flow never lets them be
// overridden. Rejects an intent that isn't a submittable draft before writing
// anything, then calls submit_draft_trade_intent_for_review()
// (20260910000000_aoc_capital_submit_draft_trade_intent_for_review.sql)
// through the existing privileged, service-role write path, which records the
// submission, runs the Level 1 risk policy engine, records the decision, and
// — only if approved — opens the resulting paper position, all in one
// transaction.
//
// This is a separate, explicit user-confirmed action from draft creation: the
// system never automatically submits a draft, and never submits a draft
// immediately upon signal conversion.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { privileged } from "@/lib/trading/trade-service";
import type { PaperPositionRow, TradeDecisionRow, TradeIntentRow } from "@/lib/trading/database-contract";

export class TradeIntentNotFoundError extends Error {
  constructor() {
    super("Trade intent not found for this workspace.");
    this.name = "TradeIntentNotFoundError";
  }
}

export class TradeIntentNotDraftError extends Error {
  constructor(status: string) {
    super(`Only a draft trade intent can be submitted for Risk Constitution review (this trade intent's status is "${status}").`);
    this.name = "TradeIntentNotDraftError";
  }
}

const TRADE_INTENT_COLUMNS =
  "id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at";

async function getTradeIntentForSubmission(companyId: string, portfolioId: string, intentId: string): Promise<TradeIntentRow | null> {
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

/** Same eligibility rule enforced both here (for a fast, friendly error) and inside the atomic RPC (the authoritative, race-safe copy). Only a draft can be submitted. */
function assertSubmittable(intent: TradeIntentRow): void {
  if (intent.status !== "draft") throw new TradeIntentNotDraftError(intent.status);
}

export type SubmitDraftTradeIntentForReviewInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  portfolioId: string;
  intentId: string;
};

export type SubmitDraftTradeIntentForReviewResult = {
  intent: TradeIntentRow;
  decision: TradeDecisionRow;
  position: PaperPositionRow | null;
};

/**
 * Submits a single draft trade intent for Level 1 Risk Constitution review —
 * a user-confirmed action, never automatic. Symbol, side, quantity, notional,
 * and leverage are never overridden here: the risk engine evaluates exactly
 * what was fixed on the draft at creation time. Only an approved verdict
 * opens a paper position; a rejected verdict leaves the trade intent
 * evaluated but with no paper position.
 */
export async function submitDraftTradeIntentForReview(input: SubmitDraftTradeIntentForReviewInput): Promise<SubmitDraftTradeIntentForReviewResult> {
  const intent = await getTradeIntentForSubmission(input.companyId, input.portfolioId, input.intentId);
  if (!intent) throw new TradeIntentNotFoundError();
  assertSubmittable(intent);

  const supabase = privileged("capital/draft-trade-intent-review", "submit_draft_trade_intent_for_review", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("submit_draft_trade_intent_for_review", {
    p_company_id: input.companyId,
    p_portfolio_id: input.portfolioId,
    p_intent_id: input.intentId,
    p_actor: input.actor,
  });

  if (error || !data) {
    const message = error?.message ?? "";
    if (message.toLowerCase().includes("not submittable")) throw new TradeIntentNotDraftError(intent.status);
    if (message.toLowerCase().includes("not found")) throw new TradeIntentNotFoundError();
    throw new Error(`Unable to submit draft trade intent for review: ${message || "unknown error"}`);
  }

  return data as SubmitDraftTradeIntentForReviewResult;
}
