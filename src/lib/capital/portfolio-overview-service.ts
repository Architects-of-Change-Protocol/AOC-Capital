// AOC Capital — Portfolio Overview Dashboard v1 (PR #14).
//
// Read-only aggregation service only. Reads existing governed paper-capital
// state — portfolios, portfolio_strategy_profiles, paper_signal_recommendations,
// trade_intents, trade_decisions, paper_positions, and audit_ledger — through
// the existing read-only helpers in trade-service.ts and normalizes it into a
// single PortfolioOverview payload for the dashboard.
//
// This module never mutates anything: no signal generation, no draft
// creation/submission/cancellation, no risk review, no paper position
// creation/closing/mark-to-market, no strategy selection change, and no
// broker/exchange/real-execution capability of any kind. Signals recommend,
// humans create/cancel/submit drafts, Risk Constitution decides, and paper
// simulation reflects governed decisions — this dashboard only explains that
// state; it never performs it. It deliberately calls getPortfolioSummary()
// and listPaperPositions() (not loadPortfolioOverview() / markAllOpenPositions()
// / listPaperPositionsMarked()) so simply viewing this dashboard never
// triggers a fresh mark-to-market write.

import {
  getOrCreateDefaultPortfolio,
  getPortfolioSummary,
  getStrategyPerformance,
  listAuditLedger,
  listPaperPositions,
  listTradeDecisions,
  listTradeIntents,
} from "@/lib/trading/trade-service";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "./strategy-selection-service";
import { listSignalRecommendations } from "./signal-engine-service";
import type { AuditLedgerRow, PaperPositionRow, PaperSignalRecommendationRow, TradeDecisionRow, TradeIntentRow } from "@/lib/trading/database-contract";
import type { StrategyPerformance } from "@/lib/trading/strategy-performance";
import { NAV_LINKS } from "./portfolio-overview-content";

const RECENT_SIGNALS_LIMIT = 10;
const RECENT_INTENTS_LIMIT = 10;
const RECENT_DECISIONS_LIMIT = 10;
const RECENT_ACTIVITY_LIMIT = 15;
const RECENT_OPEN_POSITIONS_LIMIT = 10;

export type PortfolioOverview = {
  portfolio: {
    id: string;
    name: string | null;
    baseCapitalUsd: number;
    simulatedPortfolioValueUsd: number;
    simulatedCashUsd: number;
    openExposureUsd: number;
    realizedPnlUsd: number;
    unrealizedPnlUsd: number;
    totalPnlUsd: number;
    openPositionsCount: number;
    closedPositionsCount: number;
    lastMarkedToMarketAt: string | null;
  };

  strategy: {
    selectedStrategyId: string | null;
    name: string | null;
    status: "none" | "active" | "stale" | "review_required";
    selectedAt: string | null;
    staleSelectedStrategy: boolean;
    recommendation: string | null;
  };

  signals: {
    activeCount: number;
    convertibleCount: number;
    blockedCount: number;
    watchCount: number;
    recent: Array<{
      id: string;
      symbol: string;
      action: string;
      strength: string | null;
      status: string;
      suggestedNotionalUsd: number | null;
      generatedAt: string;
      convertedTradeIntentId: string | null;
    }>;
  };

  tradeIntents: {
    draftCount: number;
    cancelledCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    closedCount: number;
    recent: Array<{
      id: string;
      symbol: string;
      side: string;
      status: string;
      quantity: number;
      notionalUsd: number;
      source: string;
      createdAt: string;
      paperSignalRecommendationId: string | null;
    }>;
  };

  decisions: {
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number | null;
    recent: Array<{
      id: string;
      tradeIntentId: string;
      verdict: string;
      reason: string | null;
      createdAt: string;
    }>;
  };

  positions: {
    openCount: number;
    recentOpen: Array<{
      id: string;
      symbol: string;
      quantity: number;
      entryPriceUsd: number;
      currentPriceUsd: number | null;
      entryNotionalUsd: number;
      currentNotionalUsd: number | null;
      unrealizedPnlUsd: number | null;
      openedAt: string;
    }>;
  };

  governance: {
    paperOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    status: "healthy" | "review_needed" | "blocked" | "not_ready";
    reasons: string[];
  };

  recentActivity: Array<{
    id: string;
    eventType: string;
    subjectType: string;
    subjectId: string;
    createdAt: string;
    summary: string;
  }>;

  nextAction: NextAction;
};

