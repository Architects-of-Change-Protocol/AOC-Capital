import { NextResponse } from "next/server";
import { listIngressEvents } from "@/lib/live-federation/ingestion/live-ingestion-runtime";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  return NextResponse.json({ workspaceId, events: listIngressEvents(workspaceId) });
}
