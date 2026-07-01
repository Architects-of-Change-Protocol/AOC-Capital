import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('runtime exposes telemetry retrieval APIs', async () => {
  const manager = await read('src/lib/operational-memory/realtime-telemetry/realtime-telemetry-manager.ts');
  for (const fn of ['retrieveRealtimeTelemetry','retrieveOperationalDeltas','retrieveOperationalPulse','retrieveDriftSignals','retrieveSurvivabilityTelemetry','retrieveEscalationTelemetry','retrievePMOverloadTelemetry','retrievePropagationTelemetry','retrieveTopologyDrift','retrieveRealtimeWarRoomState','retrieveRealtimeNarratives','retrieveRealtimeAlerts']) {
    assert.match(manager, new RegExp(`export const ${fn}`));
  }
});

test('runtime has deterministic anti-noise and drift modules', async () => {
  const drift = await read('src/lib/operational-memory/realtime-telemetry/realtime-telemetry-drift.ts');
  const suppression = await read('src/lib/operational-memory/realtime-telemetry/realtime-telemetry-suppression.ts');
  assert.match(drift, /detectOperationalDeltas/);
  assert.match(suppression, /suppressTelemetryNoise/);
});
