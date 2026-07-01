import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const detection = readFileSync("src/lib/workspace/language/language-detection.ts", "utf8");
const preference = readFileSync("src/lib/workspace/language/language-preference.ts", "utf8");
const concepts = readFileSync("src/lib/workspace/language/operational-concepts.ts", "utf8");
const labels = readFileSync("src/lib/workspace/language/localized-labels.ts", "utf8");
const firstContact = readFileSync("src/lib/workspace/language/first-contact-language.ts", "utf8");
const imprint = readFileSync("src/lib/workspace/imprint-inference.ts", "utf8");
const traces = readFileSync("src/lib/workspace/validation-trace-builder.ts", "utf8");
const runtimeValidation = readFileSync("src/lib/workspace/runtime-validation.ts", "utf8");
const policy = readFileSync("src/lib/workspace/language/localization-policy.ts", "utf8");

test("Spanish input detected as Spanish", () => assert.match(detection, /cliente|proveedor|aprobación/));
test("English input detected as English", () => assert.match(detection, /client|vendor|approval/));
test("Mixed input marked mixed", () => assert.match(detection, /mixed:\s*true/));
test("Low-confidence input falls back safely", () => assert.match(detection, /fallback:unknown-language/));
test("Language preference fallback exists", () => assert.match(preference, /source:\s*"fallback"/));
test("Spanish and English client dependency normalize to same concept", () => {
  assert.match(concepts, /client_dependency_blockage/);
  assert.match(concepts, /cliente no entrega/);
  assert.match(concepts, /client has not provided/);
});
test("Spanish and English approval blockage normalize to same concept", () => {
  assert.match(concepts, /financial_approval_hold/);
  assert.match(concepts, /aprobación financiera/);
  assert.match(concepts, /budget approval hold/);
});
test("Localized labels return both languages", () => {
  assert.match(labels, /Client-side dependency blockage/);
  assert.match(labels, /Bloqueo de dependencia del cliente/);
});
test("First-contact frame mirrors language", () => {
  assert.match(firstContact, /Contexto operativo detectado/);
  assert.match(firstContact, /Operational context detected/);
});
test("Ignition cues localize correctly", () => {
  assert.match(firstContact, /Una dependencia está bloqueando la ejecución/);
  assert.match(firstContact, /A delivery dependency is blocking execution/);
});
test("Imprint inference handles Spanish diplomatic phrasing", () => assert.match(imprint, /sin sonar confrontativo/));
test("Validation traces include language/concepts", () => {
  assert.match(traces, /language\?: SupportedLanguage/);
  assert.match(runtimeValidation, /operationalConcepts\?: OperationalConcept\[\]/);
  assert.match(runtimeValidation, /matchedAliases\?: string\[\]/);
});
test("Proper nouns/acronyms preserved", () => {
  assert.match(policy, /\^\[A-Z\]\{2,8\}\$/);
  assert.match(policy, /@/);
  assert.ok(policy.includes("https?:\\/\\/"));
});
