// TypeScript mirror of supabase/migrations/20260901000000_aoc_capital_paper_trading.sql.
// Kept separate from src/lib/db/database-contract.ts (the legacy PM/PMO contract)
// so the AOC Capital paper-trading module has its own independent schema surface.

export type PortfolioStatus = "active" | "archived";

export type PortfolioRow = {
  id: string;
  company_id: string;
  name: string;
  base_capital_usd: number;
  status: PortfolioStatus;
  created_at: string;
};

export type MarketSignalType = "momentum" | "mean_reversion" | "volatility" | "manual";
export type MarketSignalDirection = "long" | "short" | "neutral";

export type MarketSignalRow = {
  id: string;
  company_id: string;
  symbol: string;
  signal_type: MarketSignalType;
  direction: MarketSignalDirection;
  confidence: number;
  note: string | null;
  created_at: string;
};

export type TradeIntentSide = "buy" | "sell";
/** 'signal_recommendation' = converted from a Signal Engine v1 paper_signal_recommendations row (see paper_signal_recommendation_id below); 'signal' = the older, unrelated market_signals-based flow (signal_id). */
export type TradeIntentSource = "manual" | "signal" | "signal_recommendation";
/** 'draft' = created from a signal handoff, never evaluated by the risk policy engine and never opened as a paper position — see 20260909000000_aoc_capital_signal_trade_intent_draft_handoff.sql. */
export type TradeIntentStatus = "draft" | "pending" | "approved" | "rejected" | "closed";

export type TradeIntentRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  notional_usd: number;
  leverage: number;
  source: TradeIntentSource;
  signal_id: string | null;
  /** Set when source = 'signal_recommendation' — the paper_signal_recommendations row this draft was converted from. */
  paper_signal_recommendation_id: string | null;
  status: TradeIntentStatus;
  created_by: string;
  created_at: string;
};

export type TradeDecisionVerdict = "approved" | "rejected";

export type TradeDecisionReason = {
  ruleKey: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type TradeDecisionRow = {
  id: string;
  company_id: string;
  trade_intent_id: string;
  verdict: TradeDecisionVerdict;
  reasons: TradeDecisionReason[];
  policy_version: string;
  decided_at: string;
};

export type PaperPositionStatus = "open" | "closed";

export type CloseReason =
  | "user_requested"
  | "risk_review"
  | "strategy_exit"
  | "stop_loss"
  | "take_profit"
  | "system_rebalance"
  | "manual_test";

export const CLOSE_REASONS: CloseReason[] = [
  "user_requested",
  "risk_review",
  "strategy_exit",
  "stop_loss",
  "take_profit",
  "system_rebalance",
  "manual_test",
];

export type PaperPositionRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  trade_intent_id: string;
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  entry_price_usd: number;
  entry_notional_usd: number;
  current_price_usd: number;
  current_notional_usd: number;
  unrealized_pnl_usd: number;
  unrealized_pnl_pct: number;
  realized_pnl_usd: number;
  status: PaperPositionStatus;
  opened_at: string;
  closed_at: string | null;
  close_price_usd: number | null;
  close_reason: CloseReason | null;
  last_marked_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 'live_public' (not 'live') — a read-only public price feed, never live trading or live order execution. */
export type PaperMarketPriceSource = "mock" | "manual" | "live_public";

export type PaperMarketPriceRow = {
  id: string;
  company_id: string;
  symbol: string;
  price_usd: number;
  as_of: string;
  source: PaperMarketPriceSource;
  /** External provider that served a 'live_public' price (e.g. 'coingecko'); null for 'mock' and 'manual' rows. */
  provider: string | null;
  created_at: string;
};

export type RiskConstitutionRuleRow = {
  id: string;
  company_id: string;
  rule_key: string;
  label: string;
  limit_value: number | null;
  is_active: boolean;
  level: number;
  description: string;
  created_at: string;
};

export type CapitalLevelStatus = "locked" | "active" | "breached";

export type CapitalLevelRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  level_name: string;
  threshold_usd: number;
  status: CapitalLevelStatus;
  created_at: string;
};

export type AuditLedgerEventType =
  | "trade_intent_created"
  | "trade_decision_approved"
  | "trade_decision_rejected"
  | "position_opened"
  | "position_closed"
  | "position_marked_to_market"
  | "advisor_strategy_generated"
  | "advisor_constitution_generated"
  | "demo_scenario_loaded"
  | "demo_scenario_reset"
  | "strategy_selected"
  | "signals_generated"
  | "signal_converted_to_draft_trade_intent"
  | "trade_intent_submitted_for_review";

export type AuditLedgerRow = {
  id: string;
  company_id: string;
  event_type: AuditLedgerEventType;
  subject_type: string;
  subject_id: string;
  actor: string;
  payload: Record<string, unknown>;
  occurred_at: string;
};

/** Persisted selection from the Strategy Library — see 20260906000000_aoc_capital_strategy_library.sql. Always paper-only; see src/lib/capital/strategy-library.ts for the source of truth on strategy config. */
export type PortfolioStrategyProfileRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  strategy_key: string;
  strategy_name: string;
  risk_profile: string;
  supported_symbols: string[];
  paper_only: true;
  real_execution_locked: true;
  selected_at: string;
  selected_by: string | null;
  created_at: string;
  updated_at: string;
};

/** A persisted paper signal recommendation from the Signal Engine — see 20260907000000_aoc_capital_signal_engine.sql and src/lib/capital/signal-engine.ts. A recommendation only; never a trade intent or paper position. */
export type PaperSignalRecommendationRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  strategy_key: string;
  strategy_name: string;
  symbol: string;
  action: string;
  strength: string;
  confidence_score: number;
  suggested_notional_usd: number | null;
  market_price_usd: number | null;
  market_data_source: string;
  rationale: string[];
  risk_notes: string[];
  blocked_reasons: string[];
  required_user_action: string;
  paper_only: true;
  real_execution_locked: true;
  status: string;
  /** Set once this signal has been converted to a draft trade intent — see src/lib/capital/signal-trade-intent-handoff-service.ts. A signal can be converted at most once. */
  converted_trade_intent_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
  generated_at: string;
  created_at: string;
};
