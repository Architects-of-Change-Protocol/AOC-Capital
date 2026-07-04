// AOC Capital — Position Detail & Lifecycle Timeline v1 (PR #16).
//
// Read-only aggregation service only. Reads a single governed paper position
// plus its upstream trace (trade intent, Risk Constitution decision, source
// signal recommendation, source strategy) and related audit_ledger events,
// then normalizes all of it into a single PositionDetail payload.
//
// This never generates a signal, never creates/submits/cancels a draft trade
// intent, never runs Risk Constitution review, never creates a trade
// decision, never opens/closes/marks a paper position, and never changes the
// selected strategy. It reads getPaperPosition() (not
// listPaperPositionsMarked() / markAllOpenPositions() / closePaperPosition()),
// so simply viewing this page never triggers a fresh mark-to-market write or
// any other mutation. Real execution remains locked.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultPortfolio, getPaperPosition } from "@/lib/trading/trade-service";
import { getSelectedStrategyProfile } from "./strategy-selection-service";
import { PAPER_SIGNAL_RECOMMENDATION_COLUMNS } from "./signal-engine-service";
import type { AuditLedgerRow, PaperPositionRow, PaperSignalRecommendationRow, TradeDecisionRow, TradeIntentRow } from "@/lib/trading/database-contract";

export class PositionDetailNotFoundError extends Error {
  constructor(positionId: string) {
    super(`Paper position ${positionId} not found for this workspace.`);
    this.name = "PositionDetailNotFoundError";
  }
}

const TRADE_INTENT_COLUMNS =
  "id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at,cancelled_at,cancelled_by";
const TRADE_DECISION_COLUMNS = "id,company_id,trade_intent_id,verdict,reasons,policy_version,decided_at";
const AUDIT_LEDGER_COLUMNS = "id,company_id,event_type,subject_type,subject_id,actor,payload,occurred_at";

/** Scoped by company_id + portfolio_id — never trusts positionId's own trade_intent_id in isolation. */
async function getTradeIntentById(companyId: string, portfolioId: string, tradeIntentId: string): Promise<TradeIntentRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_intents")
    .select(TRADE_INTENT_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("id", tradeIntentId)
    .maybeSingle();
  return (data ?? null) as TradeIntentRow | null;
}

/** A trade intent should have exactly one decision (the risk policy engine evaluates each intent once) — latest is the authoritative one if more than one is ever found. */
async function getLatestTradeDecision(companyId: string, tradeIntentId: string): Promise<TradeDecisionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_decisions")
    .select(TRADE_DECISION_COLUMNS)
    .eq("company_id", companyId)
    .eq("trade_intent_id", tradeIntentId)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as TradeDecisionRow | null;
}

async function getSignalRecommendationById(companyId: string, portfolioId: string, signalId: string): Promise<PaperSignalRecommendationRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_signal_recommendations")
    .select(PAPER_SIGNAL_RECOMMENDATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("id", signalId)
    .maybeSingle();
  return (data ?? null) as PaperSignalRecommendationRow | null;
}

