import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { classifyIntake } from "@/lib/advisor/intake";
import { confirmAdvisorRecommendation } from "@/lib/advisor/advisor-write-service";

/**
 * Confirmation write path: re-classifies and re-derives the recommendation from
 * the raw intake server-side (never trusts a client-supplied recommendation),
 * then creates/updates the user's AOC Capital portfolio, applies the generated
 * risk constitution, and writes the audit ledger events.
 */
export async function POST(request: Request) {
  const user = await requireAuthUser();
  const body = await request.json().catch(() => null);
  const classified = classifyIntake(body);
  if (!classified.ok) {
    return NextResponse.json({ error: classified.error }, { status: 400 });
  }

  const result = await confirmAdvisorRecommendation({
    companyId: user.companyId,
    actorUserId: user.id,
    actor: user.email,
    intake: classified.intake,
  });

  return NextResponse.json(result, { status: 201 });
}
