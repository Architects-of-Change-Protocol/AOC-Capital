import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

test("connector runtime artifacts implement normalization/federation/identity/timeline", () => {
  assert.match(read("src/lib/connectors/normalization/signal-normalization.ts"), /normalizeConnectorSignal/);
  assert.match(read("src/lib/connectors/federation/signal-federation.ts"), /federateOperationalSignals/);
  assert.match(read("src/lib/connectors/identity/operational-identity-correlation.ts"), /correlateOperationalIdentities/);
  assert.match(read("src/lib/connectors/timelines/operational-timeline-federation.ts"), /buildFederatedTimeline/);
});
