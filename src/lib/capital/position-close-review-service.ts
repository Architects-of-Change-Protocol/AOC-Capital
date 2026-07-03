// AOC Capital — Governed Paper Close Position Review (PR #17).
//
// The only place a governed paper close review touches the database. Paper
// positions may be closed only through this explicit, user-confirmed,
// atomic, audited path — never automatically, never from a client-supplied
// close price/notional/realized P&L/quantity/symbol/status override.
//
// Accepts only a positionId — there is no client-suppliable closePrice,
// closeNotional, realizedPnl, quantity, symbol, side, status, portfolioId,
// companyId, broker, exchange, orderId, or accountId for this flow to trust.
// Re-reads the open paper position fresh from the database by id (scoped by
// company_id + portfolio_id), rejects anything ineligible before writing
// anything, then calls close_paper_position_with_review_and_audit()
// (20260913000000_aoc_capital_governed_close_position_review.sql) through
// the existing privileged, service-role write path, which locks the
// position row, re-validates tenant/portfolio/status/valuation, rejects a
// duplicate approved close review, derives the close price/notional/
// realized P&L server-side from the position's already-stored current
// valuation (never a freshly-fetched market price), inserts the close
// review record, updates the position to closed, and writes both governance
// audit events — all in one transaction.
//
// This never marks a position to market, never refreshes valuation, never
// generates a signal, never creates/submits/cancels a draft trade intent,
// never calls evaluate_and_record_trade_intent, never calls a broker/
// exchange/order-routing API (none exists in this schema), and never
// inserts/updates paper_positions or audit_ledger directly outside the
// atomic RPC. Real execution remains locked either way.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { privileged } from "@/lib/trading/trade-service";
import type { PaperPositionCloseReviewRow, PaperPositionRow } from "@/lib/trading/database-contract";

export class PaperPositionNotFoundError extends Error {
  constructor() {
    super("Paper position not found.");
    this.name = "PaperPositionNotFoundError";
  }
}

export class PaperPositionNotOpenError extends Error {
  constructor() {
    super("Only open paper positions can be submitted for close review.");
    this.name = "PaperPositionNotOpenError";
  }
}

export class PaperPositionAlreadyClosedError extends Error {
  constructor() {
    super("Paper position already closed.");
    this.name = "PaperPositionAlreadyClosedError";
  }
}

export class PaperPositionMissingValuationError extends Error {
  constructor() {
    super("Paper position requires stored valuation before close review.");
    this.name = "PaperPositionMissingValuationError";
  }
}

export class PaperPositionAlreadyHasCloseReviewError extends Error {
  constructor() {
    super("Paper position already has an approved close review.");
    this.name = "PaperPositionAlreadyHasCloseReviewError";
  }
}

export class PaperPositionCloseReviewFailedError extends Error {
  constructor(message: string) {
    super(`Paper close review failed: ${message}`);
    this.name = "PaperPositionCloseReviewFailedError";
  }
}

const PAPER_POSITION_COLUMNS =
  "id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price_usd,entry_notional_usd,current_price_usd,current_notional_usd,unrealized_pnl_usd,unrealized_pnl_pct,realized_pnl_usd,realized_pnl_pct,status,opened_at,closed_at,closed_by,close_price_usd,close_notional_usd,close_reason,close_review_id,last_marked_at,created_at,updated_at";

async function getPaperPositionForReview(companyId: string, portfolioId: string, positionId: string): Promise<PaperPositionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("id", positionId)
    .maybeSingle();
  return (data ?? null) as PaperPositionRow | null;
}

/**
 * Same eligibility rule enforced both here (for a fast, friendly error) and
 * inside the atomic RPC (the authoritative, race-safe copy). Only an open
 * paper position with a full stored valuation can be submitted for close
 * review.
 */
function assertEligibleForCloseReview(position: PaperPositionRow): void {
  if (position.status === "closed") throw new PaperPositionAlreadyClosedError();
  if (position.status !== "open") throw new PaperPositionNotOpenError();
  if (position.current_price_usd === null || position.current_notional_usd === null) throw new PaperPositionMissingValuationError();
  if (position.entry_notional_usd === null) throw new PaperPositionMissingValuationError();
  if (position.quantity === null || !(position.quantity > 0)) throw new PaperPositionMissingValuationError();
}

export type RequestPaperPositionCloseReviewInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  portfolioId: string;
  positionId: string;
};

export type RequestPaperPositionCloseReviewResult = {
  position: PaperPositionRow;
  closeReview: PaperPositionCloseReviewRow | null;
  paperOnly: true;
  realExecutionLocked: true;
  brokerConnected: false;
  liveOrderRoutingEnabled: false;
};

/**
 * Submits a single open paper position for governed close review — a
 * user-confirmed action, never automatic. Only positionId is accepted;
 * closePrice, closeNotional, realizedPnl, quantity, symbol, side, status,
 * portfolioId, and companyId are never read from the client. Close values
 * are always derived server-side from the position's already-stored current
 * valuation. Never runs mark-to-market, never opens a position, never places
 * an order.
 */
export async function requestPaperPositionCloseReview(input: RequestPaperPositionCloseReviewInput): Promise<RequestPaperPositionCloseReviewResult> {
  const position = await getPaperPositionForReview(input.companyId, input.portfolioId, input.positionId);
  if (!position) throw new PaperPositionNotFoundError();
  assertEligibleForCloseReview(position);

  const supabase = privileged("capital/position-close-review", "close_paper_position_with_review_and_audit", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("close_paper_position_with_review_and_audit", {
    p_company_id: input.companyId,
    p_portfolio_id: input.portfolioId,
    p_paper_position_id: input.positionId,
    p_actor: input.actor,
  });

  if (error || !data) {
    const message = (error?.message ?? "").toLowerCase();
    if (message.includes("not found")) throw new PaperPositionNotFoundError();
    if (message.includes("already closed")) throw new PaperPositionAlreadyClosedError();
    if (message.includes("only open paper positions")) throw new PaperPositionNotOpenError();
    if (message.includes("already has an approved close review")) throw new PaperPositionAlreadyHasCloseReviewError();
    if (message.includes("requires stored valuation")) throw new PaperPositionMissingValuationError();
    throw new PaperPositionCloseReviewFailedError(error?.message ?? "unknown error");
  }

  const result = data as { position: PaperPositionRow; closeReview: PaperPositionCloseReviewRow };

  return {
    position: result.position,
    closeReview: result.closeReview ?? null,
    paperOnly: true,
    realExecutionLocked: true,
    brokerConnected: false,
    liveOrderRoutingEnabled: false,
  };
}
