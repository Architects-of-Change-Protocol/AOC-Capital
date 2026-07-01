import fs from 'node:fs';
const required = [
  'src/lib/live-federation/ingestion/live-ingestion-runtime.ts',
  'src/lib/live-federation/ingestion/event-normalizer.ts',
  'src/lib/live-federation/ingestion/realtime-signal-router.ts',
  'src/lib/live-federation/ingestion/ingress-replay-protection.ts',
  'src/lib/live-federation/ingestion/operational-pulse.ts',
  'src/lib/live-federation/ingestion/event-survivability.ts',
  'src/app/api/federation/webhooks/[connectorId]/route.ts',
  'src/app/api/federation/pulse/route.ts',
  'src/app/api/federation/events/route.ts',
  'tests/live-federation-ingestion.test.mjs'
];
const missing = required.filter((f) => !fs.existsSync(f));
if (missing.length) {
  console.error('Missing required files:\n' + missing.join('\n'));
  process.exit(1);
}
const runtime = fs.readFileSync('src/lib/live-federation/ingestion/live-ingestion-runtime.ts','utf8');
if (!runtime.includes('validateFederatedIngress') || !runtime.includes('persistOperationalIngress')) process.exit(1);
if (!runtime.includes('workspaceId')) process.exit(1);
console.log('check-live-federation-ingestion passed');