export type NextActionKind =
  | "select_strategy"
  | "review_strategy"
  | "review_signals"
  | "review_drafts"
  | "review_rejections"
  | "monitor_positions"
  | "generate_signals"
  | "none";

export type NextAction = {
  kind: NextActionKind;
  title: string;
  description: string;
  href: string | null;
};

/** Mirrors the eligibility rule enforced server-side in signal-trade-intent-handoff-service.ts — display-only aggregation, never a write. */
function isConvertibleToDraft(signal: PaperSignalRecommendationRow): boolean {
  return (
    signal.action === "paper_buy_candidate" &&
    signal.status === "active" &&
    !signal.converted_trade_intent_id &&
    signal.suggested_notional_usd !== null &&
    signal.suggested_notional_usd > 0 &&
    signal.market_price_usd !== null &&
    signal.market_price_usd > 0
  );
}

const AUDIT_EVENT_LABELS: Record<string, string> = {
  trade_intent_created: "Trade intent created",
  trade_decision_approved: "Trade decision approved",
  trade_decision_rejected: "Trade decision rejected",
  position_opened: "Paper position opened",
  position_closed: "Paper position closed",
  position_marked_to_market: "Position marked to market",
  advisor_strategy_generated: "Advisor strategy generated",
  advisor_constitution_generated: "Advisor risk constitution generated",
  demo_scenario_loaded: "Demo scenario loaded",
  demo_scenario_reset: "Demo scenario reset",
  strategy_selected: "Strategy selected",
  signals_generated: "Signals generated",
  signal_converted_to_draft_trade_intent: "Signal converted to draft trade intent",
  trade_intent_submitted_for_review: "Draft submitted for Risk Constitution review",
  draft_trade_intent_cancelled: "Draft trade intent cancelled",
};

/** Human-readable summary line for the Recent Activity feed. Never exposes the raw audit payload. */
function summarizeActivityEvent(event: AuditLedgerRow): string {
  const label = AUDIT_EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, " ");
  return `${label} — ${event.subject_type} ${event.subject_id.slice(0, 8)}`;
}

export type GovernanceStatusInput = {
  hasSelectedStrategy: boolean;
  staleSelectedStrategy: boolean;
  performanceReviewRequired: boolean;
  draftCount: number;
  blockedSignalsCount: number;
  rejectedDecisionsCount: number;
  strategyHealth: "healthy" | "caution" | "breached";
};

export type GovernanceStatusResult = {
  status: "healthy" | "review_needed" | "blocked" | "not_ready";
  reasons: string[];
};

/**
 * Deterministic, dashboard-level "risk posture" only — never a new Risk
 * Constitution engine and never a claim of certified compliance. Reuses the
 * existing Level 1 strategyHealth classification (portfolio-summary.ts)
 * rather than re-deriving exposure/loss-limit math.
 */
export function derivePortfolioGovernanceStatus(input: GovernanceStatusInput): GovernanceStatusResult {
  const reasons: string[] = [];

  if (!input.hasSelectedStrategy) {
    return { status: "not_ready", reasons: ["No paper strategy is selected yet."] };
  }

  if (input.blockedSignalsCount > 0) reasons.push(`${input.blockedSignalsCount} signal(s) blocked by risk.`);
  if (input.strategyHealth === "breached") reasons.push("Current risk-limit usage has breached a Level 1 threshold.");
  if (input.blockedSignalsCount > 0 || input.strategyHealth === "breached") {
    return { status: "blocked", reasons };
  }

  if (input.staleSelectedStrategy) reasons.push("Selected strategy is stale and no longer in the current library.");
  if (input.performanceReviewRequired) reasons.push("Strategy Performance Review recommends review before trusting new buy candidates.");
  if (input.draftCount > 0) reasons.push(`${input.draftCount} draft trade intent(s) pending action.`);
  if (input.rejectedDecisionsCount > 0) reasons.push(`${input.rejectedDecisionsCount} recent Risk Constitution rejection(s).`);
  if (input.strategyHealth === "caution") reasons.push("Current risk-limit usage is elevated (caution).");

  if (reasons.length > 0) {
    return { status: "review_needed", reasons };
  }

  return { status: "healthy", reasons: ["Strategy selected, no stale selection, and no urgent review condition detected."] };
}

