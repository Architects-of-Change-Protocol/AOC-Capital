#!/usr/bin/env node
/**
 * Validates the enterprise-ux domain is structurally complete.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const uxRoot = path.join(root, "src/features/enterprise-ux");

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function uxExists(relativePath) {
  return fs.existsSync(path.join(uxRoot, relativePath));
}

function fileContains(relativePath, pattern) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  return pattern.test(fs.readFileSync(fullPath, "utf-8"));
}

console.log("\n── Enterprise UX Domain Validation ──\n");

console.log("Domain structure:");
check("enterprise-ux directory exists", fs.existsSync(uxRoot));
check("types/ subdirectory exists", uxExists("types"));
check("onboarding/ subdirectory exists", uxExists("onboarding"));
check("guided-experience/ subdirectory exists", uxExists("guided-experience"));
check("empty-states/ subdirectory exists", uxExists("empty-states"));
check("demo-runtime/ subdirectory exists", uxExists("demo-runtime"));
check("first-value/ subdirectory exists", uxExists("first-value"));
check("trust/ subdirectory exists", uxExists("trust"));
check("narratives/ subdirectory exists", uxExists("narratives"));
check("workspace/ subdirectory exists", uxExists("workspace"));
check("projects/ subdirectory exists", uxExists("projects"));
check("war-room/ subdirectory exists", uxExists("war-room"));
check("connectors/ subdirectory exists", uxExists("connectors"));
check("diagnostics/ subdirectory exists", uxExists("diagnostics"));
check("hooks/ subdirectory exists", uxExists("hooks"));

console.log("\nCore runtime files:");
check("enterprise-ux-types.ts", uxExists("types/enterprise-ux-types.ts"));
check("onboarding-runtime.ts", uxExists("onboarding/onboarding-runtime.ts"));
check("onboarding-state.ts", uxExists("onboarding/onboarding-state.ts"));
check("onboarding-checklist.ts", uxExists("onboarding/onboarding-checklist.ts"));
check(
  "guided-cognition-runtime.ts",
  uxExists("guided-experience/guided-cognition-runtime.ts")
);
check(
  "guided-cognition-steps.ts",
  uxExists("guided-experience/guided-cognition-steps.ts")
);
check(
  "empty-state-intelligence.ts",
  uxExists("empty-states/empty-state-intelligence.ts")
);
check("first-value-runtime.ts", uxExists("first-value/first-value-runtime.ts"));
check(
  "executive-demo-runtime.ts",
  uxExists("demo-runtime/executive-demo-runtime.ts")
);
check(
  "demo-scenario-builder.ts",
  uxExists("demo-runtime/demo-scenario-builder.ts")
);
check("trust-building-runtime.ts", uxExists("trust/trust-building-runtime.ts"));
check(
  "workspace-bootstrap-ui.ts",
  uxExists("workspace/workspace-bootstrap-ui.ts")
);
check(
  "project-bootstrap-ui.ts",
  uxExists("projects/project-bootstrap-ui.ts")
);
check(
  "connector-onboarding-ui.ts",
  uxExists("connectors/connector-onboarding-ui.ts")
);
check(
  "first-war-room-experience.ts",
  uxExists("war-room/first-war-room-experience.ts")
);
check(
  "operational-tour-runtime.ts",
  uxExists("narratives/operational-tour-runtime.ts")
);
check(
  "enterprise-ux-diagnostics.ts",
  uxExists("diagnostics/enterprise-ux-diagnostics.ts")
);
check(
  "enterprise-ux-narratives.ts",
  uxExists("narratives/enterprise-ux-narratives.ts")
);
check("enterprise-ux-manager.ts", uxExists("enterprise-ux-manager.ts"));
check("index.ts", uxExists("index.ts"));

console.log("\nHooks:");
check(
  "use-onboarding-runtime.ts",
  uxExists("hooks/use-onboarding-runtime.ts")
);
check("use-guided-cognition.ts", uxExists("hooks/use-guided-cognition.ts"));
check(
  "use-first-value-readiness.ts",
  uxExists("hooks/use-first-value-readiness.ts")
);
check("use-executive-demo.ts", uxExists("hooks/use-executive-demo.ts"));
check("use-trust-signals.ts", uxExists("hooks/use-trust-signals.ts"));
check("use-operational-tour.ts", uxExists("hooks/use-operational-tour.ts"));

console.log("\nPhilosophy compliance:");
check(
  "Demo data is tagged SYNTHETIC_DEMO",
  fileContains(
    "src/features/enterprise-ux/demo-runtime/demo-scenario-builder.ts",
    /SYNTHETIC_DEMO/
  )
);
check(
  "Demo runtime has data disclaimer",
  fileContains(
    "src/features/enterprise-ux/demo-runtime/executive-demo-runtime.ts",
    /DATA_DISCLAIMER/
  )
);
check(
  "Narratives expose uncertainty",
  fileContains(
    "src/features/enterprise-ux/narratives/enterprise-ux-narratives.ts",
    /uncertainty/i
  )
);
check(
  "Narratives set avoidsFakeConfidence: true",
  fileContains(
    "src/features/enterprise-ux/narratives/enterprise-ux-narratives.ts",
    /avoidsFakeConfidence: true/
  )
);
check(
  "Narratives set isHonest: true",
  fileContains(
    "src/features/enterprise-ux/narratives/enterprise-ux-narratives.ts",
    /isHonest: true/
  )
);
check(
  "Trust runtime exposes governance explanations",
  fileContains(
    "src/features/enterprise-ux/trust/trust-building-runtime.ts",
    /retrieveGovernanceExplanations/
  )
);
check(
  "Connector onboarding marks isLiveOAuth: false",
  fileContains(
    "src/features/enterprise-ux/connectors/connector-onboarding-ui.ts",
    /isLiveOAuth: false/
  )
);
check(
  "Empty states use educational language",
  fileContains(
    "src/features/enterprise-ux/empty-states/empty-state-intelligence.ts",
    /operational cognition/i
  )
);
check(
  "No fake certainty: 'always accurate' absent",
  !fileContains(
    "src/features/enterprise-ux/narratives/enterprise-ux-narratives.ts",
    /always accurate/i
  )
);
check(
  "No AI hype: 'magic' absent from guided cognition",
  !fileContains(
    "src/features/enterprise-ux/guided-experience/guided-cognition-steps.ts",
    /magic/i
  )
);

console.log("\nTests and docs:");
check("enterprise-ux test file exists", exists("tests/enterprise-ux.test.mjs"));
check(
  "enterprise-ux-demo-readiness.md exists",
  exists("docs/architecture/enterprise-ux-demo-readiness.md")
);
check(
  "CURRENT_STATE_ENTERPRISE_UX.md exists",
  exists("docs/architecture/CURRENT_STATE_ENTERPRISE_UX.md")
);

console.log("\nPackage.json script:");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
check(
  "check:enterprise-ux script registered",
  !!pkg.scripts?.["check:enterprise-ux"]
);

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`);

if (failed > 0) {
  process.exit(1);
}
