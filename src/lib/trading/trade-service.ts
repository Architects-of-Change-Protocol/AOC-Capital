import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { PortfolioRiskState } from "./risk-policy-engine";
import { getSimulatedPrice, timeBucketStart } from "./mock-price-generator";
import {
  fetchLivePrice,
  getLiveMarketDataProvider,
  isLivePublicMarketDataEnabled,
  LivePriceUnavailableError,
  LIVE_PRICE_BUCKET_MINUTES,
} from "./live-price-provider";
import { computePortfolioSummary, type PortfolioSummary } from "./portfolio-summary";
import { computeStrategyPerformance, type StrategyPerformance } from "./strategy-performance";
import type {
  AuditLedgerRow,
  CapitalLevelRow,
  CloseReason,
  MarketSignalRow,
  PaperMarketPriceSource,
  PaperPositionRow,
  PortfolioRow,
  RiskConstitutionRuleRow,
  TradeDecisionRow,
  TradeIntentRow,
  TradeIntentSide,
} from "./database-contract";

const PAPER_POSITION_COLUMNS =
  "id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price_usd,entry_notional_usd,current_price_usd,current_notional_usd,unrealized_pnl_usd,unrealized_pnl_pct,realized_pnl_usd,status,opened_at,closed_at,close_price_usd,close_reason,last_marked_at,created_at,updated_at";

export class PaperPositionNotFoundError extends Error {
  constructor(positionId: string) {
    super(`Paper position ${positionId} not found for this workspace.`);
    this.name = "PaperPositionNotFoundError";
  }
}

export class PaperPositionNotOpenError extends Error {
  constructor(positionId: string) {
    super(`Paper position ${positionId} is not open.`);
    this.name = "PaperPositionNotOpenError";
  }
}

const DEFAULT_PORTFOLIO_NAME = "AOC Capital Paper Portfolio";
const DEFAULT_BASE_CAPITAL_USD = 1000;

const MOCK_SIGNAL_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "AAPL", "SPY"] as const;

/** Symbols shown on the Market Data screen — the same universe as MOCK_SIGNAL_SYMBOLS plus AVAX-USD. */
const TRACKED_MARKET_DATA_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD", "AAPL", "SPY"] as const;

export const DEFAULT_RISK_CONSTITUTION_RULES: Array<Pick<RiskConstitutionRuleRow, "rule_key" | "label" | "limit_value" | "level" | "description">> = [
  { rule_key: "no_leverage", label: "No leverage", limit_value: 1, level: 1, description: "Every paper trade must use 1x exposure. Leveraged trade intents are rejected." },
  { rule_key: "no_real_shorts", label: "No real shorts", limit_value: null, level: 1, description: "Short-side trade intents are rejected outright at Level 1." },
  { rule_key: "max_simulated_exposure", label: "Max 60% simulated exposure", limit_value: 0.6, level: 1, description: "Total open notional may not exceed 60% of the portfolio's base simulated capital." },
  { rule_key: "max_daily_simulated_loss", label: "Max daily simulated loss $20", limit_value: 20, level: 1, description: "New trade intents are rejected once the portfolio's simulated loss for the day reaches $20." },
  { rule_key: "max_weekly_simulated_loss", label: "Max weekly simulated loss $40", limit_value: 40, level: 1, description: "New trade intents are rejected once the portfolio's simulated loss for the trailing 7 days reaches $40." },
  { rule_key: "max_open_positions", label: "Max 3 open paper positions", limit_value: 3, level: 1, description: "No more than 3 paper positions may be open at once." },
  { rule_key: "mandatory_policy_evaluation", label: "Mandatory policy evaluation", limit_value: null, level: 1, description: "Every trade intent must be evaluated by the risk policy engine before it can become a paper position." },
  { rule_key: "mandatory_audit_ledger", label: "Mandatory audit ledger", limit_value: null, level: 1, description: "Every approval or rejection is written to the audit ledger." },
];

