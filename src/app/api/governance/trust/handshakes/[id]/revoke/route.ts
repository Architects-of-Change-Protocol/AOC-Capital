import { NextRequest } from "next/server";
import { revokeTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const handshake = await revokeTrustHandshake({ id, revokerUserId: body.revokerUserId ?? null, reason: body.reason });
  return Response.json({ status: handshake.status, revokedAt: handshake.revoked_at });
}
