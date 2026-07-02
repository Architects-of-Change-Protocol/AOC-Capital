import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { listPaperPositions } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const positions = await listPaperPositions(user.companyId);
  return NextResponse.json({ paperPositions: positions });
}
