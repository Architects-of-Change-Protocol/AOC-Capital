import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { listMarketSignals } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const signals = await listMarketSignals(user.companyId);
  return NextResponse.json({ marketSignals: signals });
}
