// AOC Capital Strategy Playbook — Investor Constitution schema (v0.1).
//
// The Investor Constitution is the single source of truth for what an
// investor is allowed to see in paper-trading simulations. It is produced
// upstream of this domain layer (onboarding / advisor intake) and is treated
// here as an opaque, versioned input — nothing in this module infers,
// mutates, or upgrades a constitution. paperTradingOnly is a literal `true`
// because this domain layer has no real-execution surface to opt into.

export type InvestorObjective =
  | "capital_preservation"
  | "wealth_growth"
  | "income_generation"
  | "retirement"
  | "education"
  | "future_purchase"
  | "controlled_speculation";

export type TimeHorizon = "less_than_1y" | "1_3y" | "3_5y" | "5_10y" | "10y_plus";

export type Currency = "CRC" | "USD" | "mixed" | "other";

export type LiquidityRequirement = "critical" | "high" | "medium" | "low";

export type EmergencyReserveMonths = "0_1" | "1_3" | "3_6" | "6_plus";

export type RiskLevel = "low" | "medium" | "high";

export type FinancialKnowledge = "basic" | "intermediate" | "advanced";

export type ComplexityAllowed = "simple" | "moderate" | "advanced";

export type ReviewFrequency = "monthly" | "quarterly" | "semiannual" | "annual";

export type ProhibitedInstrument =
  | "crypto"
  | "single_stocks"
  | "options"
  | "leverage"
  | "margin"
  | "short_selling"
  | "defi"
  | "illiquid_assets"
  | "thematic_etfs";

/**
 * A versioned, immutable statement of an investor's objectives and limits.
 * Every Strategy Playbook decision (suitability, simulation, explanation) is
 * evaluated against a specific constitutionId + version, never a live/mutable
 * profile — so a change to an investor's answers always produces a new
 * version rather than rewriting history behind an existing simulation.
 */
export interface InvestorConstitution {
  constitutionId: string;
  version: number;

  investorObjective: InvestorObjective;
  timeHorizon: TimeHorizon;

  baseCurrency: Currency;
  spendingCurrency: Currency;

  liquidityRequirement: LiquidityRequirement;
  emergencyReserveMonths: EmergencyReserveMonths;

  riskTolerance: RiskLevel;
  riskCapacity: RiskLevel;

  financialKnowledge: FinancialKnowledge;
  complexityAllowed: ComplexityAllowed;

  hasDependents: boolean;
  debtLevel: RiskLevel;

  maxSingleAssetExposurePct: number;
  maxCryptoExposurePct: number;
  maxSectorExposurePct: number;

  prohibitedInstruments: ProhibitedInstrument[];

  preferredReviewFrequency: ReviewFrequency;
  requiresHumanReview: boolean;

  /** Always true — this domain layer has no path to real execution. */
  paperTradingOnly: true;

  createdAt: string;
  updatedAt: string;
}
