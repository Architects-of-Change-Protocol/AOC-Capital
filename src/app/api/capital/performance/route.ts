import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio, markAllOpenPositions, getStrategyPerformance } from "@/lib/trading/trade-service";

/**
 * Strategy Performance Review: win rate, average win/loss, profit factor,
 * drawdown, and an advisor recommendation (continue/reduce_risk/pause/
 * review_required/not_ready_for_real_execution). Paper-only analytics;
 * refreshes simulated paper marks before calculation and never unlocks
 * real execution.
 */
export async function GET() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  await markAllOpenPositions(user.companyId, portfolio.id);
  const strategyPerformance = await getStrategyPerformance(user.companyId, portfolio);
  return NextResponse.json({ strategyPerformance });
}
