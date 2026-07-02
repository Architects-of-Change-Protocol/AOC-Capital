import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { ensureRiskConstitution } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const rules = await ensureRiskConstitution(user.companyId);
  return NextResponse.json({ riskConstitution: rules });
}
