import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  'src/features/trial/contracts',
  'src/features/trial/domain',
  'src/features/trial/domain/activation-transitions.ts',
  'src/features/trial/enums',
  'src/features/trial/schemas',
  'src/features/trial/services',
  'src/features/trial/state',
  'src/features/trial/types',
  'src/features/trial/utils',
  'src/features/trial/index.ts',
  'src/features/trial/enums/trial-status.ts',
  'src/features/trial/enums/activation-stage.ts',
  'src/features/trial/enums/upgrade-readiness.ts',
];

const missing = requiredPaths.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('Trial domain foundation check failed: missing required paths:\n' + missing.map((m) => ` - ${m}`).join('\n'));
  process.exit(1);
}

const indexFile = readFileSync('src/features/trial/index.ts', 'utf8');
for (const expected of ['contracts', 'domain', 'enums', 'schemas', 'services', 'state', 'types', 'utils']) {
  if (!indexFile.includes(`./${expected}`) && !indexFile.includes(`/${expected}/`)) {
    console.error(`Trial domain foundation check failed: missing export for ${expected} in index.ts`);
    process.exit(1);
  }
}
if (!indexFile.includes('activation-transitions')) {
  console.error('Trial domain foundation check failed: missing activation-transitions export in index.ts');
  process.exit(1);
}

const trialTypes = readFileSync('src/features/trial/types/trial-types.ts', 'utf8').toLowerCase();
for (const forbidden of ['trial_days_left', 'stripe', 'price_id', 'openai', 'anthropic']) {
  if (trialTypes.includes(forbidden)) {
    console.error(`Trial domain foundation check failed: forbidden shallow/commercial/provider coupling pattern found (${forbidden}).`);
    process.exit(1);
  }
}

for (const requiredField of ['companyid', 'workspaceid', 'userid', 'status', 'activationstage', 'readiness', 'plan', 'usage', 'credits', 'lasttransition', 'lifecycleevents']) {
  if (!trialTypes.includes(requiredField)) {
    console.error(`Trial domain foundation check failed: missing TrialState field assumption: ${requiredField}`);
    process.exit(1);
  }
}

const transitions = readFileSync('src/features/trial/domain/activation-transitions.ts', 'utf8');
if (!transitions.includes('ALLOWED_ACTIVATION_TRANSITIONS') || !transitions.includes('reEntry') || !transitions.includes('recovery')) {
  console.error('Trial domain foundation check failed: activation transition architecture is not future-safe.');
  process.exit(1);
}

if (readFileSync('src/features/trial/utils/trial-utils.ts', 'utf8').includes('ACTIVATION_STAGES.indexOf')) {
  console.error('Trial domain foundation check failed: shallow linear-only activation progression assumption detected.');
  process.exit(1);
}

console.log('Trial domain foundation check passed.');