async function client() {
  return createSupabaseServerClient();
}

/**
 * Governed trading tables are RLS-locked to SELECT-only for authenticated tenant
 * members (see 20260901020000_aoc_capital_governed_writes.sql) — a browser
 * Supabase client cannot write to trade_intents/paper_positions/trade_decisions/
 * audit_ledger/etc directly. All writes go through this privileged, server-only
 * client instead, so the risk policy engine can't be bypassed from the client.
 */
export function privileged(routeId: string, operation: string, companyId: string, actorUserId?: string) {
  return createSupabaseServiceRoleClient({
    routeId,
    operation,
    reason: "aoc_capital_governed_write",
    workspaceId: companyId,
    ...(actorUserId ? { actorUserId } : { systemActor: "system" as const }),
  });
}

export async function getOrCreateDefaultPortfolio(companyId: string): Promise<PortfolioRow> {
  const supabase = privileged("trading/portfolio", "get_or_create_default_portfolio", companyId);
  const { data: existing } = await supabase
    .from("portfolios")
    .select("id,company_id,name,base_capital_usd,status,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as PortfolioRow;

  const { data: created, error } = await supabase
    .from("portfolios")
    .insert({ company_id: companyId, name: DEFAULT_PORTFOLIO_NAME, base_capital_usd: DEFAULT_BASE_CAPITAL_USD, status: "active" })
    .select("id,company_id,name,base_capital_usd,status,created_at")
    .single();

  if (error) {
    // A concurrent request may have won the race to create the default portfolio
    // (portfolios.company_id has a unique constraint) — fall back to the row it created.
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("portfolios")
        .select("id,company_id,name,base_capital_usd,status,created_at")
        .eq("company_id", companyId)
        .single();
      if (raced) return raced as PortfolioRow;
    }
    throw new Error(`Unable to create default portfolio: ${error.message}`);
  }
  if (!created) throw new Error("Unable to create default portfolio: no row returned.");
  return created as PortfolioRow;
}

export async function ensureRiskConstitution(companyId: string): Promise<RiskConstitutionRuleRow[]> {
  const supabase = privileged("trading/risk-constitution", "ensure_risk_constitution", companyId);
  const { data: existing } = await supabase
    .from("risk_constitution_rules")
    .select("id,company_id,rule_key,label,limit_value,is_active,level,description,created_at")
    .eq("company_id", companyId);

  if (existing && existing.length > 0) return existing as RiskConstitutionRuleRow[];

  const { data: seeded, error } = await supabase
    .from("risk_constitution_rules")
    .insert(DEFAULT_RISK_CONSTITUTION_RULES.map((rule) => ({ ...rule, company_id: companyId, is_active: true })))
    .select("id,company_id,rule_key,label,limit_value,is_active,level,description,created_at");

  if (error || !seeded) throw new Error(`Unable to seed risk constitution: ${error?.message ?? "unknown error"}`);
  return seeded as RiskConstitutionRuleRow[];
}

export async function ensureCapitalLevels(companyId: string, portfolio: PortfolioRow): Promise<CapitalLevelRow[]> {
  const supabase = privileged("trading/capital-levels", "ensure_capital_levels", companyId);
  const { data: existing } = await supabase
    .from("capital_levels")
    .select("id,company_id,portfolio_id,level_name,threshold_usd,status,created_at")
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolio.id);

  if (existing && existing.length > 0) return existing as CapitalLevelRow[];

  const tiers = [
    { level_name: "Foundation", ratio: 0.25, status: "active" as const },
    { level_name: "Growth", ratio: 0.5, status: "locked" as const },
    { level_name: "Scale", ratio: 0.75, status: "locked" as const },
    { level_name: "Ceiling", ratio: 1, status: "locked" as const },
  ];

  const { data: seeded, error } = await supabase
    .from("capital_levels")
    .insert(
      tiers.map((tier) => ({
        company_id: companyId,
        portfolio_id: portfolio.id,
        level_name: tier.level_name,
        threshold_usd: Math.round(portfolio.base_capital_usd * tier.ratio * 100) / 100,
        status: tier.status,
      }))
    )
    .select("id,company_id,portfolio_id,level_name,threshold_usd,status,created_at");

  if (error || !seeded) throw new Error(`Unable to seed capital levels: ${error?.message ?? "unknown error"}`);
  return seeded as CapitalLevelRow[];
}

