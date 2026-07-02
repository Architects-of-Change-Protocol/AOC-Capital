import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio, markAllOpenPositions, getPortfolioSummary } from "@/lib/trading/trade-service";

/** Portfolio-level summary: simulated equity, exposure, realized/unrealized P&L, daily/weekly loss usage, and strategy health. */
export async function GET() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  await markAllOpenPositions(user.companyId, portfolio.id);
  const summary = await getPortfolioSummary(user.companyId, portfolio);
  return NextResponse.json({ portfolioSummary: summary });
}