export type NextActionInput = {
  hasSelectedStrategy: boolean;
  staleSelectedStrategy: boolean;
  performanceReviewRequired: boolean;
  convertibleSignalsCount: number;
  draftCount: number;
  recentRejectedDecisionsCount: number;
  openPositionsCount: number;
  hasAnySignals: boolean;
};

/**
 * Pure, deterministic next-action recommendation — no LLM, no agent, no
 * automation. Priority order mirrors the governed paper-capital lifecycle:
 * select a strategy, resolve staleness/performance review, then work down
 * the signal -> draft -> decision -> position pipeline.
 */
export function getNextPortfolioAction(input: NextActionInput): NextAction {
  if (!input.hasSelectedStrategy) {
    return {
      kind: "select_strategy",
      title: "Select a paper strategy",
      description: "Select a paper strategy to start receiving governed recommendations.",
      href: NAV_LINKS.strategyLibrary,
    };
  }

  if (input.staleSelectedStrategy) {
    return {
      kind: "review_strategy",
      title: "Review selected strategy",
      description: "Your selected strategy may be stale. Review strategy selection.",
      href: NAV_LINKS.strategyLibrary,
    };
  }

  if (input.performanceReviewRequired) {
    return {
      kind: "review_strategy",
      title: "Review strategy performance",
      description: "Your strategy needs more paper evidence before new buy candidates should be trusted.",
      href: NAV_LINKS.performance,
    };
  }

  if (input.convertibleSignalsCount > 0) {
    return {
      kind: "review_signals",
      title: "Review active paper signals",
      description: "Review active paper buy candidates.",
      href: NAV_LINKS.signals,
    };
  }

  if (input.draftCount > 0) {
    return {
      kind: "review_drafts",
      title: "Review draft trade intents",
      description: "Review pending draft trade intents.",
      href: NAV_LINKS.tradeIntents,
    };
  }

  if (input.recentRejectedDecisionsCount > 0) {
    return {
      kind: "review_rejections",
      title: "Review rejected Risk Constitution decisions",
      description: "Review rejected decisions to understand current risk limits.",
      href: NAV_LINKS.tradeIntents,
    };
  }

  if (input.openPositionsCount > 0) {
    return {
      kind: "monitor_positions",
      title: "Monitor open paper positions",
      description: "Monitor open paper positions and performance.",
      href: NAV_LINKS.positions,
    };
  }

  if (!input.hasAnySignals) {
    return {
      kind: "generate_signals",
      title: "Generate paper-only signals",
      description: "Generate paper-only signals once your strategy is selected.",
      href: NAV_LINKS.signals,
    };
  }

  return {
    kind: "none",
    title: "Portfolio is up to date",
    description: "No urgent action is waiting. Continue monitoring your governed paper portfolio.",
    href: null,
  };
}

function mapSignal(signal: PaperSignalRecommendationRow): PortfolioOverview["signals"]["recent"][number] {
  return {
    id: signal.id,
    symbol: signal.symbol,
    action: signal.action,
    strength: signal.strength,
    status: signal.status,
    suggestedNotionalUsd: signal.suggested_notional_usd,
    generatedAt: signal.generated_at,
    convertedTradeIntentId: signal.converted_trade_intent_id,
  };
}

