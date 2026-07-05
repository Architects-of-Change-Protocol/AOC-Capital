// AOC Capital Strategy Playbook — Deterministic AOC Reading (v0.1).
//
// Produces a short list of plain-language observations about an Investor
// Constitution — the same (constitution) input always produces the same
// output. Nothing here calls an LLM, a database, or a market data source;
// this is static, rule-based copy generation only, so the result page can
// render it without waiting on (or depending on) the LLM explanation layer.

import type { InvestorConstitution } from "./investor-constitution-schema";

export type InvestorConstitutionReadingInsight = {
  id: string;
  message: string;
};

/**
 * Builds the deterministic "AOC Reading" of an Investor Constitution: a set
 * of plain-language observations about liquidity, risk gaps, knowledge
 * limits, currency exposure, and crypto exposure. When none of the specific
 * triggers apply, a single baseline observation is returned so the reading
 * section is never empty.
 */
export function buildInvestorConstitutionReading(constitution: InvestorConstitution): InvestorConstitutionReadingInsight[] {
  const insights: InvestorConstitutionReadingInsight[] = [];

  if (constitution.liquidityRequirement === "critical") {
    insights.push({
      id: "liquidity_critical",
      message:
        "Your liquidity answers suggest that access to cash is a priority. AOC will restrict aggressive simulations until liquidity constraints are addressed.",
    });
  }

  if (constitution.riskTolerance === "high" && constitution.riskCapacity === "low") {
    insights.push({
      id: "risk_tolerance_capacity_gap",
      message:
        "Your answers show a gap between emotional willingness to take risk and financial capacity to absorb losses. AOC will apply conservative limits.",
    });
  }

  if (constitution.financialKnowledge === "basic") {
    insights.push({
      id: "basic_knowledge_complexity",
      message:
        "AOC will keep simulations simple and block complex instruments such as leverage, margin, options, short selling, and DeFi.",
    });
  }

  if (constitution.spendingCurrency !== constitution.baseCurrency) {
    insights.push({
      id: "currency_mismatch",
      message:
        "AOC will flag currency exposure because the currency used to measure the portfolio differs from the currency used for everyday expenses.",
    });
  }

  if (constitution.maxCryptoExposurePct === 0) {
    insights.push({
      id: "crypto_blocked",
      message: "Crypto exposure is blocked under this constitution.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "baseline",
      message:
        "Your answers do not trigger any additional restrictions beyond AOC's standard paper-trading safeguards.",
    });
  }

  return insights;
}
