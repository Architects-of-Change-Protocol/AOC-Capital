// AOC Capital Strategy Playbook — Investor Constitution Intake mapping (v0.1).
//
// Turns a short, plain-language onboarding questionnaire into a versioned
// InvestorConstitution. Nothing here calls an LLM, a database, or a market
// data source — the same set of answers always produces the same
// constitution, and every uncertain or contradictory answer resolves toward
// the more conservative outcome rather than a guess.

import type {
  ComplexityAllowed,
  Currency,
  EmergencyReserveMonths,
  FinancialKnowledge,
  InvestorConstitution,
  InvestorObjective,
  LiquidityRequirement,
  ProhibitedInstrument,
  RiskLevel,
  TimeHorizon,
} from "./investor-constitution-schema";

/** Documents that a type is one closed set of raw questionnaire option values. */
export type IntakeAnswer<TValue extends string> = TValue;

export type PurposeAnswer = IntakeAnswer<
  | "protect_existing_money"
  | "grow_wealth_long_term"
  | "generate_income"
  | "save_for_specific_goal"
  | "learn_and_simulate"
  | "test_aggressive_strategies"
  | "not_sure"
>;

export type HorizonAnswer = IntakeAnswer<"less_than_1y" | "1_3y" | "3_5y" | "5_10y" | "10y_plus" | "no_clear_date">;

export type EmergencyReserveAnswer = IntakeAnswer<"less_than_1m" | "1_3m" | "3_6m" | "more_than_6m" | "not_sure">;

export type NearTermNeedAnswer = IntakeAnswer<"probably_yes" | "maybe" | "no" | "not_sure">;

export type RiskCapacityAnswer = IntakeAnswer<
  "very_serious" | "uncomfortable_manageable" | "no_real_impact" | "tolerable_long_term" | "not_sure"
>;

export type EmotionalReactionAnswer = IntakeAnswer<
  "close_positions" | "worried_would_change_strategy" | "wait_but_check_daily" | "keep_plan_if_understood" | "increase_exposure"
>;

export type FomoAnswer = IntakeAnswer<"want_in_fast" | "research_first" | "distrust_when_crowded" | "avoid_unfamiliar" | "depends_on_asset">;

export type SpendingCurrencyAnswer = IntakeAnswer<"CRC" | "USD" | "mixed" | "other">;

export type MeasurementCurrencyAnswer = IntakeAnswer<"CRC" | "USD" | "mixed" | "not_considered">;

export type ConcentrationAnswer = IntakeAnswer<
  "single_stock" | "crypto" | "real_estate" | "business_or_job" | "diversified" | "not_sure"
>;

export type ComplexityAnswer = IntakeAnswer<
  "cash_or_broad_etfs" | "etfs_and_known_stocks" | "individual_stocks_sectors" | "small_crypto_component" | "complex_instruments" | "not_sure_difference"
>;

export type SummaryAnswer = IntakeAnswer<
  "sleep_well_lower_returns" | "accept_ups_downs_if_plan_makes_sense" | "grow_aggressively_uncomfortable" | "try_ideas_in_simulation_first" | "not_sure_want_to_understand"
>;

export interface InvestorConstitutionIntakeAnswers {
  purpose: PurposeAnswer;
  horizon: HorizonAnswer;
  emergencyReserve: EmergencyReserveAnswer;
  nearTermNeed: NearTermNeedAnswer;
  riskCapacity: RiskCapacityAnswer;
  emotionalReaction: EmotionalReactionAnswer;
  fomo: FomoAnswer;
  spendingCurrency: SpendingCurrencyAnswer;
  measurementCurrency: MeasurementCurrencyAnswer;
  concentration: ConcentrationAnswer;
  complexity: ComplexityAnswer;
  summary: SummaryAnswer;
}

export type BuildInvestorConstitutionFromIntakeOptions = {
  constitutionId?: string;
  createdAt?: string;
};

function mapObjective(purpose: PurposeAnswer): InvestorObjective {
  switch (purpose) {
    case "protect_existing_money":
      return "capital_preservation";
    case "generate_income":
      return "income_generation";
    case "save_for_specific_goal":
      return "future_purchase";
    case "test_aggressive_strategies":
      return "controlled_speculation";
    case "grow_wealth_long_term":
    case "learn_and_simulate":
    case "not_sure":
    default:
      return "wealth_growth";
  }
}

