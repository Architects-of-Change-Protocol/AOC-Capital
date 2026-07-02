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
export type TradeIntentSource = "manual" | "signal";
export type TradeIntentStatus = "pending" | "approved" | "rejected" | "closed";

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

export type PaperPositionRow = {
  id: string;
  company_id: string;
  portfolio_id: string;
  trade_intent_id: string;
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  entry_price: number;
  status: PaperPositionStatus;
  opened_at: string;
  closed_at: string | null;
  realized_pnl_usd: number;
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
  | "advisor_strategy_generated"
  | "advisor_constitution_generated";

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
