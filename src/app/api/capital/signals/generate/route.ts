import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { generateSignals, NoStrategySelectedError, StaleSelectedStrategyError } from "@/lib/capital/signal-engine-service";

/**
 * Generates a fresh batch of paper-only signal recommendations for the
 * caller's tenant. The request body is never read — the selected strategy,
 * supported symbols, market data, portfolio state, and Risk Constitution are
 * all derived server-side; there is no client-supplied strategyKey, symbols,
 * notional, or action to accept or ignore. Never creates a trade intent,
 * never opens a paper position, never enables real execution.
 */
export async function POST() {
  const user = await requireAuthUser();

  try {
    const result = await generateSignals({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
    });
    return NextResponse.json(
      {
        paperOnly: true,
        realExecutionLocked: true,
        signals: result.signals,
        selectedStrategy: result.selectedStrategy,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NoStrategySelectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StaleSelectedStrategyError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
