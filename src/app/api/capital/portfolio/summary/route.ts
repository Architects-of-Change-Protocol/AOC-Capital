import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getPortfolioSummary } from "@/lib/trading/trade-service";

/**
 * Portfolio-level summary: simulated equity, exposure, realized/unrealized
 * P&L, daily/weekly loss usage, and strategy health. Read-only over the
 * current stored mark-to-market state; it never refreshes valuation itself.
 */
export async function GET() {
  const user = await requireAuthUser();
  const summary = await getPortfolioSummary(user.companyId);
  return NextResponse.json({ portfolioSummary: summary });
}
