import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import {
  cancelDraftTradeIntent,
  DraftTradeIntentHasPaperPositionError,
  DraftTradeIntentNotFoundError,
  TradeIntentNotDraftError,
} from "@/lib/capital/draft-trade-intent-cancel-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Cancels one draft paper trade intent before Risk Constitution review. The
 * request body is never read — the only input is the path param id; symbol,
 * side, quantity, notional, strategy, source, status, and cancellation
 * reason can never be overridden from the client. A user-confirmed action
 * only: never automatic. Never runs risk review, never opens a paper
 * position, never places an order. Real execution remains locked either way.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);

  try {
    const result = await cancelDraftTradeIntent({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      portfolioId: portfolio.id,
      intentId: id,
    });
    return NextResponse.json({ paperOnly: true, realExecutionLocked: true, tradeIntent: result.intent }, { status: 200 });
  } catch (error) {
    if (error instanceof DraftTradeIntentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TradeIntentNotDraftError || error instanceof DraftTradeIntentHasPaperPositionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
