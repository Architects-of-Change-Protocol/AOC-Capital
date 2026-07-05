// AOC Capital Strategy Playbook — Portfolio Simulation Builder domain (v0.1).
//
// Deterministic, side-effect-free logic for the first step of turning an
// eligible Strategy Registry entry into a paper-trading simulation draft: a
// default hypothetical allocation, assumption/allocation validation, and a
// PortfolioSimulationDraft. Nothing here calls an LLM, fetches live pricing,
// or persists anything — it only reads STRATEGY_REGISTRY entries and an
// already-generated InvestorConstitution, mirroring the pure-function shape
// of suitability-rules.ts and strategy-eligibility-summary.ts. Persisting a
// PortfolioSimulationDraft as a stored SimulationRecord is a later PR.

import type { InvestorConstitution } from "./investor-constitution-schema";
import type { AllocationRange, AssetClass, StrategyDefinition } from "./strategy-registry";
import { evaluateStrategySuitability, type SuitabilityFlag } from "./suitability-rules";
import {
  buildStrategyEligibilitySummary,
  type StrategyEligibilityCard,
} from "./strategy-eligibility-summary";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when buildPortfolioSimulationDraft is called with a strategy whose registry status isn't approved_for_simulation (advisor-review, locked, deprecated, blocked, or draft). */
export class StrategyStatusNotEligibleForSimulationError extends Error {
  constructor(strategyId: string, status: string) {
    super(
      `Strategy "${strategyId}" cannot be simulated: its status is "${status}", only approved_for_simulation strategies are eligible.`
    );
    this.name = "StrategyStatusNotEligibleForSimulationError";
  }
}

