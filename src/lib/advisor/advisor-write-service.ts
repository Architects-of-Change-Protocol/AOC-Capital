// AOC Capital Advisor — governed write path.
// The only place advisor confirmation touches the database. Re-derives the
// recommendation from the raw intake server-side (never trusts a client-supplied
// recommendation) and only then creates/updates the portfolio, applies the
// constitution, and writes the audit ledger events — all through the existing
// privileged, service-role write path in src/lib/trading/trade-service.ts.

import {
  applyAdvisorConstitution,
  ensureCapitalLevels,
  getOrCreateDefaultPortfolio,
  recordAuditEvent,
  updatePortfolioBaseCapital,
} from "@/lib/trading/trade-service";
import { runAdvisorRecommendation } from "./advisor-engine";
import { buildConstitutionAuditEvent, buildStrategyBriefAuditEvent } from "./audit-events";
import type { AdvisorIntake, AdvisorRecommendation } from "./types";

export type ConfirmAdvisorRecommendationInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  intake: AdvisorIntake;
};

export type ConfirmAdvisorRecommendationResult = {
  recommendation: AdvisorRecommendation;
  portfolio: Awaited<ReturnType<typeof getOrCreateDefaultPortfolio>>;
  riskConstitution: Awaited<ReturnType<typeof applyAdvisorConstitution>>;
  capitalLevels: Awaited<ReturnType<typeof ensureCapitalLevels>>;
};

export async function confirmAdvisorRecommendation(input: ConfirmAdvisorRecommendationInput): Promise<ConfirmAdvisorRecommendationResult> {
  const recommendation = runAdvisorRecommendation(input.intake);

  const existingPortfolio = await getOrCreateDefaultPortfolio(input.companyId);
  const portfolio = await updatePortfolioBaseCapital(
    input.companyId,
    existingPortfolio.id,
    recommendation.capitalRecommendation.recommendedBaseCapitalUsd,
    input.actorUserId
  );

  const riskConstitution = await applyAdvisorConstitution(input.companyId, recommendation.constitution, input.actorUserId);
  const capitalLevels = await ensureCapitalLevels(input.companyId, portfolio);

  const strategyEvent = buildStrategyBriefAuditEvent({ companyId: input.companyId, portfolioId: portfolio.id, actor: input.actor, recommendation });
  const constitutionEvent = buildConstitutionAuditEvent({ companyId: input.companyId, portfolioId: portfolio.id, actor: input.actor, constitution: riskConstitution });

  await recordAuditEvent(strategyEvent, input.actorUserId);
  await recordAuditEvent(constitutionEvent, input.actorUserId);

  return { recommendation, portfolio, riskConstitution, capitalLevels };
}
