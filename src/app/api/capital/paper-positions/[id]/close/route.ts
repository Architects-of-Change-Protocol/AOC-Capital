import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { closePaperPosition, PaperPositionNotFoundError, PaperPositionNotOpenError } from "@/lib/trading/trade-service";
import { parseClosePositionRequest } from "@/lib/trading/close-position-request";

type Params = { params: Promise<{ id: string }> };

/**
 * Closes a single open paper position. The close price and realized P&L are
 * always calculated server-side; the client may only supply closeReason, and
 * only from a fixed enum (see parseClosePositionRequest). Paper-only — no
 * real exchange execution is involved.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = parseClosePositionRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const position = await closePaperPosition({
      companyId: user.companyId,
      positionId: id,
      actor: user.email,
      actorUserId: user.id,
      closeReason: parsed.request.closeReason,
    });
    return NextResponse.json({ paperPosition: position });
  } catch (error) {
    if (error instanceof PaperPositionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PaperPositionNotOpenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
