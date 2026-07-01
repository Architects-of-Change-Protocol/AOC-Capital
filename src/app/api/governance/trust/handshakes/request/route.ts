import { requestTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request) {
  const body = await request.json();
  const { handshake, token } = await requestTrustHandshake({ verifierName: body.verifierName, verifierWorkspaceId: body.verifierWorkspaceId ?? null, verifierDomain: body.verifierDomain ?? null, requestedTrustDomain: body.requestedTrustDomain, requestedActions: body.requestedActions ?? null, requestedResourceTypes: body.requestedResourceTypes ?? null, expiresAt: body.expiresAt, metadata: body.metadata ?? {} });
  return Response.json({ handshakeId: handshake.id, status: handshake.status, expiresAt: handshake.expires_at, handshakeToken: token });
}
