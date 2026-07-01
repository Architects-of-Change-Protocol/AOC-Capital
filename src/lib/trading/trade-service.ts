import { createSupabaseServerClient } from "@/lib/supabase/server";
import { evaluateTradeIntent, type CandidateTradeIntent, type PortfolioRiskState } from "./risk-policy-engine";
import type {
  AuditLedgerEventType,
  AuditLedgerRow,
  CapitalLevelRow,
  MarketSignalRow,
  PaperPositionRow,
  PortfolioRow,
  RiskConstitutionRuleRow,
  TradeDecisionRow,
  TradeIntentRow,
  TradeIntentSide,
} from "./database-contract";

const DEFAULT_PORTFOLIO_NAME = "AOC Capital Paper Portfolio";
const DEFAULT_BASE_CAPITAL_USD = 1000;

const MOCK_SIGNAL_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "AAPL", "SPY"] as const;

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

async function writeAuditEvent(
  companyId: string,
  eventType: AuditLedgerEventType,
  subjectType: string,
  subjectId: string,
  actor: string,
  payload: Record<string, unknown>
) {
  const supabase = await client();
  await supabase.from("audit_ledger").insert({
    company_id: companyId,
    event_type: eventType,
    subject_type: subjectType,
    subject_id: subjectId,
    actor,
    payload,
  });
}

export async function getOrCreateDefaultPortfolio(companyId: string): Promise<PortfolioRow> {
  const supabase = await client();
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

  if (error || !created) throw new Error(`Unable to create default portfolio: ${error?.message ?? "unknown error"}`);
  return created as PortfolioRow;
}

export async function ensureRiskConstitution(companyId: string): Promise<RiskConstitutionRuleRow[]> {
  const supabase = await client();
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
  const supabase = await client();
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
      direction: directions[(seed >> 2) % directions.length],
      confidence: Math.round(((seed % 60) + 40)) / 100,
      note: `Deterministic mock signal for ${symbol}, generated ${seedDate} (index ${index}). No live exchange feed is connected.`,
    };
  });

  await supabase.from("market_signals").insert(mock);
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

async function getPortfolioRiskState(companyId: string, portfolio: PortfolioRow): Promise<PortfolioRiskState> {
  const supabase = await client();

  const { data: openPositions } = await supabase
    .from("paper_positions")
    .select("id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price,status,opened_at,closed_at,realized_pnl_usd")
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolio.id)
    .eq("status", "open");

  const currentExposureUsd = ((openPositions ?? []) as PaperPositionRow[]).reduce((sum, p) => sum + p.quantity * p.entry_price, 0);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: closedRecent } = await supabase
    .from("paper_positions")
    .select("id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price,status,opened_at,closed_at,realized_pnl_usd")
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
 * Creates a trade intent and immediately routes it through the Level 1 risk
 * policy engine. This is the single write path for trade intents — every
 * intent is evaluated and every verdict is recorded to the audit ledger here,
 * so callers cannot bypass governance by writing directly to trade_intents.
 */
export async function createTradeIntent(input: CreateTradeIntentInput): Promise<CreateTradeIntentResult> {
  const supabase = await client();

  const { data: intent, error: intentError } = await supabase
    .from("trade_intents")
    .insert({
      company_id: input.companyId,
      portfolio_id: input.portfolioId,
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity,
      notional_usd: input.notionalUsd,
      leverage: input.leverage ?? 1,
      source: input.source ?? "manual",
      signal_id: input.signalId ?? null,
      created_by: input.actor,
      status: "pending",
    })
    .select("id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,status,created_by,created_at")
    .single();

  if (intentError || !intent) throw new Error(`Unable to create trade intent: ${intentError?.message ?? "unknown error"}`);
  const intentRow = intent as TradeIntentRow;

  await writeAuditEvent(input.companyId, "trade_intent_created", "trade_intent", intentRow.id, input.actor, {
    symbol: intentRow.symbol,
    side: intentRow.side,
    quantity: intentRow.quantity,
    notionalUsd: intentRow.notional_usd,
  });

  const { data: portfolioRow, error: portfolioError } = await supabase
    .from("portfolios")
    .select("id,company_id,name,base_capital_usd,status,created_at")
    .eq("id", input.portfolioId)
    .single();
  if (portfolioError || !portfolioRow) throw new Error(`Unable to load portfolio for evaluation: ${portfolioError?.message ?? "unknown error"}`);

  const state = await getPortfolioRiskState(input.companyId, portfolioRow as PortfolioRow);
  const candidate: CandidateTradeIntent = {
    symbol: intentRow.symbol,
    side: intentRow.side,
    quantity: intentRow.quantity,
    notionalUsd: intentRow.notional_usd,
    leverage: intentRow.leverage,
  };
  const evaluation = evaluateTradeIntent(candidate, state);

  const { data: decision, error: decisionError } = await supabase
    .from("trade_decisions")
    .insert({
      company_id: input.companyId,
      trade_intent_id: intentRow.id,
      verdict: evaluation.verdict,
      reasons: evaluation.reasons,
      policy_version: evaluation.policyVersion,
    })
    .select("id,company_id,trade_intent_id,verdict,reasons,policy_version,decided_at")
    .single();

  if (decisionError || !decision) throw new Error(`Unable to record trade decision: ${decisionError?.message ?? "unknown error"}`);
  const decisionRow = decision as TradeDecisionRow;

  await supabase.from("trade_intents").update({ status: evaluation.verdict }).eq("id", intentRow.id);

  await writeAuditEvent(
    input.companyId,
    evaluation.verdict === "approved" ? "trade_decision_approved" : "trade_decision_rejected",
    "trade_intent",
    intentRow.id,
    "risk-policy-engine",
    { verdict: evaluation.verdict, reasons: evaluation.reasons, policyVersion: evaluation.policyVersion }
  );

  let position: PaperPositionRow | null = null;
  if (evaluation.verdict === "approved") {
    const entryPrice = intentRow.notional_usd / intentRow.quantity;
    const { data: createdPosition, error: positionError } = await supabase
      .from("paper_positions")
      .insert({
        company_id: input.companyId,
        portfolio_id: input.portfolioId,
        trade_intent_id: intentRow.id,
        symbol: intentRow.symbol,
        side: intentRow.side,
        quantity: intentRow.quantity,
        entry_price: entryPrice,
        status: "open",
      })
      .select("id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price,status,opened_at,closed_at,realized_pnl_usd")
      .single();

    if (positionError || !createdPosition) throw new Error(`Unable to open paper position: ${positionError?.message ?? "unknown error"}`);
    position = createdPosition as PaperPositionRow;

    await writeAuditEvent(input.companyId, "position_opened", "paper_position", position.id, "risk-policy-engine", {
      symbol: position.symbol,
      quantity: position.quantity,
      entryPrice: position.entry_price,
    });
  }

  return { intent: { ...intentRow, status: evaluation.verdict }, decision: decisionRow, position };
}

export async function listTradeIntents(companyId: string): Promise<TradeIntentRow[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("trade_intents")
    .select("id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,status,created_by,created_at")
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
    .select("id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price,status,opened_at,closed_at,realized_pnl_usd")
    .eq("company_id", companyId)
    .order("opened_at", { ascending: false })
    .limit(50);
  return (data ?? []) as PaperPositionRow[];
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
  const [state, positions, capitalLevels] = await Promise.all([
    getPortfolioRiskState(companyId, portfolio),
    listPaperPositions(companyId),
    ensureCapitalLevels(companyId, portfolio),
  ]);
  return { portfolio, state, positions, capitalLevels };
}

export { getPortfolioRiskState };