/** Related audit events found by subject_id — see summarizeAuditEvent() for the known event_type -> summary mapping. Always scoped by company_id. */
async function listAuditEventsForSubjects(companyId: string, subjectIds: string[]): Promise<AuditLedgerRow[]> {
  const ids = Array.from(new Set(subjectIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_ledger")
    .select(AUDIT_LEDGER_COLUMNS)
    .eq("company_id", companyId)
    .in("subject_id", ids)
    .order("occurred_at", { ascending: true })
    .limit(100);
  return (data ?? []) as AuditLedgerRow[];
}

// ─── Governance flags ────────────────────────────────────────────────────────

export type GovernanceFlags = {
  paperOnly: boolean;
  realExecutionLocked: boolean;
  noRealExecution: boolean;
  noBrokerOrder: boolean;
  noOrderPlaced: boolean;
};

/** Every governed write in this system is paper-only by construction — these are the safe defaults when a payload doesn't carry an explicit flag. */
const DEFAULT_GOVERNANCE_FLAGS: GovernanceFlags = {
  paperOnly: true,
  realExecutionLocked: true,
  noRealExecution: true,
  noBrokerOrder: true,
  noOrderPlaced: true,
};

function boolFromPayload(payload: Record<string, unknown>, snakeKey: string, camelKey: string): boolean | undefined {
  if (typeof payload[snakeKey] === "boolean") return payload[snakeKey] as boolean;
  if (typeof payload[camelKey] === "boolean") return payload[camelKey] as boolean;
  return undefined;
}

/** Audit payloads across this codebase mix snake_case (e.g. draft_trade_intent_cancelled) and camelCase (e.g. position_opened) keys — checks both, falling back to the safe paper-only defaults when a flag isn't present at all. */
export function extractGovernanceFlags(payload: Record<string, unknown> | null | undefined): GovernanceFlags {
  const p = payload ?? {};
  return {
    paperOnly: boolFromPayload(p, "paper_only", "paperOnly") ?? DEFAULT_GOVERNANCE_FLAGS.paperOnly,
    realExecutionLocked: boolFromPayload(p, "real_execution_locked", "realExecutionLocked") ?? DEFAULT_GOVERNANCE_FLAGS.realExecutionLocked,
    noRealExecution: boolFromPayload(p, "no_real_execution", "noRealExecution") ?? DEFAULT_GOVERNANCE_FLAGS.noRealExecution,
    noBrokerOrder: boolFromPayload(p, "no_broker_order", "noBrokerOrder") ?? DEFAULT_GOVERNANCE_FLAGS.noBrokerOrder,
    noOrderPlaced: boolFromPayload(p, "no_order_placed", "noOrderPlaced") ?? DEFAULT_GOVERNANCE_FLAGS.noOrderPlaced,
  };
}

// ─── summarizeAuditEvent ──────────────────────────────────────────────────────

export type AuditEventLike = {
  eventType: string;
  subjectType: string;
  subjectId: string;
  payload: Record<string, unknown>;
};

export type AuditEventSummary = {
  title: string;
  description: string;
  governanceFlags: GovernanceFlags;
};

function fmtUsd(value: unknown): string | null {
  return typeof value === "number" ? `$${value.toFixed(2)}` : null;
}

const AUDIT_EVENT_SUMMARY: Record<string, { title: string; describe: (payload: Record<string, unknown>) => string }> = {
  trade_intent_created: {
    title: "Trade intent created",
    describe: (p) => `Draft trade intent created${typeof p.symbol === "string" ? ` for ${p.symbol}` : ""}.`,
  },
  signal_converted_to_draft_trade_intent: {
    title: "Signal converted to draft trade intent",
    describe: () => "A signal recommendation was converted into a draft trade intent by a human.",
  },
  trade_intent_submitted_for_review: {
    title: "Draft submitted for Risk Constitution review",
    describe: () => "The draft trade intent was submitted for Risk Constitution review.",
  },
  trade_decision_approved: {
    title: "Risk Constitution decision: approved",
    describe: () => "Risk Constitution approved this paper trade intent.",
  },
  trade_decision_rejected: {
    title: "Risk Constitution decision: rejected",
    describe: () => "Risk Constitution rejected this paper trade intent.",
  },
  position_opened: {
    title: "Paper position opened",
    describe: (p) => {
      const price = fmtUsd(p.entryPriceUsd);
      return price ? `Paper position opened at ${price}.` : "Paper position opened.";
    },
  },
  position_marked_to_market: {
    title: "Position marked to market",
    describe: (p) => {
      const price = fmtUsd(p.currentPriceUsd);
      return price ? `Position marked to ${price}.` : "Position marked to market.";
    },
  },
  position_closed: {
    title: "Paper position closed",
    describe: (p) => {
      const pnl = fmtUsd(p.realizedPnlUsd);
      return pnl ? `Paper position closed with realized P&L ${pnl}.` : "Paper position closed.";
    },
  },
  paper_position_close_review_approved: {
    title: "Paper close review approved",
    describe: () => "Governed paper close review approved closing this simulated position.",
  },
  paper_position_closed: {
    title: "Paper position closed",
    describe: () => "Simulated paper position was closed using stored paper valuation. No real order was placed.",
  },
  draft_trade_intent_cancelled: {
    title: "Draft trade intent cancelled",
    describe: () => "The draft trade intent was withdrawn before Risk Constitution review.",
  },
  strategy_selected: {
    title: "Strategy selected",
    describe: () => "A paper strategy was selected for this portfolio.",
  },
  signals_generated: {
    title: "Signals generated",
    describe: () => "A batch of paper signal recommendations was generated.",
  },
};

/** Maps a known audit_ledger event_type to a human-readable summary; unknown event types (e.g. advisor- or demo-scenario events) fall back to a generic governance-event summary. Never exposes the raw payload. */
export function summarizeAuditEvent(event: AuditEventLike): AuditEventSummary {
  const known = AUDIT_EVENT_SUMMARY[event.eventType];
  return {
    title: known?.title ?? event.eventType.replace(/_/g, " "),
    description: known ? known.describe(event.payload ?? {}) : "Related governance event recorded.",
    governanceFlags: extractGovernanceFlags(event.payload),
  };
}

// ─── derivePositionPnl ────────────────────────────────────────────────────────

export type PositionPnlInput = {
  status: "open" | "closed";
  entryNotionalUsd: number;
  currentNotionalUsd: number | null;
  /** Only ever passed through, never inferred — pass null when the schema doesn't reliably carry a realized figure. */
  realizedPnlUsd: number | null;
};

export type PositionPnlResult = {
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  realizedPnlUsd: number | null;
  totalPnlUsd: number | null;
  pnlStatus: "gain" | "loss" | "flat" | "not_available";
};

/**
 * Pure, deterministic P&L derivation. unrealizedPnlUsd is only computed when
 * currentNotionalUsd is present (never mark-to-market itself). Percent is
 * only computed when entryNotionalUsd > 0 (divide-by-zero safe). Realized
 * P&L is only ever the stored figure passed in for closed positions — this
 * never infers a missing realized figure from partial data.
 */
export function derivePositionPnl(position: PositionPnlInput): PositionPnlResult {
  const unrealizedPnlUsd = position.currentNotionalUsd !== null ? position.currentNotionalUsd - position.entryNotionalUsd : null;
  const unrealizedPnlPct = unrealizedPnlUsd !== null && position.entryNotionalUsd > 0 ? unrealizedPnlUsd / position.entryNotionalUsd : null;
  const realizedPnlUsd = position.status === "closed" ? position.realizedPnlUsd : null;

  const totalPnlUsd = position.status === "closed" ? realizedPnlUsd : unrealizedPnlUsd;

  let pnlStatus: PositionPnlResult["pnlStatus"];
  if (totalPnlUsd === null) pnlStatus = "not_available";
  else if (totalPnlUsd > 0) pnlStatus = "gain";
  else if (totalPnlUsd < 0) pnlStatus = "loss";
  else pnlStatus = "flat";

  return { unrealizedPnlUsd, unrealizedPnlPct, realizedPnlUsd, totalPnlUsd, pnlStatus };
}

// ─── deriveCloseReviewEligibility ─────────────────────────────────────────────

export type CloseReviewEligibilityInput = {
  status: "open" | "closed";
  currentPriceUsd: number | null;
  currentNotionalUsd: number | null;
  entryNotionalUsd: number | null;
  quantity: number;
};

export type CloseReviewEligibilityReason = "already_closed" | "not_open" | "missing_valuation";

export type CloseReviewEligibilityResult = {
  eligible: boolean;
  reason: CloseReviewEligibilityReason | null;
};

/**
 * Pure, deterministic mirror of the eligibility check enforced by
 * requestPaperPositionCloseReview() (src/lib/capital/position-close-review-
 * service.ts) and, authoritatively, by the governed close-review RPC it
 * calls — used here only to decide what the Position Detail page renders
 * (the CTA, the missing-valuation notice, or the closed notice). Never
 * itself submits a close review or mutates anything.
 */
export function deriveCloseReviewEligibility(input: CloseReviewEligibilityInput): CloseReviewEligibilityResult {
  if (input.status === "closed") return { eligible: false, reason: "already_closed" };
  if (input.status !== "open") return { eligible: false, reason: "not_open" };
  if (input.currentPriceUsd === null || input.currentNotionalUsd === null) return { eligible: false, reason: "missing_valuation" };
  if (input.entryNotionalUsd === null) return { eligible: false, reason: "missing_valuation" };
  if (!(input.quantity > 0)) return { eligible: false, reason: "missing_valuation" };
  return { eligible: true, reason: null };
}

// ─── deriveTraceabilityStatus ─────────────────────────────────────────────────

export type TraceabilityInput = {
  tradeIntentAvailable: boolean;
  decisionAvailable: boolean;
  /** True only when the trade intent's source is 'signal_recommendation' — a manual/non-signal draft never requires a signal or strategy to be "complete". */
  signalRequired: boolean;
  signalAvailable: boolean;
  strategyAvailable: boolean;
  auditEventsAvailable: boolean;
};

export type TraceabilityStatus = "complete" | "partial" | "position_only";
export type TraceabilityMissing = "strategy" | "signal" | "trade_intent" | "decision" | "audit_events";

export type TraceabilityResult = {
  status: TraceabilityStatus;
  missing: TraceabilityMissing[];
  message: string;
};

export const TRACEABILITY_COMPLETE_MESSAGE = "Full paper-governance chain resolved from signal through Risk Constitution decision.";
export const TRACEABILITY_PARTIAL_MESSAGE = "Some upstream records could not be resolved from the available paper-governance chain.";
export const TRACEABILITY_POSITION_ONLY_MESSAGE =
  "Only the paper position record could be resolved. Upstream trade intent, decision, and signal records could not be resolved.";

/**
 * Deterministic traceability classification, never a compliance
 * certification. position_only when the trade intent itself couldn't be
 * resolved (nothing upstream can be trusted in that case); partial when the
 * intent resolved but something else in the chain didn't; complete only when
 * every applicable upstream record (and at least one related audit event)
 * was found. Signal/strategy are only required when the source trade intent
 * says it came from a signal recommendation.
 */
export function deriveTraceabilityStatus(input: TraceabilityInput): TraceabilityResult {
  if (!input.tradeIntentAvailable) {
    const missing: TraceabilityMissing[] = ["trade_intent"];
    if (!input.decisionAvailable) missing.push("decision");
    if (input.signalRequired && !input.signalAvailable) missing.push("signal");
    if (input.signalRequired && !input.strategyAvailable) missing.push("strategy");
    if (!input.auditEventsAvailable) missing.push("audit_events");
    return { status: "position_only", missing, message: TRACEABILITY_POSITION_ONLY_MESSAGE };
  }

  const missing: TraceabilityMissing[] = [];
  if (!input.decisionAvailable) missing.push("decision");
  if (input.signalRequired && !input.signalAvailable) missing.push("signal");
  if (input.signalRequired && !input.strategyAvailable) missing.push("strategy");
  if (!input.auditEventsAvailable) missing.push("audit_events");

  if (missing.length === 0) {
    return { status: "complete", missing, message: TRACEABILITY_COMPLETE_MESSAGE };
  }

  return { status: "partial", missing, message: TRACEABILITY_PARTIAL_MESSAGE };
}

// ─── buildPositionLifecycleTimeline ───────────────────────────────────────────

export type LifecycleAuditEvent = {
  id: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type TimelineEntryKind =
  | "strategy_selected"
  | "signal_generated"
  | "draft_created"
  | "draft_cancelled"
  | "submitted_for_review"
  | "risk_decision"
  | "position_opened"
  | "marked_to_market"
  | "close_review_approved"
  | "position_closed"
  | "audit_event";

export type TimelineEntry = {
  id: string;
  timestamp: string;
  kind: TimelineEntryKind;
  title: string;
  description: string;
  subjectType: string | null;
  subjectId: string | null;
  governanceFlags: GovernanceFlags;
};

export type LifecycleTimelineInput = {
  strategy: { id: string; name: string; selectedAt: string | null } | null;
  signal: { id: string; symbol: string; action: string; generatedAt: string } | null;
  tradeIntent: { id: string; symbol: string; side: string; createdAt: string } | null;
  decision: { id: string; verdict: "approved" | "rejected"; createdAt: string } | null;
  position: { id: string; symbol: string; openedAt: string; closedAt: string | null; lastMarkedToMarketAt: string | null };
  auditEvents: LifecycleAuditEvent[];
};

function findAuditEvents(auditEvents: LifecycleAuditEvent[], eventTypes: string[], subjectId: string | null): LifecycleAuditEvent[] {
  if (!subjectId) return [];
  return auditEvents.filter((event) => eventTypes.includes(event.eventType) && event.subjectId === subjectId);
}

/**
 * Builds the chronological Lifecycle Timeline from a mix of structured
 * records (strategy/signal/tradeIntent/decision/position) and related
 * audit_ledger events. Every lifecycle moment is emitted from exactly one
 * source — the richer audit-ledger event when one exists for that moment,
 * otherwise a fallback entry derived from the structured record — so a
 * table-backed fact and its audit-ledger echo never both appear (the
 * de-duplication the spec calls for). Any audit event left over after every
 * known lifecycle moment has claimed its match is still surfaced, as a
 * generic audit_event entry, so nothing related silently disappears.
 */
export function buildPositionLifecycleTimeline(input: LifecycleTimelineInput): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const consumed = new Set<string>();

  function consume(events: LifecycleAuditEvent[]) {
    for (const event of events) consumed.add(event.id);
  }

  function fromAudit(event: LifecycleAuditEvent, kind: TimelineEntryKind): TimelineEntry {
    const summary = summarizeAuditEvent({ eventType: event.eventType, subjectType: event.subjectType, subjectId: event.subjectId, payload: event.payload });
    return {
      id: `audit:${event.id}`,
      timestamp: event.occurredAt,
      kind,
      title: summary.title,
      description: summary.description,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      governanceFlags: summary.governanceFlags,
    };
  }

  if (input.strategy?.selectedAt) {
    entries.push({
      id: `strategy:${input.strategy.id}`,
      timestamp: input.strategy.selectedAt,
      kind: "strategy_selected",
      title: "Strategy selected",
      description: `${input.strategy.name} was selected as the source strategy.`,
      subjectType: "portfolio_strategy_profile",
      subjectId: input.strategy.id,
      governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
    });
  }

  if (input.signal) {
    entries.push({
      id: `signal:${input.signal.id}`,
      timestamp: input.signal.generatedAt,
      kind: "signal_generated",
      title: "Signal recommendation generated",
      description: `${input.signal.action.replace(/_/g, " ")} signal generated for ${input.signal.symbol}.`,
      subjectType: "paper_signal_recommendation",
      subjectId: input.signal.id,
      governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
    });
  }

  if (input.tradeIntent) {
    const draftAudit = findAuditEvents(input.auditEvents, ["trade_intent_created", "signal_converted_to_draft_trade_intent"], input.tradeIntent.id);
    if (draftAudit.length > 0) {
      entries.push(fromAudit(draftAudit[0], "draft_created"));
      consume(draftAudit);
    } else {
      entries.push({
        id: `draft:${input.tradeIntent.id}`,
        timestamp: input.tradeIntent.createdAt,
        kind: "draft_created",
        title: "Draft trade intent created",
        description: `Draft trade intent created for ${input.tradeIntent.symbol} (${input.tradeIntent.side}).`,
        subjectType: "trade_intent",
        subjectId: input.tradeIntent.id,
        governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
      });
    }

    const cancelAudit = findAuditEvents(input.auditEvents, ["draft_trade_intent_cancelled"], input.tradeIntent.id);
    for (const event of cancelAudit) {
      entries.push(fromAudit(event, "draft_cancelled"));
      consumed.add(event.id);
    }

    const submitAudit = findAuditEvents(input.auditEvents, ["trade_intent_submitted_for_review"], input.tradeIntent.id);
    for (const event of submitAudit) {
      entries.push(fromAudit(event, "submitted_for_review"));
      consumed.add(event.id);
    }

    const decisionAudit = findAuditEvents(input.auditEvents, ["trade_decision_approved", "trade_decision_rejected"], input.tradeIntent.id);
    if (decisionAudit.length > 0) {
      for (const event of decisionAudit) {
        entries.push(fromAudit(event, "risk_decision"));
        consumed.add(event.id);
      }
    } else if (input.decision) {
      entries.push({
        id: `decision:${input.decision.id}`,
        timestamp: input.decision.createdAt,
        kind: "risk_decision",
        title: `Risk Constitution decision: ${input.decision.verdict}`,
        description:
          input.decision.verdict === "approved" ? "Risk Constitution approved this paper trade intent." : "Risk Constitution rejected this paper trade intent.",
        subjectType: "trade_intent",
        subjectId: input.tradeIntent.id,
        governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
      });
    }
  }

  const openAudit = findAuditEvents(input.auditEvents, ["position_opened"], input.position.id);
  if (openAudit.length > 0) {
    entries.push(fromAudit(openAudit[0], "position_opened"));
    consume(openAudit);
  } else {
    entries.push({
      id: `position-opened:${input.position.id}`,
      timestamp: input.position.openedAt,
      kind: "position_opened",
      title: "Paper position opened",
      description: `Paper position opened for ${input.position.symbol}.`,
      subjectType: "paper_position",
      subjectId: input.position.id,
      governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
    });
  }

  const markAudit = findAuditEvents(input.auditEvents, ["position_marked_to_market"], input.position.id);
  if (markAudit.length > 0) {
    for (const event of markAudit) {
      entries.push(fromAudit(event, "marked_to_market"));
      consumed.add(event.id);
    }
  } else if (input.position.lastMarkedToMarketAt) {
    entries.push({
      id: `marked:${input.position.id}`,
      timestamp: input.position.lastMarkedToMarketAt,
      kind: "marked_to_market",
      title: "Position marked to market",
      description: "Position value refreshed to the latest stored simulated price.",
      subjectType: "paper_position",
      subjectId: input.position.id,
      governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
    });
  }

  if (input.position.closedAt) {
    const closeReviewAudit = findAuditEvents(input.auditEvents, ["paper_position_close_review_approved"], input.position.id);
    for (const event of closeReviewAudit) {
      entries.push(fromAudit(event, "close_review_approved"));
      consumed.add(event.id);
    }

    const closeAudit = findAuditEvents(input.auditEvents, ["position_closed", "paper_position_closed"], input.position.id);
    if (closeAudit.length > 0) {
      entries.push(fromAudit(closeAudit[0], "position_closed"));
      consume(closeAudit);
    } else {
      entries.push({
        id: `position-closed:${input.position.id}`,
        timestamp: input.position.closedAt,
        kind: "position_closed",
        title: "Paper position closed",
        description: `Paper position closed for ${input.position.symbol}.`,
        subjectType: "paper_position",
        subjectId: input.position.id,
        governanceFlags: DEFAULT_GOVERNANCE_FLAGS,
      });
    }
  }

  for (const event of input.auditEvents) {
    if (consumed.has(event.id)) continue;
    entries.push(fromAudit(event, "audit_event"));
  }

  entries.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : a.id.localeCompare(b.id)));

  return entries;
}

