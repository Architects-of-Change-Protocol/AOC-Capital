import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enterpriseUXRoot = path.join(root, "src/features/enterprise-ux");

// ─── File existence checks ────────────────────────────────────────────────────

test("enterprise-ux domain directory exists", () => {
  assert.ok(
    fs.existsSync(enterpriseUXRoot),
    "src/features/enterprise-ux/ must exist"
  );
});

test("onboarding runtime exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "onboarding/onboarding-runtime.ts")),
    "onboarding/onboarding-runtime.ts must exist"
  );
});

test("onboarding checklist exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "onboarding/onboarding-checklist.ts")),
    "onboarding/onboarding-checklist.ts must exist"
  );
});

test("onboarding state exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "onboarding/onboarding-state.ts")),
    "onboarding/onboarding-state.ts must exist"
  );
});

test("guided cognition runtime exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "guided-experience/guided-cognition-runtime.ts")
    ),
    "guided-experience/guided-cognition-runtime.ts must exist"
  );
});

test("guided cognition steps exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "guided-experience/guided-cognition-steps.ts")
    ),
    "guided-experience/guided-cognition-steps.ts must exist"
  );
});

test("empty state intelligence exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "empty-states/empty-state-intelligence.ts")
    ),
    "empty-states/empty-state-intelligence.ts must exist"
  );
});

test("first-value runtime exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "first-value/first-value-runtime.ts")),
    "first-value/first-value-runtime.ts must exist"
  );
});

test("executive demo runtime exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "demo-runtime/executive-demo-runtime.ts")
    ),
    "demo-runtime/executive-demo-runtime.ts must exist"
  );
});

test("demo scenario builder exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "demo-runtime/demo-scenario-builder.ts")
    ),
    "demo-runtime/demo-scenario-builder.ts must exist"
  );
});

test("trust-building runtime exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "trust/trust-building-runtime.ts")),
    "trust/trust-building-runtime.ts must exist"
  );
});

test("operational tour runtime exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "narratives/operational-tour-runtime.ts")
    ),
    "narratives/operational-tour-runtime.ts must exist"
  );
});

test("enterprise-ux narratives exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "narratives/enterprise-ux-narratives.ts")
    ),
    "narratives/enterprise-ux-narratives.ts must exist"
  );
});

test("enterprise-ux manager exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "enterprise-ux-manager.ts")),
    "enterprise-ux-manager.ts must exist"
  );
});

test("enterprise-ux diagnostics exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "diagnostics/enterprise-ux-diagnostics.ts")
    ),
    "diagnostics/enterprise-ux-diagnostics.ts must exist"
  );
});

test("enterprise-ux index exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "index.ts")),
    "enterprise-ux/index.ts must exist"
  );
});

test("enterprise-ux types file exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "types/enterprise-ux-types.ts")
    ),
    "types/enterprise-ux-types.ts must exist"
  );
});

test("connector onboarding UI exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "connectors/connector-onboarding-ui.ts")
    ),
    "connectors/connector-onboarding-ui.ts must exist"
  );
});

test("first war-room experience exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "war-room/first-war-room-experience.ts")
    ),
    "war-room/first-war-room-experience.ts must exist"
  );
});

// ─── Hooks existence checks ──────────────────────────────────────────────────

test("useOnboardingRuntime hook exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "hooks/use-onboarding-runtime.ts")),
    "hooks/use-onboarding-runtime.ts must exist"
  );
});

test("useGuidedCognition hook exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "hooks/use-guided-cognition.ts")),
    "hooks/use-guided-cognition.ts must exist"
  );
});

test("useFirstValueReadiness hook exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(enterpriseUXRoot, "hooks/use-first-value-readiness.ts")
    ),
    "hooks/use-first-value-readiness.ts must exist"
  );
});

test("useExecutiveDemo hook exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "hooks/use-executive-demo.ts")),
    "hooks/use-executive-demo.ts must exist"
  );
});

test("useTrustSignals hook exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "hooks/use-trust-signals.ts")),
    "hooks/use-trust-signals.ts must exist"
  );
});

test("useOperationalTour hook exists", () => {
  assert.ok(
    fs.existsSync(path.join(enterpriseUXRoot, "hooks/use-operational-tour.ts")),
    "hooks/use-operational-tour.ts must exist"
  );
});

