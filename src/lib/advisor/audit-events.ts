// AOC Capital Advisor — audit ledger event construction.
// Pure builders: no I/O. The write path (src/lib/advisor/advisor-write-service.ts)
// inserts exactly the rows these functions return via the governed, privileged
// write path in src/lib/trading/trade-service.ts.

import type { AuditLedgerInsert } from "@/lib/trading/trade-service";
import type { AdvisorConstitutionRule, AdvisorRecommendation } from "./types";

export function buildStrategyBriefAuditEvent(input: {
  companyId: string;
  portfolioId: string;
  actor: string;
  recommendation: AdvisorRecommendation;
}): AuditLedgerInsert {
  const { companyId, portfolioId, actor, recommendation } = input;
  return {
    company_id: companyId,
    event_type: "advisor_strategy_generated",
    subject_type: "portfolio",
    subject_id: portfolioId,
    actor,
    payload: {
      intake: recommendation.intake,
      riskProfile: recommendation.riskProfile,
      capitalRecommendation: recommendation.capitalRecommendation,
      allowedCapabilities: recommendation.capabilities.allowed,
      blockedCapabilities: recommendation.capabilities.blocked,
      brief: recommendation.brief,
    },
  };
}

export function buildConstitutionAuditEvent(input: {
  companyId: string;
  portfolioId: string;
  actor: string;
  constitution: AdvisorConstitutionRule[];
}): AuditLedgerInsert {
  const { companyId, portfolioId, actor, constitution } = input;
  return {
    company_id: companyId,
    event_type: "advisor_constitution_generated",
    subject_type: "portfolio",
    subject_id: portfolioId,
    actor,
    payload: { constitution },
  };
}
