import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { listAuditLedger } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const events = await listAuditLedger(user.companyId);
  return NextResponse.json({ auditLedger: events });
}