/**
 * Sets the portfolio's simulated base capital — used by the AOC Capital Advisor
 * to apply its Recommended Capital Level only after the user confirms. This is
 * paper capital only; it never touches real money or an exchange balance.
 */
export async function updatePortfolioBaseCapital(companyId: string, portfolioId: string, baseCapitalUsd: number, actorUserId: string): Promise<PortfolioRow> {
  const supabase = privileged("trading/portfolio", "advisor_update_base_capital", companyId, actorUserId);
  const { data, error } = await supabase
    .from("portfolios")
    .update({ base_capital_usd: baseCapitalUsd })
    .eq("id", portfolioId)
    .eq("company_id", companyId)
    .select("id,company_id,name,base_capital_usd,status,created_at")
    .single();

  if (error || !data) throw new Error(`Unable to update portfolio base capital: ${error?.message ?? "unknown error"}`);
  return data as PortfolioRow;
}

export type AdvisorConstitutionRuleInput = Pick<RiskConstitutionRuleRow, "rule_key" | "label" | "limit_value" | "level" | "description">;

/**
 * Upserts the risk constitution rows generated by the AOC Capital Advisor. These
 * rows remain a display/audit copy of the constitution (as with
 * DEFAULT_RISK_CONSTITUTION_RULES above) — the SQL enforcement copy in
 * evaluate_and_record_trade_intent() is the authoritative Level 1 ceiling and is
 * untouched by this call, so advisor-tailored limits can only be equal to or
 * tighter than Level 1, never looser (enforced by src/lib/advisor/constitution.ts).
 */
export async function applyAdvisorConstitution(companyId: string, rules: AdvisorConstitutionRuleInput[], actorUserId: string): Promise<RiskConstitutionRuleRow[]> {
  const supabase = privileged("trading/risk-constitution", "advisor_apply_constitution", companyId, actorUserId);
  const { data, error } = await supabase
    .from("risk_constitution_rules")
    .upsert(
      rules.map((rule) => ({ ...rule, company_id: companyId, is_active: true })),
      { onConflict: "company_id,rule_key" }
    )
    .select("id,company_id,rule_key,label,limit_value,is_active,level,description,created_at");

  if (error || !data) throw new Error(`Unable to apply advisor constitution: ${error?.message ?? "unknown error"}`);
  return data as RiskConstitutionRuleRow[];
}

export type AuditLedgerInsert = Pick<AuditLedgerRow, "company_id" | "event_type" | "subject_type" | "subject_id" | "actor" | "payload">;

/** Generic governed audit-ledger write, used by callers outside the trade-intent RPC (e.g. the advisor). */
export async function recordAuditEvent(row: AuditLedgerInsert, actorUserId: string): Promise<AuditLedgerRow> {
  const supabase = privileged("trading/audit-ledger", "record_audit_event", row.company_id, actorUserId);
  const { data, error } = await supabase
    .from("audit_ledger")
    .insert(row)
    .select("id,company_id,event_type,subject_type,subject_id,actor,payload,occurred_at")
    .single();

  if (error || !data) throw new Error(`Unable to record audit event: ${error?.message ?? "unknown error"}`);
  return data as AuditLedgerRow;
}

