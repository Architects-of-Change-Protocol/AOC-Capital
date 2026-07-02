import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { selectStrategy, UnknownStrategyKeyError } from "@/lib/capital/strategy-selection-service";

/**
 * Selects a paper-only strategy for the caller's tenant. Only strategyKey is
 * read from the request body — any other client-supplied field (name, risk
 * profile, symbols, capabilities) is ignored; the full strategy config is
 * always re-derived server-side from the static Strategy Library. Never
 * creates a trade intent, never opens a paper position, and never enables
 * real execution.
 */
export async function POST(request: Request) {
  const user = await requireAuthUser();
  const body = await request.json().catch(() => null);
  const strategyKey = body && typeof body === "object" ? (body as Record<string, unknown>).strategyKey : undefined;

  try {
    const result = await selectStrategy({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      strategyKey,
    });
    return NextResponse.json(
      {
        paperOnly: true,
        realExecutionLocked: true,
        strategy: result.strategy,
        profile: result.profile,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnknownStrategyKeyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
