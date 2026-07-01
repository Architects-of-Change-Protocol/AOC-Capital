import fs from "node:fs";
const required = [
  "src/lib/connectors/runtime/connector-runtime.ts",
  "src/lib/connectors/normalization/signal-normalization.ts",
  "src/lib/connectors/federation/signal-federation.ts",
  "src/lib/connectors/replay/connector-replay.ts",
  "src/lib/connectors/diagnostics/connector-diagnostics.ts",
  "src/lib/connectors/governance/connector-governance.ts",
  "src/lib/connectors/operational-source-lineage.ts",
  "src/lib/connectors/identity/operational-identity-correlation.ts",
  "tests/connectors-runtime.test.mjs"
];
const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) { console.error("Missing external connector runtime artifacts:\n" + missing.join("\n")); process.exit(1); }
console.log("External connector runtime validation passed.");