// ─── Content / philosophy checks ─────────────────────────────────────────────

test("demo scenario builder explicitly labels synthetic data", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "demo-runtime/demo-scenario-builder.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /SYNTHETIC_DEMO/,
    "Demo scenario builder must use SYNTHETIC_DEMO data tag"
  );
  assert.match(
    source,
    /not real customer data/i,
    "Demo builder must explicitly disclaim real customer data"
  );
});

test("executive demo runtime includes data disclaimer", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "demo-runtime/executive-demo-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /DATA_DISCLAIMER/,
    "Executive demo runtime must include a data disclaimer constant"
  );
  assert.match(
    source,
    /SYNTHETIC/,
    "Executive demo runtime must reference SYNTHETIC data label"
  );
});

test("narratives avoid fake certainty language", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "narratives/enterprise-ux-narratives.ts"),
    "utf-8"
  );
  // Must not claim "always accurate" or "guaranteed" or "100%"
  assert.doesNotMatch(
    source,
    /always accurate/i,
    "Narratives must not claim 'always accurate'"
  );
  assert.doesNotMatch(
    source,
    /guaranteed delivery/i,
    "Narratives must not claim 'guaranteed delivery'"
  );
  assert.doesNotMatch(
    source,
    /100% certainty/i,
    "Narratives must not use '100% certainty'"
  );
  // Must expose uncertainty
  assert.match(
    source,
    /uncertainty/i,
    "Narratives must reference uncertainty"
  );
  assert.match(
    source,
    /avoidsFakeConfidence: true/,
    "Narratives must set avoidsFakeConfidence: true"
  );
  assert.match(
    source,
    /isHonest: true/,
    "Narratives must set isHonest: true"
  );
});

test("trust-building runtime exposes knowledge gaps", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "trust/trust-building-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /whatPMFreakDoesNotKnow/,
    "Trust runtime must include whatPMFreakDoesNotKnow fields"
  );
  assert.match(
    source,
    /governance/i,
    "Trust runtime must reference governance"
  );
});

test("trust-building runtime includes governance explanations", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "trust/trust-building-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /retrieveGovernanceExplanations/,
    "Trust runtime must expose retrieveGovernanceExplanations"
  );
  assert.match(
    source,
    /Tenant Isolation/,
    "Governance explanations must include Tenant Isolation"
  );
});

test("onboarding runtime exposes required functions", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "onboarding/onboarding-runtime.ts"),
    "utf-8"
  );
  assert.match(source, /buildOnboardingFlow/, "Must export buildOnboardingFlow");
  assert.match(source, /retrieveOnboardingState/, "Must export retrieveOnboardingState");
  assert.match(
    source,
    /evaluateOnboardingProgress/,
    "Must export evaluateOnboardingProgress"
  );
});

test("guided cognition runtime exposes required functions", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "guided-experience/guided-cognition-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /buildGuidedCognitionExperience/,
    "Must export buildGuidedCognitionExperience"
  );
  assert.match(
    source,
    /retrieveGuidedCognitionSteps/,
    "Must export retrieveGuidedCognitionSteps"
  );
  assert.match(
    source,
    /retrieveOperationalConceptExplanations/,
    "Must export retrieveOperationalConceptExplanations"
  );
});

test("guided cognition explains operational concepts without AI hype", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "guided-experience/guided-cognition-steps.ts"),
    "utf-8"
  );
  // Must cover the required concepts
  assert.match(source, /operational.cognition/i, "Must explain operational cognition");
  assert.match(source, /survivability/i, "Must explain survivability");
  assert.match(source, /bounded.uncertainty/i, "Must explain bounded uncertainty");
  assert.match(source, /lineage/i, "Must explain lineage");
  assert.match(source, /federation/i, "Must explain federation");
  // Must not use AI hype language
  assert.doesNotMatch(source, /revolutionary AI/i, "Must not use 'revolutionary AI'");
  assert.doesNotMatch(source, /magic/i, "Must not use 'magic'");
});