/** Deterministic mock market signal feed — no live exchange connection. Seeds once per UTC day. */
export async function listMarketSignals(companyId: string): Promise<MarketSignalRow[]> {
  const supabase = await client();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: todaysSignals } = await supabase
    .from("market_signals")
    .select("id,company_id,symbol,signal_type,direction,confidence,note,created_at")
    .eq("company_id", companyId)
    .gte("created_at", todayStart.toISOString());

  if (todaysSignals && todaysSignals.length > 0) {
    return fetchRecentSignals(companyId);
  }

  const seedDate = todayStart.toISOString().slice(0, 10);
  const mock = MOCK_SIGNAL_SYMBOLS.map((symbol, index) => {
    const seed = hashSeed(`${seedDate}:${symbol}`);
    const signalTypes = ["momentum", "mean_reversion", "volatility"] as const;
    const directions = ["long", "short", "neutral"] as const;
    return {
      company_id: companyId,
      symbol,
      signal_type: signalTypes[seed % signalTypes.length],
      direction: directions[(seed >>> 2) % directions.length],
      confidence: Math.round(((seed % 60) + 40)) / 100,
      note: `Deterministic mock signal for ${symbol}, generated ${seedDate} (index ${index}). No live exchange feed is connected.`,
    };
  });

  const privilegedSupabase = privileged("trading/market-signals", "seed_market_signals", companyId);
  const { error: seedError } = await privilegedSupabase.from("market_signals").insert(mock);
  if (seedError) throw new Error(`Unable to seed market signals: ${seedError.message}`);
  return fetchRecentSignals(companyId);
}

async function fetchRecentSignals(companyId: string): Promise<MarketSignalRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("market_signals")
    .select("id,company_id,symbol,signal_type,direction,confidence,note,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(25);
  return (data ?? []) as MarketSignalRow[];
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Reads the portfolio state the Level 1 risk policy engine needs. dailyPnlUsd
 * and weeklyPnlUsd are rolling 24h / rolling 7d windows (not UTC calendar
 * windows) and only ever sum realized_pnl_usd from *closed* positions —
 * unrealized P&L on still-open positions never feeds loss-limit enforcement.
 * This mirrors the authoritative SQL copy of these windows in
 * evaluate_and_record_trade_intent() (20260903000000_aoc_capital_position_lifecycle_mtm.sql).
 */
async function getPortfolioRiskState(companyId: string, portfolio: PortfolioRow): Promise<PortfolioRiskState> {
  const supabase = await client();

  const { data: openPositions } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolio.id)
    .eq("status", "open");

  const currentExposureUsd = ((openPositions ?? []) as PaperPositionRow[]).reduce((sum, p) => sum + p.entry_notional_usd, 0);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: closedRecent } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolio.id)
    .eq("status", "closed")
    .gte("closed_at", weekAgo);

  const closedRows = (closedRecent ?? []) as PaperPositionRow[];
  const dailyPnlUsd = closedRows.filter((p) => p.closed_at && p.closed_at >= dayAgo).reduce((sum, p) => sum + p.realized_pnl_usd, 0);
  const weeklyPnlUsd = closedRows.reduce((sum, p) => sum + p.realized_pnl_usd, 0);

  return {
    baseCapitalUsd: portfolio.base_capital_usd,
    currentExposureUsd,
    openPositionCount: (openPositions ?? []).length,
    dailyPnlUsd,
    weeklyPnlUsd,
  };
}

export type CreateTradeIntentInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
  portfolioId: string;
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  notionalUsd: number;
  leverage?: number;
  source?: "manual" | "signal";
  signalId?: string | null;
};

export type CreateTradeIntentResult = {
  intent: TradeIntentRow;
  decision: TradeDecisionRow;
  position: PaperPositionRow | null;
};

/**
 * Creates a trade intent and routes it through the Level 1 risk policy engine
 * in a single database transaction (see evaluate_and_record_trade_intent in
 * 20260901020000_aoc_capital_governed_writes.sql), serialized per portfolio
 * via an advisory lock so concurrent requests can't both approve past a limit.
 * This is the only write path for trade intents — combined with the
 * SELECT-only RLS policies on the governed tables, callers cannot bypass
 * governance by writing directly to trade_intents/paper_positions/etc.
 */
