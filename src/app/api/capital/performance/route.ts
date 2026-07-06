import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getStrategyPerformance } from "@/lib/trading/trade-service";

/**
 * Strategy Performance Review: win rate, average win/loss, profit factor,
 * drawdown, and an advisor recommendation (continue/reduce_risk/pause/
 * review_required/not_ready_for_real_execution). Paper-only, read-only
 * analytics over the current stored mark-to-market state; it never
 * refreshes valuation itself and never unlocks real execution.
 */
export async function GET() {
  const user = await requireAuthUser();
  const strategyPerformance = await getStrategyPerformance(user.companyId);
  return NextResponse.json({ strategyPerformance });
}
