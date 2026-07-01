import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { loadPortfolioOverview } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const overview = await loadPortfolioOverview(user.companyId);
  return NextResponse.json(overview);
}