function mapTimeHorizon(horizon: HorizonAnswer): TimeHorizon {
  switch (horizon) {
    case "less_than_1y":
    case "1_3y":
    case "3_5y":
    case "5_10y":
    case "10y_plus":
      return horizon;
    case "no_clear_date":
    default:
      // An unclear horizon is treated as short, since the safer assumption
      // when we don't know when the money is needed is that it could be soon.
      return "1_3y";
  }
}

function mapEmergencyReserveMonths(answer: EmergencyReserveAnswer): EmergencyReserveMonths {
  switch (answer) {
    case "less_than_1m":
      return "0_1";
    case "1_3m":
      return "1_3";
    case "3_6m":
      return "3_6";
    case "more_than_6m":
      return "6_plus";
    case "not_sure":
    default:
      return "0_1";
  }
}

function mapLiquidityRequirement(answer: NearTermNeedAnswer, timeHorizon: TimeHorizon): LiquidityRequirement {
  switch (answer) {
    case "probably_yes":
      return "critical";
    case "maybe":
      return "high";
    case "no":
      return timeHorizon === "less_than_1y" || timeHorizon === "1_3y" ? "medium" : "low";
    case "not_sure":
    default:
      return "high";
  }
}

function mapRiskCapacity(answer: RiskCapacityAnswer, timeHorizon: TimeHorizon): RiskLevel {
  switch (answer) {
    case "very_serious":
      return "low";
    case "uncomfortable_manageable":
      return "medium";
    case "no_real_impact":
      return "high";
    case "tolerable_long_term":
      return timeHorizon === "5_10y" || timeHorizon === "10y_plus" ? "high" : "medium";
    case "not_sure":
    default:
      return "low";
  }
}

function mapRiskTolerance(answer: EmotionalReactionAnswer): RiskLevel {
  switch (answer) {
    case "close_positions":
    case "worried_would_change_strategy":
      return "low";
    case "wait_but_check_daily":
    case "keep_plan_if_understood":
      return "medium";
    case "increase_exposure":
      return "high";
    default:
      return "low";
  }
}

function mapCurrency(answer: string): Currency {
  return answer === "CRC" || answer === "USD" || answer === "mixed" ? answer : "other";
}

function mapBaseCurrency(answer: MeasurementCurrencyAnswer, spendingCurrency: Currency): Currency {
  return answer === "not_considered" ? spendingCurrency : mapCurrency(answer);
}

type ComplexityMapping = {
  financialKnowledge: FinancialKnowledge;
  complexityAllowed: ComplexityAllowed;
  prohibitedInstruments: ProhibitedInstrument[];
  allowsSmallCrypto: boolean;
};

const OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI: ProhibitedInstrument[] = ["options", "leverage", "margin", "short_selling", "defi"];

function mapComplexity(answer: ComplexityAnswer): ComplexityMapping {
  switch (answer) {
    case "cash_or_broad_etfs":
      return { financialKnowledge: "basic", complexityAllowed: "simple", prohibitedInstruments: OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI, allowsSmallCrypto: false };
    case "etfs_and_known_stocks":
      return { financialKnowledge: "intermediate", complexityAllowed: "moderate", prohibitedInstruments: OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI, allowsSmallCrypto: false };
    case "individual_stocks_sectors":
      return { financialKnowledge: "intermediate", complexityAllowed: "advanced", prohibitedInstruments: OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI, allowsSmallCrypto: false };
    case "small_crypto_component":
      return { financialKnowledge: "intermediate", complexityAllowed: "moderate", prohibitedInstruments: OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI, allowsSmallCrypto: true };
    case "complex_instruments":
      return { financialKnowledge: "advanced", complexityAllowed: "advanced", prohibitedInstruments: [], allowsSmallCrypto: false };
    case "not_sure_difference":
    default:
      return { financialKnowledge: "basic", complexityAllowed: "simple", prohibitedInstruments: OPTIONS_LEVERAGE_MARGIN_SHORT_DEFI, allowsSmallCrypto: false };
  }
}

type ExposureTier = "conservative" | "moderate" | "aggressive";

function deriveExposureTier(riskTolerance: RiskLevel, riskCapacity: RiskLevel): ExposureTier {
  if (riskCapacity === "low" || riskTolerance === "low") return "conservative";
  if (riskCapacity === "high" && riskTolerance === "high") return "aggressive";
  return "moderate";
}

