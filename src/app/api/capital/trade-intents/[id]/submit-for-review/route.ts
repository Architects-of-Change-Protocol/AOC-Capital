import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import {
  submitDraftTradeIntentForReview,
  TradeIntentNotDraftError,
  TradeIntentNotFoundError,
} from "@/lib/capital/draft-trade-intent-review-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Submits one draft paper trade intent for Level 1 Risk Constitution review.
 * The request body is never read — symbol, side, quantity, notional, and
 * leverage are always re-derived server-side from the draft itself, never
 * from the client. A user-confirmed action only: never automatic, never run
 * as part of draft creation. Approval opens a paper position; rejection does
 * not. Real execution remains locked either way.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);

  try {
    const result = await submitDraftTradeIntentForReview({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      portfolioId: portfolio.id,
      intentId: id,
    });
    return NextResponse.json(
      { paperOnly: true, realExecutionLocked: true, intent: result.intent, decision: result.decision, position: result.position },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof TradeIntentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TradeIntentNotDraftError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