export async function createTradeIntent(input: CreateTradeIntentInput): Promise<CreateTradeIntentResult> {
  const supabase = privileged("trading/trade-intents", "evaluate_and_record_trade_intent", input.companyId, input.actorUserId);

  const { data, error } = await supabase.rpc("evaluate_and_record_trade_intent", {
    p_company_id: input.companyId,
    p_portfolio_id: input.portfolioId,
    p_symbol: input.symbol,
    p_side: input.side,
    p_quantity: input.quantity,
    p_notional_usd: input.notionalUsd,
    p_leverage: input.leverage ?? 1,
    p_source: input.source ?? "manual",
    p_signal_id: input.signalId ?? null,
    p_created_by: input.actor,
  });

  if (error) throw new Error(`Unable to evaluate trade intent: ${error.message}`);
  const result = data as CreateTradeIntentResult;
  return result;
}

export async function listTradeIntents(companyId: string): Promise<TradeIntentRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("trade_intents")
    .select("id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at,cancelled_at,cancelled_by")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as TradeIntentRow[];
}

export async function listTradeDecisions(companyId: string): Promise<TradeDecisionRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("trade_decisions")
    .select("id,company_id,trade_intent_id,verdict,reasons,policy_version,decided_at")
    .eq("company_id", companyId)
    .order("decided_at", { ascending: false })
    .limit(50);
  return (data ?? []) as TradeDecisionRow[];
}

export async function listPaperPositions(companyId: string): Promise<PaperPositionRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .order("opened_at", { ascending: false })
    .limit(50);
  return (data ?? []) as PaperPositionRow[];
}

/** Fetches a single paper position, scoped to the caller's tenant. */
export async function getPaperPosition(companyId: string, positionId: string): Promise<PaperPositionRow | null> {
  const supabase = await client();
  const { data } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("id", positionId)
    .maybeSingle();
  return (data ?? null) as PaperPositionRow | null;
}

/**
 * Marks every open paper position in `portfolioId` to a fresh market price in
 * one transaction (see mark_all_open_paper_positions in
 * 20260903000000_aoc_capital_position_lifecycle_mtm.sql). No audit event is
 * written for bulk marks — see markPositionToMarket for the audited,
 * explicitly user-triggered single-position path.
 */
export async function markAllOpenPositions(companyId: string, portfolioId: string): Promise<PaperPositionRow[]> {
  const supabase = await client();
  const { data: openPositions } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("status", "open");

  const positions = (openPositions ?? []) as PaperPositionRow[];
  if (positions.length === 0) return [];

  const now = new Date();
  const marks = await Promise.all(
    positions.map(async (position) => ({
      position_id: position.id,
      current_price_usd: (await recordMarketPrice(companyId, position.symbol, now)).priceUsd,
    }))
  );

  const serviceClient = privileged("trading/paper-positions", "mark_all_open_paper_positions", companyId);
  const { error } = await serviceClient.rpc("mark_all_open_paper_positions", {
    p_company_id: companyId,
    p_portfolio_id: portfolioId,
    p_marks: marks,
  });
  if (error) throw new Error(`Unable to mark positions to market: ${error.message}`);

  return listPaperPositions(companyId);
}

/**
 * Marks a single open paper position to a fresh market price (see
 * mark_paper_position in 20260903000000_aoc_capital_position_lifecycle_mtm.sql).
 * Writes a position_marked_to_market audit event when explicitly triggered
 * (audit=true), since every refresh of the Paper Positions screen would
 * otherwise spam the audit ledger. `forceMockPrice` is used only by the Demo
 * Strategy Sandbox (see src/lib/demo/demo-write-service.ts) so its scripted,
 * predictable P&L narrative never depends on live market volatility.
 */
