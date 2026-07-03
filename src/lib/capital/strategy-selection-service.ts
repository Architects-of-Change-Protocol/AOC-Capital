// AOC Capital Strategy Library — governed write path.
//
// The only place a strategy selection touches the database. Re-validates the
// strategyKey against the static library server-side (never trusts a
// client-supplied strategy name/risk-profile/symbols/capabilities), then
// calls select_portfolio_strategy_profile_and_audit()
// (20260908000000_aoc_capital_atomic_audit_writes.sql) through the existing
// privileged, service-role write path in src/lib/trading/trade-service.ts.
// That RPC upserts the tenant's single portfolio_strategy_profiles row and
// writes the strategy_selected audit event in one database transaction.
//
// This never creates a trade intent, never opens a paper position, and never
// touches risk_constitution_rules — selecting a strategy only records
// context. Governed state and its audit evidence share the same transaction
// boundary: if the audit insert inside the RPC fails, the profile upsert
// rolls back too, and if the profile upsert fails, the audit event is never
// written. There is no partial-write window and no separate application-level
// audit-ledger write for this flow.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultPortfolio, privileged } from "@/lib/trading/trade-service";
import type { PortfolioStrategyProfileRow } from "@/lib/trading/database-contract";
import { assertStrategyIsPaperOnly, getStrategyByKey, validateStrategySelection, type StrategyLibraryItem } from "./strategy-library";

const PORTFOLIO_STRATEGY_PROFILE_COLUMNS =
  "id,company_id,portfolio_id,strategy_key,strategy_name,risk_profile,supported_symbols,paper_only,real_execution_locked,selected_at,selected_by,created_at,updated_at";

export class UnknownStrategyKeyError extends Error {
  constructor(key: unknown) {
    super(typeof key === "string" ? `Unknown strategy key: ${key}` : "strategyKey is required.");
    this.name = "UnknownStrategyKeyError";
  }
}

/** Reads the currently selected strategy for this tenant's default portfolio, or null if none has been selected yet. Read-only. */
export async function getSelectedStrategyProfile(companyId: string): Promise<PortfolioStrategyProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("portfolio_strategy_profiles")
    .select(PORTFOLIO_STRATEGY_PROFILE_COLUMNS)
    .eq("company_id", companyId)
    .maybeSingle();
  return (data ?? null) as PortfolioStrategyProfileRow | null;
}

export type SelectStrategyInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  /** Raw, possibly client-supplied strategy key — validated against the static library, never trusted otherwise. */
  strategyKey: unknown;
};

export type SelectStrategyResult = {
  strategy: StrategyLibraryItem;
  profile: PortfolioStrategyProfileRow;
};

/**
 * Selects a strategy for the caller's tenant: validates strategyKey against
 * the static library, re-derives the full strategy config server-side, then
 * calls select_portfolio_strategy_profile_and_audit() to atomically upsert
 * the single portfolio_strategy_profiles row (one per portfolio, see the
 * unique(company_id, portfolio_id) constraint) and write the
 * strategy_selected audit event in one database transaction — governed state
 * without audit evidence is incomplete state, so the two never commit
 * separately. Never opens a paper position, never creates a trade intent,
 * and never enables real execution.
 */
export async function selectStrategy(input: SelectStrategyInput): Promise<SelectStrategyResult> {
  const validation = validateStrategySelection(input.strategyKey);
  if (!validation.ok) {
    throw new UnknownStrategyKeyError(input.strategyKey);
  }
  const strategy = validation.strategy;
  assertStrategyIsPaperOnly(strategy);

  const portfolio = await getOrCreateDefaultPortfolio(input.companyId);

  const supabase = privileged("capital/strategy-library", "select_strategy", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("select_portfolio_strategy_profile_and_audit", {
    p_company_id: input.companyId,
    p_portfolio_id: portfolio.id,
    p_strategy_key: strategy.key,
    p_strategy_name: strategy.name,
    p_risk_profile: strategy.riskProfile,
    p_supported_symbols: strategy.supportedSymbols,
    p_actor: input.actor,
    p_audit_payload: {
      paper_only: true,
      real_execution_locked: true,
      portfolio_id: portfolio.id,
      strategy_key: strategy.key,
      strategy_name: strategy.name,
      risk_profile: strategy.riskProfile,
      supported_symbols: strategy.supportedSymbols,
      allowed_capabilities: strategy.allowedCapabilities,
      blocked_capabilities: strategy.blockedCapabilities,
    },
  });

  if (error || !data) {
    throw new Error(`Unable to select strategy: ${error?.message ?? "unknown error"}`);
  }
  const profile = data as PortfolioStrategyProfileRow;

  return { strategy, profile };
}

/** A persisted strategy_key that no longer matches any entry in the static library (e.g. removed from STRATEGY_LIBRARY since it was selected). Display/governance context only — never implies execution is enabled or that a trade intent/paper position exists. */
export type StaleSelectedStrategy = {
  strategyKey: string;
  strategyName: string;
  reason: string;
};

export type ResolvedStrategySelection = {
  selectedStrategy: StrategyLibraryItem | null;
  staleSelectedStrategy: StaleSelectedStrategy | null;
  paperOnly: true;
  realExecutionLocked: true;
};

/**
 * Convenience lookup used by the GET route and the /capital/strategies page —
 * the display copy of a persisted selection, re-derived from the static
 * library rather than trusted from the DB row alone.
 *
 * If the persisted strategy_key no longer exists in STRATEGY_LIBRARY (it was
 * removed since the user selected it), this never crashes and never silently
 * looks like "no strategy was ever selected" — it surfaces a
 * staleSelectedStrategy warning instead. It never enables execution and never
 * creates a trade intent or paper position; realExecutionLocked stays true.
 */
export function resolveSelectedStrategy(profile: PortfolioStrategyProfileRow | null): ResolvedStrategySelection {
  if (!profile) {
    return { selectedStrategy: null, staleSelectedStrategy: null, paperOnly: true, realExecutionLocked: true };
  }
  const strategy = getStrategyByKey(profile.strategy_key);
  if (strategy) {
    return { selectedStrategy: strategy, staleSelectedStrategy: null, paperOnly: true, realExecutionLocked: true };
  }
  return {
    selectedStrategy: null,
    staleSelectedStrategy: {
      strategyKey: profile.strategy_key,
      strategyName: profile.strategy_name,
      reason: "This previously selected strategy is no longer available in the current library.",
    },
    paperOnly: true,
    realExecutionLocked: true,
  };
}
