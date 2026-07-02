import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { ensureCapitalLevels, getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const levels = await ensureCapitalLevels(user.companyId, portfolio);
  return NextResponse.json({ capitalLevels: levels });
}
