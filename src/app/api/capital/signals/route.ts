import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "@/lib/capital/strategy-selection-service";
import { listSignalRecommendations } from "@/lib/capital/signal-engine-service";

/**
 * Returns the latest paper-only signal recommendations for the caller's
 * default portfolio, plus the currently selected (or stale) strategy.
 * Read-only — never generates a new signal batch and never writes an audit
 * event. See POST /api/capital/signals/generate for the governed write path.
 */
export async function GET() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const profile = await getSelectedStrategyProfile(user.companyId);
  const resolved = resolveSelectedStrategy(profile);
  const signals = await listSignalRecommendations(user.companyId, portfolio.id);

  return NextResponse.json({
    signals,
    selectedStrategy: resolved.selectedStrategy,
    staleSelectedStrategy: resolved.staleSelectedStrategy,
    paperOnly: true,
    realExecutionLocked: true,
  });
}
