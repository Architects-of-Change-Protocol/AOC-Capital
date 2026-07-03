import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import {
  convertSignalToDraftTradeIntent,
  SignalAlreadyConvertedError,
  SignalNotConvertibleError,
  SignalNotFoundError,
} from "@/lib/capital/signal-trade-intent-handoff-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Converts one paper-only signal recommendation into a draft paper trade
 * intent. The request body is never read — symbol, side, quantity, and
 * notional are always re-derived server-side from the signal itself, never
 * from the client. A user-confirmed handoff only: never automatic, never
 * evaluates the Risk Constitution, never opens a paper position, never
 * enables real execution.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);

  try {
    const result = await convertSignalToDraftTradeIntent({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      portfolioId: portfolio.id,
      signalId: id,
    });
    return NextResponse.json(
      { paperOnly: true, realExecutionLocked: true, intent: result.intent, signal: result.signal },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SignalNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof SignalAlreadyConvertedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof SignalNotConvertibleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
