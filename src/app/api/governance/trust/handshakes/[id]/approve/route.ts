import { NextRequest } from "next/server";
import { approveTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const handshake = await approveTrustHandshake({ id, approverUserId: body.approverUserId ?? null });
  return Response.json({ status: handshake.status, approvedAt: handshake.approved_at });
}
