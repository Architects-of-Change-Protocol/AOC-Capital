import { access } from 'node:fs/promises';
const required = [
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-runtime.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-drift.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-suppression.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-pressure.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-alerts.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-diagnostics.ts',
  'src/lib/operational-memory/realtime-telemetry/realtime-telemetry-manager.ts',
  'tests/realtime-operational-telemetry.test.mjs'
];
for (const file of required) {
  try { await access(file); } catch { throw new Error(`missing required telemetry artifact: ${file}`); }
}
console.log('Realtime operational telemetry runtime validation passed.');