export async function markPositionToMarket(
  companyId: string,
  positionId: string,
  actor: string,
  actorUserId: string,
  options: { audit?: boolean; forceMockPrice?: boolean } = {}
): Promise<PaperPositionRow> {
  const existing = await getPaperPosition(companyId, positionId);
  if (!existing) throw new PaperPositionNotFoundError(positionId);
  if (existing.status !== "open") throw new PaperPositionNotOpenError(positionId);

  const currentPriceUsd = (
    await recordMarketPrice(companyId, existing.symbol, new Date(), { forceMock: options.forceMockPrice })
  ).priceUsd;

  const supabase = privileged("trading/paper-positions", "mark_paper_position", companyId, actorUserId);
  const { data, error } = await supabase.rpc("mark_paper_position", {
    p_company_id: companyId,
    p_position_id: positionId,
    p_current_price_usd: currentPriceUsd,
    p_actor: actor,
    p_write_audit: options.audit ?? false,
  });
  if (error) throw new Error(`Unable to mark position to market: ${error.message}`);
  return data as PaperPositionRow;
}

export type ClosePaperPositionInput = {
  companyId: string;
  positionId: string;
  actor: string;
  actorUserId: string;
  closeReason: CloseReason;
  /** See markPositionToMarket's forceMockPrice doc — used only by the Demo Strategy Sandbox. */
  forceMockPrice?: boolean;
};

/**
 * Closes an open paper position: gets the current market close price
 * server-side, then delegates the atomic close + realized P&L calculation +
 * audit write to close_paper_position()
 * (20260903000000_aoc_capital_position_lifecycle_mtm.sql). If the audit
 * insert inside that function fails, the whole transaction rolls back — the
 * position is never closed without an audit event.
 */
export async function closePaperPosition(input: ClosePaperPositionInput): Promise<PaperPositionRow> {
  const existing = await getPaperPosition(input.companyId, input.positionId);
  if (!existing) throw new PaperPositionNotFoundError(input.positionId);
  if (existing.status !== "open") throw new PaperPositionNotOpenError(input.positionId);

  const closePriceUsd = (
    await recordMarketPrice(input.companyId, existing.symbol, new Date(), { forceMock: input.forceMockPrice })
  ).priceUsd;

  const supabase = privileged("trading/paper-positions", "close_paper_position", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("close_paper_position", {
    p_company_id: input.companyId,
    p_position_id: input.positionId,
    p_close_price_usd: closePriceUsd,
    p_close_reason: input.closeReason,
    p_actor: input.actor,
  });
  if (error) throw new Error(`Unable to close paper position: ${error.message}`);
  return data as PaperPositionRow;
}

/** Lists paper positions after refreshing every open one to a fresh market price. */
export async function listPaperPositionsMarked(companyId: string): Promise<PaperPositionRow[]> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);
  await markAllOpenPositions(companyId, portfolio.id);
  return listPaperPositions(companyId);
}

type RecordedMarketPrice = {
  priceUsd: number;
  source: PaperMarketPriceSource;
  provider: string | null;
  asOf: string;
};

/**
 * Resolves the current market price for `symbol` and records it in
 * paper_market_prices so every mark is auditable. Tries a live *public*,
 * read-only price feed first when AOC_CAPITAL_MARKET_DATA_MODE=live_public
 * and the symbol is covered by the configured provider (source =
 * 'live_public'); otherwise — mode 'mock', mode 'disabled', or the live fetch
 * failing/timing out for any reason — falls back to the deterministic
 * simulated price (source = 'mock', mock-price-generator.ts). Mark-to-market
 * must never fail, hang, or place/route any order just because an external
 * price feed is slow, down, or doesn't cover a symbol: paper trading always
 * has a price to mark to, purely from data AOC Capital only ever reads.
 * Upserts on (company_id, symbol, as_of) — repeated calls within the same
 * bucket reuse the same row instead of duplicating it.
 */
