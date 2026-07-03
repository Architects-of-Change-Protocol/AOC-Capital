import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getPortfolioOverview } from "@/lib/capital/portfolio-overview-service";

/**
 * Read-only Portfolio Overview Dashboard payload: selected strategy, signal
 * pipeline, draft intent pipeline, Risk Constitution decisions, open paper
 * positions, recent activity, and a deterministic next-action recommendation.
 * GET only — this route never reads a request body and never mutates
 * anything. See src/lib/capital/portfolio-overview-service.ts for the
 * read-only aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const overview = await getPortfolioOverview(user.companyId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("portfolio-overview: failed to build overview", error);
    return NextResponse.json({ error: "overview failed" }, { status: 500 });
  }
}