// ─── PositionDetail payload ───────────────────────────────────────────────────

export type PositionDetail = {
  position: {
    id: string;
    portfolioId: string;
    symbol: string;
    status: "open" | "closed";
    quantity: number;
    entryPriceUsd: number;
    currentPriceUsd: number | null;
    entryNotionalUsd: number;
    currentNotionalUsd: number | null;
    openedAt: string;
    closedAt: string | null;
    /** Set only when status = 'closed' — the actor (email) who closed the position, via either close path. */
    closedBy: string | null;
    closeNotionalUsd: number | null;
    /** Set only when status = 'closed' — null for positions closed before PR #17. */
    realizedPnlPct: number | null;
    /** Set only when closed through the governed close review path (PR #17). Null for positions closed through the older direct close path. */
    closeReviewId: string | null;
    lastMarkedToMarketAt: string | null;
    tradeIntentId: string | null;
  };

  pnl: PositionPnlResult;

  /** Whether this position may currently be submitted for governed close review — drives the Request Paper Close Review CTA. */
  closeReviewEligibility: CloseReviewEligibilityResult;

  sourceChain: {
    strategy: {
      id: string | null;
      name: string | null;
      selectedAt: string | null;
      traceStatus: "available" | "missing" | "not_applicable";
    };
    signal: {
      id: string | null;
      symbol: string | null;
      action: string | null;
      strength: string | null;
      suggestedNotionalUsd: number | null;
      generatedAt: string | null;
      rationale: string | null;
      riskNotes: string | null;
      traceStatus: "available" | "missing" | "not_applicable";
    };
    tradeIntent: {
      id: string | null;
      side: string | null;
      quantity: number | null;
      notionalUsd: number | null;
      source: string | null;
      recordStatus: string | null;
      createdAt: string | null;
      paperSignalRecommendationId: string | null;
      traceStatus: "available" | "missing" | "not_applicable";
    };
    decision: {
      id: string | null;
      verdict: "approved" | "rejected" | null;
      reasons: string[];
      createdAt: string | null;
      traceStatus: "available" | "missing" | "not_applicable";
    };
  };

  timeline: TimelineEntry[];

  auditTrail: Array<{
    id: string;
    eventType: string;
    subjectType: string;
    subjectId: string;
    createdAt: string;
    summary: string;
    governanceFlags: GovernanceFlags;
  }>;

  traceability: TraceabilityResult;

  governance: {
    paperOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    readOnly: true;
  };

  relatedLinks: {
    positions: string;
    allocation: string;
    overview: string;
    tradeIntents: string;
    signals: string;
    performance: string;
    closedPerformance: string;
  };
};

