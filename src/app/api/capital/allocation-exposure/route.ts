import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getAllocationExposureOverview } from "@/lib/capital/allocation-exposure-service";

/**
 * Read-only Allocation & Exposure payload: exposure by symbol, position
 * contribution, concentration status, cash vs invested simulation, P&L
 * contribution, and deterministic exposure notes. GET only — this route
 * never reads a request body and never mutates anything. See
 * src/lib/capital/allocation-exposure-service.ts for the read-only
 * aggregation.
 */
export async function GET() {
  const user = await requireAuthUser();
  try {
    const overview = await getAllocationExposureOverview(user.companyId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("allocation-exposure: failed to build overview", error);
    return NextResponse.json({ error: "allocation overview failed" }, { status: 500 });
  }
}
