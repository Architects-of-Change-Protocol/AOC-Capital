import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Disabled compatibility guard (PR #17 hardening). Paper positions may now
 * be closed only through the governed close review path — see
 * POST /api/capital/positions/[id]/request-close-review and
 * src/lib/capital/position-close-review-service.ts, which derives close
 * values only from the position's already-stored current valuation and
 * never refreshes market data before closing.
 *
 * This route intentionally no longer calls closePaperPosition, records no
 * market price, and never touches paper_positions or audit_ledger — it
 * exists only so a stale client still pointed at the old endpoint gets a
 * clear, safe, non-mutating error instead of closing a position at a
 * freshly-fetched price outside governed review.
 */
export async function POST(_request: Request, { params }: Params) {
  await requireAuthUser();
  await params;
  return NextResponse.json(
    { error: "Legacy paper position close is disabled. Use governed paper close review from Position Detail." },
    { status: 410 }
  );
}