async function recordMarketPrice(
  companyId: string,
  symbol: string,
  at: Date,
  options: { forceMock?: boolean } = {}
): Promise<RecordedMarketPrice> {
  if (!options.forceMock && isLivePublicMarketDataEnabled()) {
    try {
      const provider = getLiveMarketDataProvider();
      const live = await fetchLivePrice(symbol, { now: at, provider });
      const asOf = timeBucketStart(live.asOf, LIVE_PRICE_BUCKET_MINUTES).toISOString();

      const supabase = privileged("trading/paper-market-prices", "record_live_public_price", companyId);
      const { error } = await supabase
        .from("paper_market_prices")
        .upsert(
          { company_id: companyId, symbol, price_usd: live.priceUsd, as_of: asOf, source: "live_public", provider: live.provider },
          { onConflict: "company_id,symbol,as_of" }
        );
      if (error) throw new Error(`Unable to record live public price: ${error.message}`);

      return { priceUsd: live.priceUsd, source: "live_public", provider: live.provider, asOf };
    } catch (error) {
      if (!(error instanceof LivePriceUnavailableError)) throw error;
      // Live feed doesn't cover this symbol, is unreachable, or timed out —
      // fall through to the deterministic simulated price below.
    }
  }

  const priceUsd = getSimulatedPrice(symbol, at);
  const asOf = timeBucketStart(at).toISOString();

  const supabase = privileged("trading/paper-market-prices", "record_simulated_price", companyId);
  const { error } = await supabase
    .from("paper_market_prices")
    .upsert(
      { company_id: companyId, symbol, price_usd: priceUsd, as_of: asOf, source: "mock", provider: null },
      { onConflict: "company_id,symbol,as_of" }
    );
  if (error) throw new Error(`Unable to record simulated price: ${error.message}`);

  return { priceUsd, source: "mock", provider: null, asOf };
}

export type MarketDataSnapshotEntry = {
  symbol: string;
  priceUsd: number;
  source: PaperMarketPriceSource;
  provider: string | null;
  asOf: string;
  /** Always true. Present on every entry as an explicit, machine-checkable guarantee that this is paper-trading data only. */
  paperOnly: true;
};

/**
 * Read-only snapshot of the price AOC Capital would mark paper positions to
 * for each tracked symbol right now, and whether it came from the optional
 * live public market data feed or the deterministic simulated fallback.
 * Backs the Market Data screen only — it never places, prepares, signs, or
 * routes an order, and it never touches a broker or exchange account. Every
 * entry carries paperOnly: true and no field here ever represents an
 * execution capability (no order id, no account balance, no broker handle).
 */
export async function getMarketDataSnapshot(companyId: string): Promise<MarketDataSnapshotEntry[]> {
  const now = new Date();
  const entries: MarketDataSnapshotEntry[] = [];
  for (const symbol of TRACKED_MARKET_DATA_SYMBOLS) {
    const recorded = await recordMarketPrice(companyId, symbol, now);
    entries.push({
      symbol,
      priceUsd: recorded.priceUsd,
      source: recorded.source,
      provider: recorded.provider,
      asOf: recorded.asOf,
      paperOnly: true,
    });
  }
  return entries;
}

export async function listAuditLedger(companyId: string): Promise<AuditLedgerRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("audit_ledger")
    .select("id,company_id,event_type,subject_type,subject_id,actor,payload,occurred_at")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AuditLedgerRow[];
}

export async function loadPortfolioOverview(companyId: string) {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);
  await markAllOpenPositions(companyId, portfolio.id);
  const [state, positions, capitalLevels, summary] = await Promise.all([
    getPortfolioRiskState(companyId, portfolio),
    listPaperPositions(companyId),
    ensureCapitalLevels(companyId, portfolio),
    getPortfolioSummary(companyId, portfolio),
  ]);
  return { portfolio, state, positions, capitalLevels, summary };
}

