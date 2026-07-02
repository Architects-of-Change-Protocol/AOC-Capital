import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getMarketDataSnapshot } from "@/lib/trading/trade-service";
import { isLiveMarketDataEnabled } from "@/lib/trading/live-price-provider";

/**
 * Read-only market data snapshot: current price per tracked symbol and
 * whether it came from the optional live feed or the deterministic
 * simulated fallback. Never places, prepares, or routes an order.
 */
export async function GET() {
  const user = await requireAuthUser();
  const marketData = await getMarketDataSnapshot(user.companyId);
  return NextResponse.json({ liveMarketDataEnabled: isLiveMarketDataEnabled(), marketData });
}
