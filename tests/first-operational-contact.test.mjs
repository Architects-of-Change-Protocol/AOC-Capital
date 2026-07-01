import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const awakeningState = read("src/lib/workspace/awakening-state.ts");
const firstContact = read("src/lib/workspace/first-contact-detector.ts");
const displaySemantics = read("src/lib/workspace/display-semantics.ts");
const conversationShell = read("src/components/pmfreak/workspace/workspace-conversation-shell.tsx");
const workspaceShell = read("src/components/pmfreak/workspace/workspace-shell.tsx");
const awakeningPanel = read("src/components/pmfreak/workspace/agent-awakening-panel.tsx");
const operationalShell = read("src/components/pmfreak/operational-shell.tsx");

// ─── 1. Dormant state renders before meaningful interaction ───────────────────

test("dormant state has no awakened agents", () => {
  assert.match(awakeningState, /dormant: \[\]/);
});

test("workspace shell renders dormant invitation copy when dormant", () => {
  assert.match(conversationShell, /dormantInvitation/);
  assert.match(displaySemantics, /dormantInvitation/);
});

test("workspace shell shows standby chip in dormant stage", () => {
  assert.match(workspaceShell, /standbySubtitle/);
  assert.match(workspaceShell, /isDormant/);
});

test("ignition cues are present for dormant state", () => {
  // X.8: default ignition cues live in imprint-inference.ts and are fed dynamically via computeIgnitionCues
  const imprintInference = read("src/lib/workspace/imprint-inference.ts");
  assert.match(imprintInference, /A delivery dependency is blocking execution/);
  assert.match(imprintInference, /A stakeholder alignment issue is emerging/);
  assert.match(imprintInference, /I need help clarifying project scope/);
  // Conversation shell must use the dynamic cues
  assert.match(conversationShell, /computeIgnitionCues/);
  assert.match(conversationShell, /ignitionCues\.map/);
});

// ─── 2. Meaningful prompt triggers initialization ─────────────────────────────

test("first-contact detector exists and guards noise", () => {
  assert.match(firstContact, /isMeaningfulOperationalContact/);
  assert.match(firstContact, /NOISE_PATTERN/);
  // Short strings and noise words are rejected
  assert.match(firstContact, /trimmed\.length < 10/);
  assert.match(firstContact, /NOISE_PATTERN\.test\(trimmed\)/);
});

test("conversation shell calls isMeaningfulOperationalContact before advancing awakening", () => {
  assert.match(conversationShell, /isMeaningfulOperationalContact\(message\)/);
  assert.match(conversationShell, /onAwakeningAdvance/);
});

// ─── 3. Noise prompts do not awaken system ────────────────────────────────────

test("noise pattern covers trivial greetings", () => {
  // All these strings must be present in the noise pattern
  for (const word of ["hi", "hello", "hey", "test"]) {
    assert.match(firstContact, new RegExp(word, "i"), `noise pattern missing: ${word}`);
  }
});

// ─── 4. Awakening progresses deterministically ───────────────────────────────

test("stage thresholds are deterministic and monotonically increasing", () => {
  // dormant=0, initializing=1, orienting=2, engaged=4, expanded=7, fully-operational=10
  assert.match(awakeningState, /dormant: 0/);
  assert.match(awakeningState, /initializing: 1/);
  assert.match(awakeningState, /orienting: 2/);
  assert.match(awakeningState, /engaged: 4/);
  assert.match(awakeningState, /expanded: 7/);
  assert.match(awakeningState, /"fully-operational": 10/);
});

test("computeAwakeningStage function is exported", () => {
  assert.match(awakeningState, /export function computeAwakeningStage/);
});

test("deriveAwakeningState function is exported", () => {
  assert.match(awakeningState, /export function deriveAwakeningState/);
});

test("agents awaken in order: context→memory→delivery→stakeholders→risk→executive→portfolio", () => {
  // initializing gets context+memory
  assert.match(awakeningState, /initializing: \["context", "memory"\]/);
  // orienting adds delivery
  assert.match(awakeningState, /orienting: \["context", "memory", "delivery"\]/);
  // engaged adds stakeholders+risk
  assert.match(awakeningState, /engaged: \["context", "memory", "delivery", "stakeholders", "risk"\]/);
  // expanded adds executive
  assert.match(awakeningState, /expanded: \["context", "memory", "delivery", "stakeholders", "risk", "executive"\]/);
  // fully-operational adds portfolio
  assert.match(awakeningState, /"fully-operational": \["context", "memory", "delivery", "stakeholders", "risk", "executive", "portfolio"\]/);
});

