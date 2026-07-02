// ─── AOC Capital Advisor — Audit Ledger Event Construction — Tests ─────────────
// The write path (advisor-write-service.ts) inserts exactly the rows these
// builders return, so asserting on the builder output verifies that confirming
// an advisor-generated strategy/constitution writes the expected audit event.
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildStrategyBriefAuditEvent, buildConstitutionAuditEvent } = await import("../src/lib/advisor/audit-events.ts");
const { runAdvisorRecommendation } = await import("../src/lib/advisor/advisor-engine.ts");
const { generateInitialRiskConstitution } = await import("../src/lib/advisor/constitution.ts");

const intake = () => ({
  startingCapitalUsd: 1000,
  primaryObjective: "balanced_growth",
  timeHorizon: "medium_term",
  riskAppetite: "moderate",
  maxTolerableDrawdownPct: 15,
  preferredMarkets: ["crypto"],
  autonomyLevel: "assisted",
  tradingMode: "recommendations_only",
  wantsGatedRealExecution: false,
});

test("buildStrategyBriefAuditEvent produces a governed advisor_strategy_generated audit row", () => {
  const recommendation = runAdvisorRecommendation(intake());
  const event = buildStrategyBriefAuditEvent({
    companyId: "company-1",
    portfolioId: "portfolio-1",
    actor: "founder@example.com",
    recommendation,
  });

  assert.equal(event.company_id, "company-1");
  assert.equal(event.event_type, "advisor_strategy_generated");
  assert.equal(event.subject_type, "portfolio");
  assert.equal(event.subject_id, "portfolio-1");
  assert.equal(event.actor, "founder@example.com");
  assert.equal(event.payload.riskProfile, recommendation.riskProfile);
  assert.equal(event.payload.brief.recommendationMessage, "Based on your answers, I recommend starting in Level 1: Governed Paper Sandbox.");
});

test("advisor-created constitution writes an advisor_constitution_generated audit event", () => {
  const constitution = generateInitialRiskConstitution("balanced");
  const event = buildConstitutionAuditEvent({
    companyId: "company-1",
    portfolioId: "portfolio-1",
    actor: "founder@example.com",
    constitution,
  });

  assert.equal(event.company_id, "company-1");
  assert.equal(event.event_type, "advisor_constitution_generated");
  assert.equal(event.subject_type, "portfolio");
  assert.equal(event.subject_id, "portfolio-1");
  assert.equal(event.actor, "founder@example.com");
  assert.deepEqual(event.payload.constitution, constitution);
  assert.ok(event.payload.constitution.some((r) => r.rule_key === "no_leverage"));
});

test("the constitution audit event payload reflects risk-profile-tailored limits, not just the raw Level 1 defaults", () => {
  const conservativeConstitution = generateInitialRiskConstitution("conservative");
  const event = buildConstitutionAuditEvent({
    companyId: "company-1",
    portfolioId: "portfolio-1",
    actor: "founder@example.com",
    constitution: conservativeConstitution,
  });

  const exposureRule = event.payload.constitution.find((r) => r.rule_key === "max_simulated_exposure");
  assert.ok(exposureRule.limit_value < 0.6, "conservative constitution should be tighter than the Level 1 ceiling");
});
