import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getPortfolioGovernanceSnapshot } from "@/lib/capital/portfolio-governance-snapshot-service";

/**
 * Read-only Portfolio Governance Snapshot: executive governance summary,
 * paper-only boundary evidence, lifecycle/source-chain/audit completeness,
 * open exposure posture, simulated P&L, strategy/signal health, governance
 * gaps, and MVP integration review readiness. GET only — this route never
 * reads a request body and never mutates anything. See
 * src/lib/capital/portfolio-governance-snapshot-service.ts for the
 * read-only aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const report = await getPortfolioGovernanceSnapshot(user.companyId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("portfolio-governance-snapshot: failed to build report", error);
    return NextResponse.json({ error: "portfolio governance snapshot failed" }, { status: 500 });
  }
}