// ─── 5. Awakening state persists ─────────────────────────────────────────────

test("loadAwakeningState and persistAwakeningState are exported", () => {
  assert.match(awakeningState, /export function loadAwakeningState/);
  assert.match(awakeningState, /export function persistAwakeningState/);
});

test("persistence uses scoped companyId+workspaceId key", () => {
  assert.match(awakeningState, /companyId/);
  assert.match(awakeningState, /workspaceId/);
  assert.match(awakeningState, /STORAGE_KEY_PREFIX/);
});

test("workspace shell calls persistAwakeningState on advance", () => {
  assert.match(workspaceShell, /persistAwakeningState/);
});

test("awakening event is dispatched for cross-component sync", () => {
  assert.match(workspaceShell, /AWAKENING_EVENT/);
  assert.match(workspaceShell, /dispatchEvent/);
});

// ─── 6. Navigation reveal respects awakening progression ─────────────────────

test("isLensUnlocked is exported from awakening-state", () => {
  assert.match(awakeningState, /export function isLensUnlocked/);
});

test("lens unlock map covers all four lenses", () => {
  assert.match(awakeningState, /\/dashboard.*initializing/s);
  assert.match(awakeningState, /\/command-center.*engaged/s);
  assert.match(awakeningState, /\/executive.*expanded/s);
  assert.match(awakeningState, /\/portfolio.*fully-operational/s);
});

test("operational shell uses isLensUnlocked to conditionally render lens links", () => {
  assert.match(operationalShell, /isLensUnlocked/);
  assert.match(operationalShell, /awakening\.stage/);
});

test("operational shell subscribes to AWAKENING_EVENT", () => {
  assert.match(operationalShell, /AWAKENING_EVENT/);
  assert.match(operationalShell, /addEventListener.*AWAKENING_EVENT/s);
});

test("operational shell loads awakening state from localStorage on mount", () => {
  assert.match(operationalShell, /loadAwakeningState/);
});

// ─── 7. Agent panel reflects current stage ───────────────────────────────────

test("agent awakening panel is created", () => {
  assert.match(awakeningPanel, /AgentAwakeningPanel/);
  assert.match(awakeningPanel, /STAGE_SUMMARY/);
  assert.match(awakeningPanel, /CLUSTER_LABELS/);
});

test("panel shows all seven agent cluster labels", () => {
  for (const cluster of ["context", "memory", "delivery", "stakeholders", "risk", "executive", "portfolio"]) {
    assert.match(awakeningPanel, new RegExp(cluster), `missing cluster label: ${cluster}`);
  }
});

test("panel renders dormant summary when no agents awakened", () => {
  assert.match(awakeningPanel, /Core systems on standby/);
  assert.match(awakeningPanel, /Awaiting operational signal/);
});

test("panel is integrated into conversation shell right sidebar", () => {
  assert.match(conversationShell, /AgentAwakeningPanel/);
  assert.match(conversationShell, /state=\{awakening\}/);
});

// ─── 8. First-response contract elements ─────────────────────────────────────

test("conversation shell accepts awakening and onAwakeningAdvance props", () => {
  assert.match(conversationShell, /awakening: AwakeningState/);
  assert.match(conversationShell, /onAwakeningAdvance/);
});

test("stage chip transitions are defined for all stages", () => {
  for (const stage of ["dormant", "initializing", "orienting", "engaged", "expanded", "fully-operational"]) {
    assert.match(conversationShell, new RegExp(stage), `missing stage chip: ${stage}`);
  }
});

test("telemetry cards show dormant labels before awakening", () => {
  assert.match(conversationShell, /Awaiting signal/);
  assert.match(conversationShell, /Dormant/);
  assert.match(conversationShell, /Pending/);
});

test("dormant invitation copy does not contain tutorial or onboarding language", () => {
  const lc = conversationShell.toLowerCase();
  for (const term of ["first-session guide", "start with one real", "tutorial"]) {
    assert.equal(lc.includes(term), false, `forbidden term found: ${term}`);
  }
});

test("display semantics includes all awakening stage labels", () => {
  assert.match(displaySemantics, /dormantInvitation/);
  assert.match(displaySemantics, /dormantSignalHint/);
  assert.match(displaySemantics, /standbySubtitle/);
  assert.match(displaySemantics, /initializing/);
  assert.match(displaySemantics, /orienting/);
});
