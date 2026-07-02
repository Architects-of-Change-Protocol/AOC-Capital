import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getStrategyLibrary } from "@/lib/capital/strategy-library";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "@/lib/capital/strategy-selection-service";

/**
 * Returns the full paper-only Strategy Library and, if the tenant has
 * selected one, the currently selected strategy. Read-only — never places,
 * prepares, signs, or routes an order, and never opens a paper position.
 */
export async function GET() {
  const user = await requireAuthUser();
  const [strategies, profile] = await Promise.all([
    Promise.resolve(getStrategyLibrary()),
    getSelectedStrategyProfile(user.companyId),
  ]);
  const resolved = resolveSelectedStrategy(profile);

  return NextResponse.json({
    paperOnly: true,
    realExecutionLocked: true,
    strategies,
    selectedStrategy: resolved.selectedStrategy,
    staleSelectedStrategy: resolved.staleSelectedStrategy,
    selectedStrategyProfile: profile,
  });
}
