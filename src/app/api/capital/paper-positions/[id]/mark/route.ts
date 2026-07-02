import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { markPositionToMarket, PaperPositionNotFoundError, PaperPositionNotOpenError } from "@/lib/trading/trade-service";

type Params = { params: Promise<{ id: string }> };

/** Marks a single paper position to a fresh simulated price. Server-side only; writes a position_marked_to_market audit event. */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;

  try {
    const position = await markPositionToMarket(user.companyId, id, user.email, user.id, { audit: true });
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
