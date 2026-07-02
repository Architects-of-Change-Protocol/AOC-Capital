import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio, markAllOpenPositions } from "@/lib/trading/trade-service";

/** Marks every open paper position in the caller's portfolio to a fresh simulated price. No audit event is written (bulk refresh). */
export async function POST() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const positions = await markAllOpenPositions(user.companyId, portfolio.id);
  return NextResponse.json({ paperPositions: positions });
}
