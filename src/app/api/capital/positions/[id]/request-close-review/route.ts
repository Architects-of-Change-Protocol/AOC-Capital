import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import {
  requestPaperPositionCloseReview,
  PaperPositionAlreadyClosedError,
  PaperPositionAlreadyHasCloseReviewError,
  PaperPositionMissingValuationError,
  PaperPositionNotFoundError,
  PaperPositionNotOpenError,
} from "@/lib/capital/position-close-review-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Submits one open paper position for governed close review. The request
 * body is never read — the only input is the path param id; closePrice,
 * closeNotional, realizedPnl, quantity, symbol, side, status, portfolioId,
 * and companyId can never be overridden from the client. A user-confirmed
 * action only: never automatic. If the deterministic governance checks
 * pass, the paper position is closed atomically using its already-stored
 * current valuation, and realized simulated P&L is recorded — no real
 * order is placed, no broker is connected, real execution remains locked.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);

  try {
    const result = await requestPaperPositionCloseReview({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      portfolioId: portfolio.id,
      positionId: id,
    });

    const position = result.position;
    return NextResponse.json(
      {
        position: {
          id: position.id,
          status: position.status,
          symbol: position.symbol,
          quantity: position.quantity,
          entryPriceUsd: position.entry_price_usd,
          closePriceUsd: position.close_price_usd,
          entryNotionalUsd: position.entry_notional_usd,
          closeNotionalUsd: position.close_notional_usd,
          realizedPnlUsd: position.realized_pnl_usd,
          realizedPnlPct: position.realized_pnl_pct,
          closedAt: position.closed_at,
        },
        paperOnly: true,
        realExecutionLocked: true,
        brokerConnected: false,
        liveOrderRoutingEnabled: false,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaperPositionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof PaperPositionNotOpenError ||
      error instanceof PaperPositionAlreadyClosedError ||
      error instanceof PaperPositionMissingValuationError ||
      error instanceof PaperPositionAlreadyHasCloseReviewError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("position-close-review: failed to close paper position", error);
    return NextResponse.json({ error: "Paper close review failed" }, { status: 500 });
  }
}
