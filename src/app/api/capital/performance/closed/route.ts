import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getClosedPositionPerformance } from "@/lib/capital/closed-position-performance-service";

/**
 * Read-only Closed Position Performance & Realized P&L report: realized P&L
 * summary, realized-vs-unrealized split, win/loss/flat stats, performance by
 * symbol, performance by strategy/source chain, closed position history, and
 * governance evidence. GET only — this route never reads a request body and
 * never mutates anything. See
 * src/lib/capital/closed-position-performance-service.ts for the read-only
 * aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const report = await getClosedPositionPerformance(user.companyId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("closed-position-performance: failed to build report", error);
    return NextResponse.json({ error: "closed position performance failed" }, { status: 500 });
  }
}
