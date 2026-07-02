import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { loadDemoScenario } from "@/lib/demo/demo-write-service";

/**
 * Loads the AOC Capital Demo Strategy Sandbox scenario for the caller's
 * company: an advisor-confirmed strategy, a scripted sequence of governed
 * trade intents (approved and one intentionally rejected), a winning close, a
 * losing close, and two positions left open for live mark-to-market.
 * Idempotent — a second call is a no-op once the scenario has been loaded.
 */
export async function POST() {
  const user = await requireAuthUser();
  const result = await loadDemoScenario({ companyId: user.companyId, actorUserId: user.id, actor: user.email });
  return NextResponse.json(result, { status: result.alreadyLoaded ? 200 : 201 });
}
