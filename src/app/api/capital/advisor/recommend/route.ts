import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { runAdvisorRecommendation } from "@/lib/advisor/advisor-engine";
import { classifyIntake } from "@/lib/advisor/intake";

/** Stateless preview: classifies intake and generates a recommendation. No writes. */
export async function POST(request: Request) {
  await requireAuthUser();
  const body = await request.json().catch(() => null);
  const classified = classifyIntake(body);
  if (!classified.ok) {
    return NextResponse.json({ error: classified.error }, { status: 400 });
  }

  const recommendation = runAdvisorRecommendation(classified.intake);
  return NextResponse.json({ recommendation });
}
