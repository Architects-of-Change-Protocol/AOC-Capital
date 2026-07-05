import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getSignalCohortOutcomes } from "@/lib/capital/signal-cohort-outcome-service";

/**
 * Read-only Signal Cohort Outcome Tracking report: signal lifecycle funnel,
 * cohort conversion/review/position outcomes, realized/unrealized simulated
 * P&L, and governance/source-chain completeness, all grouped by signal
 * cohort. GET only — this route never reads a request body and never
 * mutates anything. See
 * src/lib/capital/signal-cohort-outcome-service.ts for the read-only
 * aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const report = await getSignalCohortOutcomes(user.companyId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("signal-cohort-outcome-tracking: failed to build report", error);
    return NextResponse.json({ error: "signal cohort outcome tracking failed" }, { status: 500 });
  }
}