/** Thrown when the Suitability Consistency Engine blocks the (constitution, strategy) pair — the builder must never let a blocked strategy produce a draft. */
export class StrategyNotSuitableForConstitutionError extends Error {
  constructor(strategyId: string) {
    super(
      `Strategy "${strategyId}" is blocked by the Suitability Consistency Engine for this Investor Constitution.`
    );
    this.name = "StrategyNotSuitableForConstitutionError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type RebalanceFrequency = "none" | "monthly" | "quarterly" | "semiannual" | "annual";

export const REBALANCE_FREQUENCIES: RebalanceFrequency[] = ["none", "monthly", "quarterly", "semiannual", "annual"];

export interface SimulationAssumptions {
  initialAmount: number;
  monthlyContribution: number;
  timeHorizonYears: number;
  rebalanceFrequency: RebalanceFrequency;
}

export interface DraftSimulationAllocation {
  assetClass: AssetClass;
  percentage: number;
}

export type AllocationValidationSeverity = "info" | "warning" | "blocker";

export interface AllocationValidationIssue {
  code: string;
  severity: AllocationValidationSeverity;
  message: string;
  assetClass?: AssetClass;
}

export interface AllocationValidationResult {
  valid: boolean;
  issues: AllocationValidationIssue[];
  totalAllocationPct: number;
  normalizedAllocation?: DraftSimulationAllocation[];
}

export interface PortfolioSimulationDraft {
  draftId: string;
  /** Always "paper_trading" — this domain layer has no real-execution surface. */
  mode: "paper_trading";
  constitutionId: string;
  constitutionVersion: number;
  strategyId: string;
  strategyVersion: number;
  assumptions: SimulationAssumptions;
  allocation: DraftSimulationAllocation[];
  validation: AllocationValidationResult;
  suitabilityFlags: SuitabilityFlag[];
  /** Always true — paper trading only. */
  paperOnly: true;
  /** Always true — no path to real execution exists in this domain layer. */
  realExecutionLocked: true;
  createdAt: string;
}

export type SimulationBuilderEligibility = {
  selectable: StrategyEligibilityCard[];
  requiresAdvisorReview: StrategyEligibilityCard[];
  blockedByConstitution: StrategyEligibilityCard[];
  lockedAdvanced: StrategyEligibilityCard[];
  deprecatedOrBlocked: StrategyEligibilityCard[];
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  money_market: "Money market",
  short_term_bonds: "Short-term bonds",
  aggregate_bonds: "Aggregate bonds",
  us_equities: "US equities",
  global_equities: "Global equities",
  international_equities: "International equities",
  emerging_markets: "Emerging markets",
  dividend_equities: "Dividend equities",
  reits: "REITs",
  commodities: "Commodities",
  gold: "Gold",
  bitcoin_crypto: "Bitcoin (crypto)",
  thematic_etfs: "Thematic ETFs",
};

export function formatAssetClassLabel(assetClass: AssetClass): string {
  return ASSET_CLASS_LABELS[assetClass] ?? assetClass.replace(/_/g, " ");
}

export function summarizeAllocationRange(strategy: StrategyDefinition): string {
  const entries = Object.entries(strategy.allocationRanges) as [AssetClass, AllocationRange][];
  if (entries.length === 0) return "No allocation range defined.";
  return entries.map(([assetClass, range]) => `${formatAssetClassLabel(assetClass)} ${range.min}-${range.max}%`).join(", ");
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Clamps every allocation entry into its strategy range and applies the same
 * crypto/low-risk-capacity caps used elsewhere in this module. A convenience
 * helper for callers adjusting a draft allocation in place; it does not
 * renormalize the total back to 100.
 */
export function clampAllocationToRange(
  allocation: DraftSimulationAllocation[],
  strategy: StrategyDefinition,
  constitution: InvestorConstitution
): DraftSimulationAllocation[] {
  return allocation.map((entry) => {
    const range = strategy.allocationRanges[entry.assetClass];
    if (!range) return entry;

    let percentage = clampNumber(entry.percentage, range.min, range.max);

    if (entry.assetClass === "bitcoin_crypto") {
      if (constitution.prohibitedInstruments.includes("crypto") || constitution.riskCapacity === "low") {
        percentage = 0;
      } else {
        percentage = Math.min(percentage, constitution.maxCryptoExposurePct);
      }
    }

    return { assetClass: entry.assetClass, percentage: roundTo2(percentage) };
  });
}

/**
 * Redistributes a set of target percentages to sum to exactly 100 without
 * ever pushing any asset class outside its [min, max] range. Grows classes
 * with headroom below their max (or shrinks classes with headroom above
 * their min) proportionally to their available room, repeating until the
 * total converges or no class has any room left. Returns null if 100 cannot
 * be reached within the given ranges — callers must treat that as "no valid
 * allocation can be produced" rather than forcing an out-of-range value.
 *
 * priorityClasses (optional) are preferred when redistributing: any needed
 * growth is filled from priority classes' headroom before spilling into the
 * rest, and any needed shrinkage drains non-priority classes' room first,
 * protecting priority classes unless no other room remains. This is what
 * lets buildDefaultAllocationForStrategy bias toward cash/money_market
 * without a fixed target simply being averaged away again.
 */
export function normalizeAllocationToHundred(
  targets: Partial<Record<AssetClass, number>>,
  ranges: Partial<Record<AssetClass, AllocationRange>>,
  priorityClasses: AssetClass[] = []
): DraftSimulationAllocation[] | null {
  const classes = Object.keys(targets) as AssetClass[];
  if (classes.length === 0) return null;

  const values: Partial<Record<AssetClass, number>> = {};
  for (const assetClass of classes) {
    const range = ranges[assetClass];
    if (!range) return null;
    values[assetClass] = clampNumber(targets[assetClass] ?? range.min, range.min, range.max);
  }

  function distribute(pool: AssetClass[], amount: number, headroom: (c: AssetClass) => number, sign: 1 | -1): number {
    if (pool.length === 0 || amount <= 1e-9) return amount;
    const room = pool.map(headroom);
    const totalRoom = room.reduce((a, b) => a + b, 0);
    const applied = Math.min(amount, totalRoom);
    if (applied > 0) {
      pool.forEach((c, i) => {
        values[c] = (values[c] ?? 0) + sign * applied * (room[i] / totalRoom);
      });
    }
    return amount - applied;
  }

  for (let iteration = 0; iteration < 20; iteration++) {
    const total = classes.reduce((sum, c) => sum + (values[c] ?? 0), 0);
    const diff = 100 - total;
    if (Math.abs(diff) < 1e-6) break;

    if (diff > 0) {
      const growable = classes.filter((c) => (values[c] ?? 0) < ranges[c]!.max - 1e-9);
      if (growable.length === 0) return null;
      const priorityGrowable = growable.filter((c) => priorityClasses.includes(c));
      const otherGrowable = growable.filter((c) => !priorityClasses.includes(c));
      const headroom = (c: AssetClass) => ranges[c]!.max - (values[c] ?? 0);
      const remaining = distribute(priorityGrowable, diff, headroom, 1);
      distribute(otherGrowable, remaining, headroom, 1);
    } else {
      const shrinkable = classes.filter((c) => (values[c] ?? 0) > ranges[c]!.min + 1e-9);
      if (shrinkable.length === 0) return null;
      const nonPriorityShrinkable = shrinkable.filter((c) => !priorityClasses.includes(c));
      const priorityShrinkable = shrinkable.filter((c) => priorityClasses.includes(c));
      const headroom = (c: AssetClass) => (values[c] ?? 0) - ranges[c]!.min;
      const need = -diff;
      const remaining = distribute(nonPriorityShrinkable, need, headroom, -1);
      distribute(priorityShrinkable, remaining, headroom, -1);
    }
  }

  let finalTotal = classes.reduce((sum, c) => sum + (values[c] ?? 0), 0);
  if (Math.abs(finalTotal - 100) > 0.5) return null;

  for (const assetClass of classes) {
    values[assetClass] = roundTo2(values[assetClass] ?? 0);
  }
  finalTotal = roundTo2(classes.reduce((sum, c) => sum + (values[c] ?? 0), 0));
  const roundingDiff = roundTo2(100 - finalTotal);

  if (roundingDiff !== 0) {
    let bestClass = classes[0];
    let bestHeadroom = -Infinity;
    for (const assetClass of classes) {
      const range = ranges[assetClass]!;
      const headroom = roundingDiff > 0 ? range.max - (values[assetClass] ?? 0) : (values[assetClass] ?? 0) - range.min;
      if (headroom > bestHeadroom) {
        bestHeadroom = headroom;
        bestClass = assetClass;
      }
    }
    if (bestHeadroom + 1e-6 < Math.abs(roundingDiff)) return null;
    values[bestClass] = roundTo2((values[bestClass] ?? 0) + roundingDiff);
  }

  return classes.map((assetClass) => ({ assetClass, percentage: values[assetClass] ?? 0 }));
}

// ─── Default allocation ──────────────────────────────────────────────────────

/** Asset classes treated as higher-volatility satellite exposure, deprioritized for low risk capacity, basic financial knowledge, or simple complexity tolerance. */
const HIGH_VOLATILITY_SATELLITE_CLASSES: AssetClass[] = [
  "thematic_etfs",
  "emerging_markets",
  "commodities",
  "gold",
  "reits",
  "bitcoin_crypto",
];

/** Asset classes biased toward when the investor's liquidity requirement is critical or high. */
const LIQUIDITY_PRIORITY_CLASSES: AssetClass[] = ["cash", "money_market"];

type DefaultAllocationPlan = {
  targets: Partial<Record<AssetClass, number>>;
  /**
   * Ranges used for normalization — usually identical to the strategy's own
   * allocationRanges, but with a locked [x, x] range substituted for any
   * asset class that must be suppressed (e.g. crypto with a prohibited
   * constitution) or deprioritized (e.g. a satellite class under low risk
   * capacity) at its target, so redistribution can never grow it back out.
   */
  effectiveRanges: Partial<Record<AssetClass, AllocationRange>>;
  priorityClasses: AssetClass[];
};

function computeDefaultAllocationPlan(
  strategy: StrategyDefinition,
  constitution: InvestorConstitution,
  eligible: AssetClass[]
): DefaultAllocationPlan {
  const targets: Partial<Record<AssetClass, number>> = {};
  const effectiveRanges: Partial<Record<AssetClass, AllocationRange>> = {};

  for (const assetClass of eligible) {
    const range = strategy.allocationRanges[assetClass]!;
    targets[assetClass] = (range.min + range.max) / 2;
    effectiveRanges[assetClass] = range;
  }

  const lowRiskCapacity = constitution.riskCapacity === "low";
  const conservativeKnowledgeOrComplexity = constitution.financialKnowledge === "basic" || constitution.complexityAllowed === "simple";

  for (const assetClass of HIGH_VOLATILITY_SATELLITE_CLASSES) {
    if (!(assetClass in targets)) continue;
    const range = strategy.allocationRanges[assetClass]!;

    if (assetClass === "bitcoin_crypto") {
      if (constitution.prohibitedInstruments.includes("crypto") || lowRiskCapacity || constitution.financialKnowledge === "basic") {
        targets[assetClass] = 0;
        effectiveRanges[assetClass] = { min: 0, max: 0 };
      } else {
        const cappedMax = Math.min(range.max, constitution.maxCryptoExposurePct);
        targets[assetClass] = clampNumber(targets[assetClass]!, range.min, cappedMax);
        effectiveRanges[assetClass] = { min: range.min, max: cappedMax };
      }
      continue;
    }

    if (assetClass === "thematic_etfs" && constitution.prohibitedInstruments.includes("thematic_etfs")) {
      targets[assetClass] = 0;
      effectiveRanges[assetClass] = { min: 0, max: 0 };
      continue;
    }

    if (lowRiskCapacity || conservativeKnowledgeOrComplexity) {
      // Deprioritized, not suppressed — lock at its floor so redistribution
      // never grows it back out while still leaving room for it to shrink
      // further if the strategy's own minimum is itself 0.
      targets[assetClass] = range.min;
      effectiveRanges[assetClass] = { min: range.min, max: range.min };
    }
  }

  const priorityClasses: AssetClass[] = [];
  const highLiquidityNeed = constitution.liquidityRequirement === "critical" || constitution.liquidityRequirement === "high";
  if (highLiquidityNeed) {
    for (const assetClass of LIQUIDITY_PRIORITY_CLASSES) {
      if (!(assetClass in targets)) continue;
      targets[assetClass] = effectiveRanges[assetClass]!.max;
      priorityClasses.push(assetClass);
    }
  }

  return { targets, effectiveRanges, priorityClasses };
}

/**
 * Builds a deterministic default allocation for a strategy under a given
 * Investor Constitution, using only the strategy's own allowed asset classes
 * and allocation ranges. No randomness, no AI, no live pricing, no return
 * optimization — every input is either the strategy's static ranges or the
 * constitution's static limits. Returns an empty allocation (a safe fallback
 * that validateDraftSimulationAllocation will flag as empty_allocation)
 * rather than forcing an out-of-range value if a valid 100% allocation cannot
 * be produced.
 */
export function buildDefaultAllocationForStrategy(
  strategy: StrategyDefinition,
  constitution: InvestorConstitution
): DraftSimulationAllocation[] {
  const eligible = (Object.keys(strategy.allocationRanges) as AssetClass[]).filter((assetClass) =>
    strategy.allowedAssetClasses.includes(assetClass)
  );
  if (eligible.length === 0) return [];

  const { targets, effectiveRanges, priorityClasses } = computeDefaultAllocationPlan(strategy, constitution, eligible);
  const normalized = normalizeAllocationToHundred(targets, effectiveRanges, priorityClasses);
  return normalized ?? [];
}

// ─── Assumptions validation ──────────────────────────────────────────────────

/**
 * Validates paper simulation assumptions in isolation from any strategy or
 * constitution — these are structural bounds (positive amounts, a known
 * rebalance frequency), not suitability judgments.
 */
export function validateSimulationAssumptions(assumptions: SimulationAssumptions): AllocationValidationIssue[] {
  const issues: AllocationValidationIssue[] = [];

  if (!(assumptions.initialAmount > 0)) {
    issues.push({
      code: "invalid_initial_amount",
      severity: "blocker",
      message: "Initial simulated amount must be greater than 0.",
    });
  }

  if (!(assumptions.monthlyContribution >= 0)) {
    issues.push({
      code: "invalid_monthly_contribution",
      severity: "blocker",
      message: "Monthly simulated contribution cannot be negative.",
    });
  }

  if (!(assumptions.timeHorizonYears > 0)) {
    issues.push({
      code: "invalid_time_horizon",
      severity: "blocker",
      message: "Simulation horizon must be greater than 0 years.",
    });
  }

  if (!REBALANCE_FREQUENCIES.includes(assumptions.rebalanceFrequency)) {
    issues.push({
      code: "invalid_rebalance_frequency",
      severity: "blocker",
      message: "Rebalance frequency must be one of none, monthly, quarterly, semiannual, or annual.",
    });
  }

  return issues;
}

// ─── Allocation validation ───────────────────────────────────────────────────

const ALLOCATION_TOTAL_TOLERANCE = 0.01;

/**
 * Validates a draft allocation against the selected strategy's rules and the
 * Investor Constitution's limits. Every issue is deterministic and derived
 * only from strategy.allocationRanges/allowedAssetClasses and constitution
 * fields — never from live pricing or an LLM.
 */
export function validateDraftSimulationAllocation({
  constitution,
  strategy,
  allocation,
}: {
  constitution: InvestorConstitution;
  strategy: StrategyDefinition;
  allocation: DraftSimulationAllocation[];
}): AllocationValidationResult {
  const issues: AllocationValidationIssue[] = [];

  if (allocation.length === 0) {
    issues.push({ code: "empty_allocation", severity: "blocker", message: "Allocation cannot be empty." });
  }

  for (const entry of allocation) {
    const label = formatAssetClassLabel(entry.assetClass);

    if (entry.percentage < 0) {
      issues.push({
        code: "negative_allocation",
        severity: "blocker",
        message: `${label} allocation cannot be negative.`,
        assetClass: entry.assetClass,
      });
    }

    if (entry.percentage > 100) {
      issues.push({
        code: "allocation_above_100",
        severity: "blocker",
        message: `${label} allocation cannot exceed 100%.`,
        assetClass: entry.assetClass,
      });
    }

    if (!strategy.allowedAssetClasses.includes(entry.assetClass)) {
      issues.push({
        code: "asset_class_not_allowed",
        severity: "blocker",
        message: `${label} is not an allowed asset class for ${strategy.name}.`,
        assetClass: entry.assetClass,
      });
      continue;
    }

    const range = strategy.allocationRanges[entry.assetClass];
    if (!range) {
      issues.push({
        code: "missing_allocation_range",
        severity: "blocker",
        message: `${label} has no defined allocation range for ${strategy.name}.`,
        assetClass: entry.assetClass,
      });
      continue;
    }

    if (entry.percentage < range.min) {
      issues.push({
        code: "allocation_below_strategy_min",
        severity: "blocker",
        message: `${label} allocation (${entry.percentage}%) is below the strategy minimum (${range.min}%).`,
        assetClass: entry.assetClass,
      });
    }

    if (entry.percentage > range.max) {
      issues.push({
        code: "allocation_above_strategy_max",
        severity: "blocker",
        message: `${label} allocation (${entry.percentage}%) exceeds the strategy maximum (${range.max}%).`,
        assetClass: entry.assetClass,
      });
    }

    if (entry.assetClass === "bitcoin_crypto") {
      if (constitution.prohibitedInstruments.includes("crypto")) {
        issues.push({
          code: "crypto_prohibited",
          severity: "blocker",
          message: "The Investor Constitution prohibits crypto exposure.",
          assetClass: entry.assetClass,
        });
      }

      if (constitution.riskCapacity === "low") {
        issues.push({
          code: "crypto_blocked_by_low_capacity",
          severity: "blocker",
          message: "Low risk capacity requires crypto exposure to be 0%.",
          assetClass: entry.assetClass,
        });
      }

      if (entry.percentage > constitution.maxCryptoExposurePct) {
        issues.push({
          code: "crypto_exceeds_constitution_limit",
          severity: "blocker",
          message: `Crypto allocation (${entry.percentage}%) exceeds the Investor Constitution's max crypto exposure (${constitution.maxCryptoExposurePct}%).`,
          assetClass: entry.assetClass,
        });
      }
    }

    if (entry.assetClass === "thematic_etfs" && constitution.prohibitedInstruments.includes("thematic_etfs")) {
      issues.push({
        code: "thematic_exposure_prohibited",
        severity: "blocker",
        message: "The Investor Constitution prohibits thematic ETF exposure.",
        assetClass: entry.assetClass,
      });
    }
  }

  const totalAllocationPct = roundTo2(allocation.reduce((sum, entry) => sum + entry.percentage, 0));

  if (allocation.length > 0) {
    if (totalAllocationPct < 100 - ALLOCATION_TOTAL_TOLERANCE) {
      issues.push({
        code: "allocation_total_below_100",
        severity: "blocker",
        message: `Total allocation (${totalAllocationPct}%) is below 100%.`,
      });
    } else if (totalAllocationPct > 100 + ALLOCATION_TOTAL_TOLERANCE) {
      issues.push({
        code: "allocation_total_above_100",
        severity: "blocker",
        message: `Total allocation (${totalAllocationPct}%) exceeds 100%.`,
      });
    }
  }

  const valid = !issues.some((issue) => issue.severity === "blocker");

  return { valid, issues, totalAllocationPct, normalizedAllocation: suggestNormalizedAllocation(strategy, allocation) };
}

/** Best-effort "what would a valid 100% allocation look like" suggestion, attached to the validation result so the UI can offer a one-click fix. Returns undefined if any asset class is unknown to the strategy or no valid normalization exists. */
function suggestNormalizedAllocation(
  strategy: StrategyDefinition,
  allocation: DraftSimulationAllocation[]
): DraftSimulationAllocation[] | undefined {
  if (allocation.length === 0) return undefined;

  const targets: Partial<Record<AssetClass, number>> = {};
  for (const entry of allocation) {
    if (!strategy.allocationRanges[entry.assetClass]) return undefined;
    targets[entry.assetClass] = entry.percentage;
  }

  return normalizeAllocationToHundred(targets, strategy.allocationRanges) ?? undefined;
}

// ─── Draft assembly ──────────────────────────────────────────────────────────

export type BuildPortfolioSimulationDraftInput = {
  constitution: InvestorConstitution;
  strategy: StrategyDefinition;
  assumptions: SimulationAssumptions;
  allocation: DraftSimulationAllocation[];
};

export type BuildPortfolioSimulationDraftOptions = {
  draftId?: string;
  createdAt?: string;
};

/**
 * Assembles a PortfolioSimulationDraft from an already-selected strategy,
 * constitution, assumptions, and allocation. Rejects (throws) if the
 * strategy itself is not eligible to be simulated at all — wrong registry
 * status, or blocked by the Suitability Consistency Engine — since those are
 * preconditions the UI should never have allowed the user to reach. Assumption
 * and allocation problems, by contrast, are user-correctable, so those come
 * back as validation.valid = false with issues rather than a thrown error.
 */
export function buildPortfolioSimulationDraft(
  input: BuildPortfolioSimulationDraftInput,
  options: BuildPortfolioSimulationDraftOptions = {}
): PortfolioSimulationDraft {
  const { constitution, strategy, assumptions, allocation } = input;

  if (strategy.status !== "approved_for_simulation") {
    throw new StrategyStatusNotEligibleForSimulationError(strategy.strategyId, strategy.status);
  }

  const suitability = evaluateStrategySuitability(constitution, strategy);
  if (!suitability.allowed) {
    throw new StrategyNotSuitableForConstitutionError(strategy.strategyId);
  }

  const assumptionIssues = validateSimulationAssumptions(assumptions);
  const allocationResult = validateDraftSimulationAllocation({ constitution, strategy, allocation });

  const validation: AllocationValidationResult = {
    valid: allocationResult.valid && !assumptionIssues.some((issue) => issue.severity === "blocker"),
    issues: [...assumptionIssues, ...allocationResult.issues],
    totalAllocationPct: allocationResult.totalAllocationPct,
    normalizedAllocation: allocationResult.normalizedAllocation,
  };

  return {
    draftId: options.draftId ?? crypto.randomUUID(),
    mode: "paper_trading",
    constitutionId: constitution.constitutionId,
    constitutionVersion: constitution.version,
    strategyId: strategy.strategyId,
    strategyVersion: strategy.version,
    assumptions,
    allocation,
    validation,
    suitabilityFlags: suitability.flags,
    paperOnly: true,
    realExecutionLocked: true,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

// ─── Builder eligibility ─────────────────────────────────────────────────────

/**
 * Groups every Strategy Registry entry into the buckets the simulation
 * builder needs: selectable (approved_for_simulation and suitable) versus the
 * unavailable groups it must still show for transparency. Reuses
 * buildStrategyEligibilitySummary rather than re-deriving suitability.
 */
export function getSimulationBuilderEligibility(constitution: InvestorConstitution): SimulationBuilderEligibility {
  const summary = buildStrategyEligibilitySummary(constitution);
  return {
    selectable: summary.availableForSimulation,
    requiresAdvisorReview: summary.requiresAdvisorReview,
    blockedByConstitution: summary.blockedByConstitution,
    lockedAdvanced: summary.lockedAdvanced,
    deprecatedOrBlocked: summary.deprecatedOrBlocked,
  };
}