function mapTradeIntent(intent: TradeIntentRow): PortfolioOverview["tradeIntents"]["recent"][number] {
  return {
    id: intent.id,
    symbol: intent.symbol,
    side: intent.side,
    status: intent.status,
    quantity: intent.quantity,
    notionalUsd: intent.notional_usd,
    source: intent.source,
    createdAt: intent.created_at,
    paperSignalRecommendationId: intent.paper_signal_recommendation_id,
  };
}

function firstFailingReasonDetail(decision: TradeDecisionRow): string | null {
  const failing = decision.reasons.find((reason) => !reason.passed);
  return failing?.detail ?? null;
}

function mapDecision(decision: TradeDecisionRow): PortfolioOverview["decisions"]["recent"][number] {
  return {
    id: decision.id,
    tradeIntentId: decision.trade_intent_id,
    verdict: decision.verdict,
    reason: firstFailingReasonDetail(decision),
    createdAt: decision.decided_at,
  };
}

function mapOpenPosition(position: PaperPositionRow): PortfolioOverview["positions"]["recentOpen"][number] {
  return {
    id: position.id,
    symbol: position.symbol,
    quantity: position.quantity,
    entryPriceUsd: position.entry_price_usd,
    currentPriceUsd: position.current_price_usd,
    entryNotionalUsd: position.entry_notional_usd,
    currentNotionalUsd: position.current_notional_usd,
    unrealizedPnlUsd: position.unrealized_pnl_usd,
    openedAt: position.opened_at,
  };
}

function latestMarkedAt(positions: PaperPositionRow[]): string | null {
  let latest: string | null = null;
  for (const position of positions) {
    if (position.last_marked_at && (!latest || position.last_marked_at > latest)) {
      latest = position.last_marked_at;
    }
  }
  return latest;
}

/**
 * Builds the read-only Portfolio Overview dashboard payload for the caller's
 * tenant. Every read is scoped to companyId via the existing tenant-scoped
 * helpers in trade-service.ts / strategy-selection-service.ts /
 * signal-engine-service.ts. Never generates signals, never creates or
 * mutates a trade intent, never runs risk review, never opens/closes/marks a
 * paper position, and never changes the selected strategy.
 */
