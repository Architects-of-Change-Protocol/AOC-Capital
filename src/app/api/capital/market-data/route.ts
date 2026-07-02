import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getMarketDataSnapshot } from "@/lib/trading/trade-service";
import { getMarketDataMode } from "@/lib/trading/live-price-provider";

/**
 * Read-only market data snapshot: current price per tracked symbol and
 * whether it came from the optional live public feed or the deterministic
 * simulated fallback. Every entry (and this response) is paper-only —
 * observed prices are used for paper-trading simulation only. No broker or
 * exchange account is connected, no orders can be placed, and real
 * execution remains locked. This route never places, prepares, signs, or
 * routes an order.
 */
export async function GET() {
  const user = await requireAuthUser();
  const marketData = await getMarketDataSnapshot(user.companyId);
  return NextResponse.json({
    marketDataMode: getMarketDataMode(),
    paperOnly: true,
    realExecutionLocked: true,
    marketData,
  });
}
