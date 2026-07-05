import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getStrategyPerformanceAttribution } from "@/lib/capital/strategy-performance-attribution-service";

/**
 * Read-only Strategy-Level Performance Attribution report: lifecycle funnel,
 * realized/unrealized P&L, win/loss/flat outcomes, and governance/source-chain
 * completeness, all grouped by traceable strategy source chain. GET only —
 * this route never reads a request body and never mutates anything. See
 * src/lib/capital/strategy-performance-attribution-service.ts for the
 * read-only aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const report = await getStrategyPerformanceAttribution(user.companyId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("strategy-performance-attribution: failed to build report", error);
    return NextResponse.json({ error: "strategy performance attribution failed" }, { status: 500 });
  }
}
