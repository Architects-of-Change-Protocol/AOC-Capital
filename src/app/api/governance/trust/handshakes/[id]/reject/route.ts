import { NextRequest } from "next/server";
import { rejectTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const handshake = await rejectTrustHandshake({ id, rejectorUserId: body.rejectorUserId ?? null, reason: body.reason });
  return Response.json({ status: handshake.status, rejectedAt: handshake.rejected_at });
}