const EXPOSURE_DEFAULTS: Record<ExposureTier, { maxSingleAssetExposurePct: number; maxSectorExposurePct: number; maxCryptoExposurePct: number }> = {
  conservative: { maxSingleAssetExposurePct: 10, maxSectorExposurePct: 25, maxCryptoExposurePct: 0 },
  moderate: { maxSingleAssetExposurePct: 10, maxSectorExposurePct: 30, maxCryptoExposurePct: 5 },
  aggressive: { maxSingleAssetExposurePct: 15, maxSectorExposurePct: 35, maxCryptoExposurePct: 10 },
};

/**
 * Deterministically builds an Investor Constitution v0.1 from a completed
 * intake questionnaire. Every branch resolves ambiguity toward the more
 * conservative outcome (narrower exposure limits, requiresHumanReview left
 * on) rather than guessing at investor intent.
 */
export function buildInvestorConstitutionFromIntake(
  answers: InvestorConstitutionIntakeAnswers,
  options: BuildInvestorConstitutionFromIntakeOptions = {}
): InvestorConstitution {
  const timeHorizon = mapTimeHorizon(answers.horizon);
  const riskCapacity = mapRiskCapacity(answers.riskCapacity, timeHorizon);
  const riskTolerance = mapRiskTolerance(answers.emotionalReaction);
  const liquidityRequirement = mapLiquidityRequirement(answers.nearTermNeed, timeHorizon);
  const emergencyReserveMonths = mapEmergencyReserveMonths(answers.emergencyReserve);

  const spendingCurrency = mapCurrency(answers.spendingCurrency);
  const baseCurrency = mapBaseCurrency(answers.measurementCurrency, spendingCurrency);

  const complexity = mapComplexity(answers.complexity);
  let complexityAllowed = complexity.complexityAllowed;
  if (riskCapacity === "low" && complexityAllowed === "advanced") {
    complexityAllowed = "moderate";
  }

  const isConcentrated = answers.concentration !== "diversified";
  const tier = deriveExposureTier(riskTolerance, riskCapacity);
  const exposureDefaults = EXPOSURE_DEFAULTS[tier];

  const maxSingleAssetExposurePct = isConcentrated
    ? Math.min(exposureDefaults.maxSingleAssetExposurePct, EXPOSURE_DEFAULTS.conservative.maxSingleAssetExposurePct)
    : exposureDefaults.maxSingleAssetExposurePct;
  const maxSectorExposurePct = isConcentrated
    ? Math.min(exposureDefaults.maxSectorExposurePct, EXPOSURE_DEFAULTS.conservative.maxSectorExposurePct)
    : exposureDefaults.maxSectorExposurePct;

  let maxCryptoExposurePct = complexity.allowsSmallCrypto ? exposureDefaults.maxCryptoExposurePct : 0;
  if (complexity.financialKnowledge === "basic") {
    maxCryptoExposurePct = complexity.allowsSmallCrypto ? Math.min(maxCryptoExposurePct, 5) : 0;
  }
  if (riskCapacity === "low") {
    maxCryptoExposurePct = 0;
  }
  if (answers.concentration === "crypto") {
    // Already overexposed to crypto outside this simulation — don't add more.
    maxCryptoExposurePct = 0;
  }

  const uncertaintyTriggered =
    answers.purpose === "not_sure" ||
    answers.horizon === "no_clear_date" ||
    answers.emergencyReserve === "not_sure" ||
    answers.nearTermNeed === "not_sure" ||
    answers.riskCapacity === "not_sure" ||
    answers.concentration === "not_sure" ||
    answers.complexity === "not_sure_difference" ||
    answers.summary === "not_sure_want_to_understand" ||
    answers.fomo === "want_in_fast";

  const requiresHumanReview =
    liquidityRequirement === "critical" ||
    uncertaintyTriggered ||
    answers.summary !== "accept_ups_downs_if_plan_makes_sense";

  const now = options.createdAt ?? new Date().toISOString();

  return {
    constitutionId: options.constitutionId ?? crypto.randomUUID(),
    version: 1,

    investorObjective: mapObjective(answers.purpose),
    timeHorizon,

    baseCurrency,
    spendingCurrency,

    liquidityRequirement,
    emergencyReserveMonths,

    riskTolerance,
    riskCapacity,

    financialKnowledge: complexity.financialKnowledge,
    complexityAllowed,

    hasDependents: false,
    debtLevel: "medium",

    maxSingleAssetExposurePct,
    maxCryptoExposurePct,
    maxSectorExposurePct,

    prohibitedInstruments: complexity.prohibitedInstruments,

    preferredReviewFrequency: "quarterly",
    requiresHumanReview,

    paperTradingOnly: true,

    createdAt: now,
    updatedAt: now,
  };
}
