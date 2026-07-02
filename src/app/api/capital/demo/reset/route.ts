import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { resetDemoScenario } from "@/lib/demo/demo-write-service";

/**
 * Resets the AOC Capital Demo Strategy Sandbox scenario for the caller's
 * company: deletes only the trade intents (and, via cascade, their trade
 * decisions and paper positions) and audit ledger rows recorded in the
 * loaded scenario's manifest — tenant-scoped, and never touches non-demo
 * data. A no-op (200, reset: false) if the demo was never loaded or its
 * marker's payload doesn't parse as a valid manifest.
 */
export async function POST() {
  const user = await requireAuthUser();
  const result = await resetDemoScenario({ companyId: user.companyId, actorUserId: user.id, actor: user.email });
  return NextResponse.json(result, { status: 200 });
}
