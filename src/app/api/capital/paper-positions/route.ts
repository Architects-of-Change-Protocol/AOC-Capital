import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { listPaperPositionsMarked } from "@/lib/trading/trade-service";

/** Returns open and closed paper positions; open positions are refreshed to a fresh simulated price first. */
export async function GET() {
  const user = await requireAuthUser();
  const positions = await listPaperPositionsMarked(user.companyId);
  return NextResponse.json({ paperPositions: positions });
}
