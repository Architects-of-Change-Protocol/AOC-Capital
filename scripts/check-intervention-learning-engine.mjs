import { access } from 'node:fs/promises';
const required = [
  'src/lib/operational-memory/intervention-learning/index.ts',
  'src/lib/operational-memory/intervention-learning/intervention-learning-engine.ts',
  'src/lib/operational-memory/intervention-learning/intervention-learning-manager.ts',
  'src/lib/operational-memory/intervention-learning/intervention-learning-types.ts',
  'tests/intervention-learning-engine.test.mjs'
];
for (const file of required) {
  await access(file).catch(() => { throw new Error(`Missing required intervention-learning asset: ${file}`); });
}
console.log('intervention-learning-engine check passed');