/**
 * Builds the Capital Command Center portfolio summary: refreshes open
 * positions to a fresh simulated price, then aggregates open exposure
 * (cost basis), unrealized P&L, and realized P&L (all-time + rolling 24h/7d)
 * into computePortfolioSummary() (portfolio-summary.ts).
 */
export async function getPortfolioSummary(companyId: string, portfolio?: PortfolioRow): Promise<PortfolioSummary> {
  const resolvedPortfolio = portfolio ?? (await getOrCreateDefaultPortfolio(companyId));
  const positions = await listPaperPositions(companyId);

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  const openExposureUsd = openPositions.reduce((sum, p) => sum + p.entry_notional_usd, 0);
  const unrealizedPnlUsd = openPositions.reduce((sum, p) => sum + p.unrealized_pnl_usd, 0);
  const realizedPnlUsd = closedPositions.reduce((sum, p) => sum + p.realized_pnl_usd, 0);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dailyRealizedPnlUsd = closedPositions
    .filter((p) => p.closed_at && p.closed_at >= dayAgo)
    .reduce((sum, p) => sum + p.realized_pnl_usd, 0);
  const weeklyRealizedPnlUsd = closedPositions
    .filter((p) => p.closed_at && p.closed_at >= weekAgo)
    .reduce((sum, p) => sum + p.realized_pnl_usd, 0);

  return computePortfolioSummary({
    baseCapitalUsd: resolvedPortfolio.base_capital_usd,
    openExposureUsd,
    unrealizedPnlUsd,
    realizedPnlUsd,
    dailyRealizedPnlUsd,
    weeklyRealizedPnlUsd,
    openPositionsCount: openPositions.length,
  });
}

/**
 * Builds the Strategy Performance Review: reuses the same paper_positions
 * data and Level 1 risk-limit health as getPortfolioSummary(), then hands the
 * closed-trade history and current mark-to-market state to
 * computeStrategyPerformance() (strategy-performance.ts) for win rate,
 * profit factor, drawdown, and the advisor recommendation. This function is
 * paper-only analytics; like getPortfolioSummary(), it does not itself refresh
 * open positions to a fresh simulated price; callers that want a fresh mark should call
 * markAllOpenPositions() first (see the /api/capital/performance route).
 * Never unlocks real execution.
 */
export async function getStrategyPerformance(companyId: string, portfolio?: PortfolioRow): Promise<StrategyPerformance> {
  const resolvedPortfolio = portfolio ?? (await getOrCreateDefaultPortfolio(companyId));
  const positions = await listPaperPositions(companyId);

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed" && p.closed_at !== null);

  const unrealizedPnlUsd = openPositions.reduce((sum, p) => sum + p.unrealized_pnl_usd, 0);
  const openExposureUsd = openPositions.reduce((sum, p) => sum + p.entry_notional_usd, 0);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dailyRealizedPnlUsd = closedPositions.filter((p) => p.closed_at! >= dayAgo).reduce((sum, p) => sum + p.realized_pnl_usd, 0);
  const weeklyRealizedPnlUsd = closedPositions.filter((p) => p.closed_at! >= weekAgo).reduce((sum, p) => sum + p.realized_pnl_usd, 0);

  const summary = await getPortfolioSummary(companyId, resolvedPortfolio);

  return computeStrategyPerformance({
    baseCapitalUsd: resolvedPortfolio.base_capital_usd,
    closedPositions: closedPositions.map((p) => ({ symbol: p.symbol, realizedPnlUsd: p.realized_pnl_usd, closedAt: p.closed_at! })),
    openPositionsCount: openPositions.length,
    unrealizedPnlUsd,
    openExposureUsd,
    dailyRealizedPnlUsd,
    weeklyRealizedPnlUsd,
    riskHealth: summary.strategyHealth,
  });
}

export { getPortfolioRiskState };
