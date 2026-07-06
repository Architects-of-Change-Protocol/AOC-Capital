// ─── AOC Capital — Investor Constitution Intake (/capital/constitution/new) —
// UI Copy & Safety Static Source Checks ──────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-portfolio-overview-ui.test.mjs) — checks the route's
// content module, page, and form source for required copy and forbidden
// execution language, without rendering the React server/client components.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ROUTE_DIR = "src/app/(protected)/capital/constitution/new";

const pageTsx = fs.readFileSync(`${ROUTE_DIR}/page.tsx`, "utf8");
const formTsx = fs.readFileSync(`${ROUTE_DIR}/investor-constitution-intake-form.tsx`, "utf8");
const contentTs = fs.readFileSync("src/lib/capital/investor-constitution-intake-content.ts", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const capitalNavigationTs = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");

const { INTRO_PARAGRAPHS, INTAKE_QUESTIONS, RESULT_TITLE } = await import(
  "../src/lib/capital/investor-constitution-intake-content.ts"
);

// ─── Route exists ────────────────────────────────────────────────────────────

test("the /capital/constitution/new route exists", () => {
  assert.ok(fs.existsSync(`${ROUTE_DIR}/page.tsx`));
});

test("the capital layout nav links to /capital/constitution/new", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/constitution\/new"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});

// ─── Intro copy ──────────────────────────────────────────────────────────────

const introCopy = INTRO_PARAGRAPHS.join(" ");

test("intro copy states there are no right answers", () => {
  assert.match(introCopy, /no right answers/i);
});

test("intro copy names paper trading", () => {
  assert.match(introCopy, /paper trading/i);
});

test("intro copy states this does not constitute investment advice", () => {
  assert.match(introCopy, /does not constitute investment advice/i);
});

test("the page renders every intro paragraph", () => {
  for (const paragraph of INTRO_PARAGRAPHS) {
    assert.ok(pageTsx.includes("INTRO_PARAGRAPHS"), "page should render INTRO_PARAGRAPHS");
    assert.ok(paragraph.length > 0);
  }
});

// ─── Question set ────────────────────────────────────────────────────────────

test("all 12 questions are present", () => {
  assert.equal(INTAKE_QUESTIONS.length, 12);
});

test("every required question prompt appears in the question catalog", () => {
  const prompts = INTAKE_QUESTIONS.map((q) => q.prompt);
  for (const required of [
    "¿Para qué querés construir este portafolio?",
    "¿Cuándo creés que podrías necesitar usar una parte importante de este dinero?",
    "Si mañana tuvieras una emergencia fuerte, ¿cuántos meses podrías cubrir tus gastos sin vender inversiones?",
    "¿Este dinero podría hacerte falta para gastos importantes en los próximos 12 meses?",
    "Si este portafolio bajara 20% temporalmente, ¿qué tan grave sería para tu vida real?",
    "Imaginá que tu portafolio simulado baja 15% en un mes. ¿Qué reacción se parece más a vos?",
    "Cuando ves que un activo sube mucho y todo el mundo habla de eso, ¿qué te pasa normalmente?",
    "¿En qué moneda están la mayoría de tus gastos?",
    "¿En qué moneda querés medir si tu portafolio va bien?",
    "¿Hoy dependés mucho de una sola cosa para tu patrimonio?",
    "¿Con qué tipo de instrumentos te sentirías cómodo simulando?",
    "¿Cuál frase se parece más a vos?",
  ]) {
    assert.ok(prompts.includes(required), `missing question prompt: ${required}`);
  }
});

test("every question has at least 2 options and a field mapped to an intake answer", () => {
  for (const question of INTAKE_QUESTIONS) {
    assert.ok(question.options.length >= 2, `${question.prompt} needs at least 2 options`);
    assert.equal(typeof question.field, "string");
  }
});

test("the form renders the question catalog and calls the deterministic builder", () => {
  assert.match(formTsx, /INTAKE_QUESTIONS/);
  assert.match(formTsx, /buildInvestorConstitutionFromIntake/);
});

// ─── Result screen ───────────────────────────────────────────────────────────

test("result title is 'Your Investor Constitution v0.1'", () => {
  assert.equal(RESULT_TITLE, "Your Investor Constitution v0.1");
});

test("the form renders the result title and a Paper-only row", () => {
  assert.match(formTsx, /RESULT_TITLE/);
  assert.match(formTsx, /Paper-only/);
});

test("the form offers Save, Edit answers, and Continue later actions", () => {
  assert.match(formTsx, /Save Investor Constitution/);
  assert.match(formTsx, /Edit answers/);
  assert.match(formTsx, /Continue later/);
});

// ─── Safety: no simulation, no strategy recommendation, no LLM, no execution ─

test("the route never calls an LLM, fetches market data, or reaches Supabase", () => {
  for (const forbidden of [/openai/i, /anthropic/i, /getMarketData/, /createSupabaseServerClient/, /supabase\./i]) {
    assert.doesNotMatch(pageTsx, forbidden);
    assert.doesNotMatch(formTsx, forbidden);
  }
});

test("the route never posts a mutation over the network", () => {
  assert.doesNotMatch(pageTsx, /fetch\(/);
  assert.doesNotMatch(formTsx, /fetch\(/);
});

const FORBIDDEN_EXECUTION_COPY =
  /\bbuy\b|\bsell\b|\bexecute\b|place order|\bbroker\b|live trade|real trade|recommended portfolio/i;

test("the page never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the form never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(formTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the content module never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});