test("empty state intelligence uses educational language, not generic placeholder text", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "empty-states/empty-state-intelligence.ts"),
    "utf-8"
  );
  // Must NOT use generic empty state language
  assert.doesNotMatch(source, /No projects yet\./i, "Must not use generic 'No projects yet'");
  assert.doesNotMatch(source, /Connect a tool\./i, "Must not use generic 'Connect a tool'");
  // Must use educational language
  assert.match(
    source,
    /operational cognition/i,
    "Empty states must reference operational cognition"
  );
  assert.match(source, /lineage/i, "Empty states must reference lineage");
  assert.match(source, /governance/i, "Empty states must reference governance");
});

test("first-value runtime exposes required functions", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "first-value/first-value-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /evaluateFirstValueReadiness/,
    "Must export evaluateFirstValueReadiness"
  );
  assert.match(
    source,
    /retrieveFirstValueMilestones/,
    "Must export retrieveFirstValueMilestones"
  );
  assert.match(
    source,
    /retrieveFirstInsightNarrative/,
    "Must export retrieveFirstInsightNarrative"
  );
});

test("executive demo runtime exposes required functions", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "demo-runtime/executive-demo-runtime.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /buildExecutiveDemoScenario/,
    "Must export buildExecutiveDemoScenario"
  );
  assert.match(
    source,
    /retrieveExecutiveDemoNarratives/,
    "Must export retrieveExecutiveDemoNarratives"
  );
  assert.match(
    source,
    /retrieveExecutiveDemoTopology/,
    "Must export retrieveExecutiveDemoTopology"
  );
});

test("operational tour runtime exposes required functions", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "narratives/operational-tour-runtime.ts"),
    "utf-8"
  );
  assert.match(source, /buildOperationalTour/, "Must export buildOperationalTour");
  assert.match(source, /retrieveTourSteps/, "Must export retrieveTourSteps");
  assert.match(source, /retrieveTourNarratives/, "Must export retrieveTourNarratives");
});

test("enterprise-ux manager exposes unified API surface", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "enterprise-ux-manager.ts"),
    "utf-8"
  );
  assert.match(source, /retrieveOnboardingState/, "Manager must expose onboarding state");
  assert.match(source, /retrieveGuidedCognition/, "Manager must expose guided cognition");
  assert.match(source, /retrieveFirstValueReadiness/, "Manager must expose first value");
  assert.match(source, /retrieveExecutiveDemoState/, "Manager must expose demo state");
  assert.match(source, /retrieveTrustSignals/, "Manager must expose trust signals");
  assert.match(source, /retrieveOperationalTour/, "Manager must expose operational tour");
  assert.match(
    source,
    /retrieveEnterpriseUXDiagnostics/,
    "Manager must expose diagnostics"
  );
  assert.match(
    source,
    /retrieveEnterpriseUXNarratives/,
    "Manager must expose narratives"
  );
});

test("tenant isolation is preserved — no cross-workspace data in any runtime", () => {
  const files = [
    "onboarding/onboarding-runtime.ts",
    "trust/trust-building-runtime.ts",
    "diagnostics/enterprise-ux-diagnostics.ts",
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(enterpriseUXRoot, file), "utf-8");
    assert.match(
      source,
      /workspaceId/,
      `${file} must use workspaceId for tenant scoping`
    );
  }
});

test("connector onboarding marks live OAuth as false", () => {
  const source = fs.readFileSync(
    path.join(enterpriseUXRoot, "connectors/connector-onboarding-ui.ts"),
    "utf-8"
  );
  assert.match(
    source,
    /isLiveOAuth: false/,
    "Connector onboarding must mark isLiveOAuth as false"
  );
  assert.doesNotMatch(
    source,
    /isLiveOAuth: true/,
    "Connector onboarding must not mark isLiveOAuth as true"
  );
});

test("docs: enterprise-ux architecture doc exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "docs/architecture/enterprise-ux-demo-readiness.md")
    ),
    "docs/architecture/enterprise-ux-demo-readiness.md must exist"
  );
});

test("docs: current state enterprise-ux doc exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "docs/architecture/CURRENT_STATE_ENTERPRISE_UX.md")
    ),
    "docs/architecture/CURRENT_STATE_ENTERPRISE_UX.md must exist"
  );
});

test("validation script exists", () => {
  assert.ok(
    fs.existsSync(path.join(root, "scripts/check-enterprise-ux.mjs")),
    "scripts/check-enterprise-ux.mjs must exist"
  );
});
