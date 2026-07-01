import { detectOperationalDeltas } from "./realtime-telemetry-drift";
import { ingestTelemetrySignals } from "./realtime-telemetry-ingestion";
import { evaluateTelemetrySignificance } from "./realtime-telemetry-significance";
import { suppressTelemetryNoise } from "./realtime-telemetry-suppression";
import { buildEscalationTelemetry } from "./realtime-telemetry-escalation";
import { buildOverloadTelemetry } from "./realtime-telemetry-overload";
import { buildSurvivabilityTelemetry } from "./realtime-telemetry-survivability";
import { buildPropagationTelemetry } from "./realtime-telemetry-propagation";
import { buildStabilizationTelemetry } from "./realtime-telemetry-stabilization";
import { buildTopologyDriftTelemetry } from "./realtime-telemetry-topology";
import { buildOperationalPulse } from "./realtime-telemetry-pressure";
import { buildRealtimeAlerts } from "./realtime-telemetry-alerts";
import { buildRealtimeNarratives } from "./realtime-telemetry-narratives";
import { buildWarRoomTelemetry } from "./realtime-telemetry-warroom";
import { buildTelemetryDiagnostics } from "./realtime-telemetry-diagnostics";
import type { RealtimeTelemetryRequest, RealtimeTelemetryResult } from "./realtime-telemetry-types";

export const runRealtimeTelemetryRuntime = (request: RealtimeTelemetryRequest): RealtimeTelemetryResult => {
  const ingested = ingestTelemetrySignals(request.signals);
  const deltas = detectOperationalDeltas(ingested, request.previous?.deltas ?? []);
  const significant = evaluateTelemetrySignificance(deltas);
  const suppression = suppressTelemetryNoise(significant);
  const retained = significant.filter((delta) => suppression.retainedIds.includes(delta.metric));
  const survivability = buildSurvivabilityTelemetry(retained);
  const escalation = buildEscalationTelemetry(retained);
  const overload = buildOverloadTelemetry(retained);
  const propagation = buildPropagationTelemetry(retained);
  const stabilization = buildStabilizationTelemetry(retained);
  const topology = buildTopologyDriftTelemetry(retained);
  const pulse = buildOperationalPulse({ survivability, overload, escalation, stabilization });
  const alerts = buildRealtimeAlerts({ survivability, escalation, overload, propagation, pulse });
  return {
    heartbeat: { timestamp: request.now ?? new Date().toISOString(), cadenceSeconds: 60, signalCount: ingested.length, evidence: ["realtime-ingestion"], confidence: 0.8, uncertainty: ["cadence-bound"], causalityRationale: ["heartbeat follows processed signal volume"], significanceRationale: ["runtime continuity"], governanceBoundaries: ["tenant/workspace scoped"] },
    deltas: retained,
    driftSignals: [survivability, topology],
    survivability,
    escalation,
    overload,
    propagation,
    stabilization,
    topology,
    pulse,
    warRoom: buildWarRoomTelemetry({ survivability, escalation, overload, topology }),
    narratives: buildRealtimeNarratives({ survivability, escalation, overload, propagation, stabilization }),
    alerts,
    diagnostics: buildTelemetryDiagnostics({ deltas: retained, suppression, alerts }),
    suppression,
  };
};