export async function getPortfolioOverview(companyId: string): Promise<PortfolioOverview> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);

  const [profile, signals, tradeIntents, decisions, positions, activity, summary] = await Promise.all([
    getSelectedStrategyProfile(companyId),
    listSignalRecommendations(companyId, portfolio.id),
    listTradeIntents(companyId),
    listTradeDecisions(companyId),
    listPaperPositions(companyId),
    listAuditLedger(companyId),
    getPortfolioSummary(companyId, portfolio),
  ]);

  let performance: StrategyPerformance | null = null;
  try {
    performance = await getStrategyPerformance(companyId, portfolio);
  } catch {
    // Strategy Performance Review is optional context here too — see the
    // identical fallback in signal-engine-service.ts. Never fails the
    // dashboard just because performance data isn't ready yet.
    performance = null;
  }

  const resolved = resolveSelectedStrategy(profile);
  const performanceReviewRequired =
    performance !== null && (performance.advisorRecommendation === "review_required" || performance.advisorRecommendation === "not_ready_for_real_execution");

  const activeSignals = signals.filter((s) => s.status === "active");
  const convertibleSignals = activeSignals.filter(isConvertibleToDraft);
  const blockedSignals = signals.filter((s) => s.status === "blocked_by_risk");
  const watchSignals = activeSignals.filter((s) => s.action === "watch" || s.action === "no_action");

  const draftIntents = tradeIntents.filter((i) => i.status === "draft");
  const cancelledIntents = tradeIntents.filter((i) => i.status === "cancelled");
  const pendingIntents = tradeIntents.filter((i) => i.status === "pending");
  const approvedIntents = tradeIntents.filter((i) => i.status === "approved");
  const rejectedIntents = tradeIntents.filter((i) => i.status === "rejected");
  const closedIntents = tradeIntents.filter((i) => i.status === "closed");

  const approvedDecisions = decisions.filter((d) => d.verdict === "approved");
  const rejectedDecisions = decisions.filter((d) => d.verdict === "rejected");
  const totalDecided = approvedDecisions.length + rejectedDecisions.length;

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  const governanceInput: GovernanceStatusInput = {
    hasSelectedStrategy: profile !== null,
    staleSelectedStrategy: resolved.staleSelectedStrategy !== null,
    performanceReviewRequired,
    draftCount: draftIntents.length,
    blockedSignalsCount: blockedSignals.length,
    rejectedDecisionsCount: rejectedDecisions.length,
    strategyHealth: summary.strategyHealth,
  };
  const governanceStatus = derivePortfolioGovernanceStatus(governanceInput);

  const nextAction = getNextPortfolioAction({
    hasSelectedStrategy: profile !== null,
    staleSelectedStrategy: resolved.staleSelectedStrategy !== null,
    performanceReviewRequired,
    convertibleSignalsCount: convertibleSignals.length,
    draftCount: draftIntents.length,
    recentRejectedDecisionsCount: rejectedDecisions.length,
    openPositionsCount: openPositions.length,
    hasAnySignals: signals.length > 0,
  });

  return {
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      baseCapitalUsd: summary.baseCapitalUsd,
      simulatedPortfolioValueUsd: summary.simulatedEquityUsd,
      simulatedCashUsd: summary.simulatedCashUsd,
      openExposureUsd: summary.openExposureUsd,
      realizedPnlUsd: summary.realizedPnlUsd,
      unrealizedPnlUsd: summary.unrealizedPnlUsd,
      totalPnlUsd: summary.totalPnlUsd,
      openPositionsCount: summary.openPositionsCount,
      closedPositionsCount: closedPositions.length,
      lastMarkedToMarketAt: latestMarkedAt(positions),
    },

    strategy: {
      selectedStrategyId: profile?.strategy_key ?? null,
      name: resolved.selectedStrategy?.name ?? resolved.staleSelectedStrategy?.strategyName ?? null,
      status: !profile ? "none" : resolved.staleSelectedStrategy !== null ? "stale" : performanceReviewRequired ? "review_required" : "active",
      selectedAt: profile?.selected_at ?? null,
      staleSelectedStrategy: resolved.staleSelectedStrategy !== null,
      recommendation: performance?.advisorExplanation ?? null,
    },

    signals: {
      activeCount: activeSignals.length,
      convertibleCount: convertibleSignals.length,
      blockedCount: blockedSignals.length,
      watchCount: watchSignals.length,
      recent: signals.slice(0, RECENT_SIGNALS_LIMIT).map(mapSignal),
    },

    tradeIntents: {
      draftCount: draftIntents.length,
      cancelledCount: cancelledIntents.length,
      pendingCount: pendingIntents.length,
      approvedCount: approvedIntents.length,
      rejectedCount: rejectedIntents.length,
      closedCount: closedIntents.length,
      recent: tradeIntents.slice(0, RECENT_INTENTS_LIMIT).map(mapTradeIntent),
    },

    decisions: {
      approvedCount: approvedDecisions.length,
      rejectedCount: rejectedDecisions.length,
      approvalRate: totalDecided > 0 ? approvedDecisions.length / totalDecided : null,
      recent: decisions.slice(0, RECENT_DECISIONS_LIMIT).map(mapDecision),
    },

    positions: {
      openCount: openPositions.length,
      recentOpen: openPositions.slice(0, RECENT_OPEN_POSITIONS_LIMIT).map(mapOpenPosition),
    },

    governance: {
      paperOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      status: governanceStatus.status,
      reasons: governanceStatus.reasons,
    },

    recentActivity: activity.slice(0, RECENT_ACTIVITY_LIMIT).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      subjectType: event.subject_type,
      subjectId: event.subject_id,
      createdAt: event.occurred_at,
      summary: summarizeActivityEvent(event),
    })),

    nextAction,
  };
}
