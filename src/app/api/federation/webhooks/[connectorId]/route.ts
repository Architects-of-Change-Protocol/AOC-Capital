import { NextRequest, NextResponse } from "next/server";
import { ingestFederatedEvent } from "@/lib/live-federation/ingestion/live-ingestion-runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ connectorId: string }> }) {
  const { connectorId } = await params;
  const body = await request.json();
  const workspaceId = String(body.workspaceId ?? request.headers.get("x-workspace-id") ?? "");
  const sourceSystem = String(body.sourceSystem ?? "custom") as "jira" | "slack" | "github" | "calendar" | "notion" | "custom";
  const nonce = String(body.nonce ?? request.headers.get("x-ingress-nonce") ?? "");
  if (!workspaceId || !nonce) {
    return NextResponse.json({ ok: false, error: "missing workspaceId or nonce" }, { status: 400 });
  }
  try {
    const result = ingestFederatedEvent({
      workspaceId,
      connectorId,
      sourceSystem,
      federationAuthorized: request.headers.get("authorization")?.startsWith("Bearer ") ?? false,
      nonce,
      payload: body.payload ?? body,
    });
    return NextResponse.json({ ok: true, receipt: result.event.lineage.ingressId, routes: result.routes.map((r) => r.target) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ingestion failed" }, { status: 409 });
  }
}
