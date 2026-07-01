import { NextResponse } from "next/server";
import { listIngressEvents } from "@/lib/live-federation/ingestion/live-ingestion-runtime";
import { computeOperationalPulse, detectPulseAnomalies, evaluatePulseHealth } from "@/lib/live-federation/ingestion/operational-pulse";
import { evaluateEventSurvivability } from "@/lib/live-federation/ingestion/event-survivability";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const events = listIngressEvents(workspaceId);
  const pulse = computeOperationalPulse(events);
  return NextResponse.json({
    workspaceId,
    connectorHealth: pulse.connectorLiveness,
    pulseStatus: evaluatePulseHealth(pulse),
    freshness: pulse.freshness,
    ingestionSurvivability: evaluateEventSurvivability(events),
    federationDrift: pulse.signalDrift,
    anomalies: detectPulseAnomalies(pulse),
  });
}