/**
 * Builds the read-only Position Detail payload for a single paper position,
 * scoped to the caller's tenant and default portfolio. Resolves the source
 * chain (strategy -> signal -> draft trade intent -> Risk Constitution
 * decision -> paper position) purely from existing tables, computes P&L only
 * where the stored data supports it, and tolerates any missing upstream
 * record instead of failing. Never mutates any table and never calls a
 * governed mutation RPC.
 */
export async function getPositionDetail(companyId: string, positionId: string): Promise<PositionDetail> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);
  const position: PaperPositionRow | null = await getPaperPosition(companyId, positionId);
  if (!position || position.portfolio_id !== portfolio.id) {
    throw new PositionDetailNotFoundError(positionId);
  }

  const tradeIntent = await getTradeIntentById(companyId, portfolio.id, position.trade_intent_id);

  const [decision, signal] = await Promise.all([
    tradeIntent ? getLatestTradeDecision(companyId, tradeIntent.id) : Promise.resolve(null),
    tradeIntent?.source === "signal_recommendation" && tradeIntent.paper_signal_recommendation_id
      ? getSignalRecommendationById(companyId, portfolio.id, tradeIntent.paper_signal_recommendation_id)
      : Promise.resolve(null),
  ]);

  const selectedProfile = await getSelectedStrategyProfile(companyId);

  const signalIsSource = tradeIntent?.source === "signal_recommendation";

  const strategyNode: PositionDetail["sourceChain"]["strategy"] = signal
    ? {
        id: signal.strategy_key,
        name: signal.strategy_name,
        selectedAt: selectedProfile && selectedProfile.strategy_key === signal.strategy_key ? selectedProfile.selected_at : null,
        traceStatus: "available",
      }
    : signalIsSource
      ? { id: null, name: null, selectedAt: null, traceStatus: "missing" }
      : { id: null, name: null, selectedAt: null, traceStatus: "not_applicable" };

  const signalNode: PositionDetail["sourceChain"]["signal"] = signal
    ? {
        id: signal.id,
        symbol: signal.symbol,
        action: signal.action,
        strength: signal.strength,
        suggestedNotionalUsd: signal.suggested_notional_usd,
        generatedAt: signal.generated_at,
        rationale: signal.rationale.length > 0 ? signal.rationale.join(" ") : null,
        riskNotes: signal.risk_notes.length > 0 ? signal.risk_notes.join(" ") : null,
        traceStatus: "available",
      }
    : signalIsSource
      ? { id: null, symbol: null, action: null, strength: null, suggestedNotionalUsd: null, generatedAt: null, rationale: null, riskNotes: null, traceStatus: "missing" }
      : { id: null, symbol: null, action: null, strength: null, suggestedNotionalUsd: null, generatedAt: null, rationale: null, riskNotes: null, traceStatus: "not_applicable" };

  const tradeIntentNode: PositionDetail["sourceChain"]["tradeIntent"] = tradeIntent
    ? {
        id: tradeIntent.id,
        side: tradeIntent.side,
        quantity: tradeIntent.quantity,
        notionalUsd: tradeIntent.notional_usd,
        source: tradeIntent.source,
        recordStatus: tradeIntent.status,
        createdAt: tradeIntent.created_at,
        paperSignalRecommendationId: tradeIntent.paper_signal_recommendation_id,
        traceStatus: "available",
      }
    : { id: null, side: null, quantity: null, notionalUsd: null, source: null, recordStatus: null, createdAt: null, paperSignalRecommendationId: null, traceStatus: "missing" };

  const decisionNode: PositionDetail["sourceChain"]["decision"] = decision
    ? {
        id: decision.id,
        verdict: decision.verdict,
        reasons: decision.reasons.map((reason) => `${reason.label}: ${reason.detail}`),
        createdAt: decision.decided_at,
        traceStatus: "available",
      }
    : { id: null, verdict: null, reasons: [], createdAt: null, traceStatus: tradeIntent ? "missing" : "not_applicable" };

  const subjectIds = [position.id, tradeIntent?.id, signal?.id].filter((id): id is string => Boolean(id));
  const auditEvents = await listAuditEventsForSubjects(companyId, subjectIds);

  const pnl = derivePositionPnl({
    status: position.status,
    entryNotionalUsd: position.entry_notional_usd,
    currentNotionalUsd: position.current_notional_usd,
    realizedPnlUsd: position.status === "closed" ? position.realized_pnl_usd : null,
  });

  const closeReviewEligibility = deriveCloseReviewEligibility({
    status: position.status,
    currentPriceUsd: position.current_price_usd,
    currentNotionalUsd: position.current_notional_usd,
    entryNotionalUsd: position.entry_notional_usd,
    quantity: position.quantity,
  });

  const timeline = buildPositionLifecycleTimeline({
    strategy: strategyNode.id ? { id: strategyNode.id, name: strategyNode.name ?? strategyNode.id, selectedAt: strategyNode.selectedAt } : null,
    signal: signal ? { id: signal.id, symbol: signal.symbol, action: signal.action, generatedAt: signal.generated_at } : null,
    tradeIntent: tradeIntent ? { id: tradeIntent.id, symbol: tradeIntent.symbol, side: tradeIntent.side, createdAt: tradeIntent.created_at } : null,
    decision: decision ? { id: decision.id, verdict: decision.verdict, createdAt: decision.decided_at } : null,
    position: { id: position.id, symbol: position.symbol, openedAt: position.opened_at, closedAt: position.closed_at, lastMarkedToMarketAt: position.last_marked_at },
    auditEvents: auditEvents.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      subjectType: event.subject_type,
      subjectId: event.subject_id,
      occurredAt: event.occurred_at,
      payload: event.payload,
    })),
  });

  const auditTrail = auditEvents
    .map((event) => {
      const summary = summarizeAuditEvent({ eventType: event.event_type, subjectType: event.subject_type, subjectId: event.subject_id, payload: event.payload });
      return {
        id: event.id,
        eventType: event.event_type,
        subjectType: event.subject_type,
        subjectId: event.subject_id,
        createdAt: event.occurred_at,
        summary: summary.description,
        governanceFlags: summary.governanceFlags,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  const traceability = deriveTraceabilityStatus({
    tradeIntentAvailable: Boolean(tradeIntent),
    decisionAvailable: Boolean(decision),
    signalRequired: signalIsSource,
    signalAvailable: Boolean(signal),
    strategyAvailable: Boolean(signal),
    auditEventsAvailable: auditEvents.length > 0,
  });

  return {
    position: {
      id: position.id,
      portfolioId: position.portfolio_id,
      symbol: position.symbol,
      status: position.status,
      quantity: position.quantity,
      entryPriceUsd: position.entry_price_usd,
      currentPriceUsd: position.current_price_usd,
      entryNotionalUsd: position.entry_notional_usd,
      currentNotionalUsd: position.current_notional_usd,
      openedAt: position.opened_at,
      closedAt: position.closed_at,
      closedBy: position.closed_by,
      closeNotionalUsd: position.close_notional_usd,
      realizedPnlPct: position.realized_pnl_pct,
      closeReviewId: position.close_review_id,
      lastMarkedToMarketAt: position.last_marked_at,
      tradeIntentId: position.trade_intent_id,
    },

    pnl,

    closeReviewEligibility,

    sourceChain: {
      strategy: strategyNode,
      signal: signalNode,
      tradeIntent: tradeIntentNode,
      decision: decisionNode,
    },

    timeline,
    auditTrail,
    traceability,

    governance: {
      paperOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      readOnly: true,
    },

    relatedLinks: {
      positions: "/capital/positions",
      allocation: "/capital/allocation",
      overview: "/capital/overview",
      tradeIntents: "/capital/trade-intents",
      signals: "/capital/signals",
      performance: "/capital/performance",
      closedPerformance: "/capital/performance/closed",
    },
  };
}
