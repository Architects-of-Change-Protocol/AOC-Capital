// AOC Capital Demo Strategy Sandbox — canned scenario definition (PR #5).
//
// This is a Level 1 Governed Crypto Trend Sandbox: every symbol traded below
// is a crypto major (BTC-USD, ETH-USD, SOL-USD, AVAX-USD), so the story stays
// coherent as "a crypto trend-following paper strategy" rather than drifting
// into an unexplained multi-asset mix.
//
// Pure module: no I/O. Describes one coherent, deterministic strategy story —
// a Level 1 advisor intake plus a scripted, strictly-ordered sequence of
// governed actions — that, when run through the real write paths
// (advisor-write-service.ts, trade-service.ts), produces a believable mix of
// approved trades, one intentionally-rejected trade (submitted while the
// portfolio is already at its 3-open-position ceiling, to demonstrate the
// risk policy engine actively blocking something on more than one rule at
// once), a winning close, a losing close, and two positions left open for
// live mark-to-market. Nothing here is a shortcut around governance — every
// action is submitted through the same evaluate_and_record_trade_intent() /
// close_paper_position() RPCs a real user's trade would go through, so the
// plan only works because the numbers below were chosen to fit inside the
// real Level 1 ceilings (60% exposure, $20 daily / $40 weekly loss, 3 open
// positions — see risk-policy-engine.ts), not because anything is bypassed.
//
// Entry prices are steered relative to the deterministic simulated market
// price (mock-price-generator.ts) for the symbol's current UTC hour bucket —
// buying a little below that price manufactures a winner when closed at the
// (unchanged, same-bucket) simulated price; buying a little above it
// manufactures a loser. The risk policy engine has no idea any of this is
// "steered"; it just evaluates the intent it's given.

import { getSimulatedPrice } from "@/lib/trading/mock-price-generator";
import type { AdvisorIntake } from "@/lib/advisor/types";
import type { CloseReason, TradeIntentSide } from "@/lib/trading/database-contract";

/** Every symbol this scenario ever submits a trade intent for — a fixed crypto basket, never equities. */
export const DEMO_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"] as const;

/**
 * Canned advisor intake for the demo. Maps to a "growth" risk profile
 * (aggressive appetite + 25% tolerable drawdown, taking the more conservative
 * of the two per risk-profile.ts) with a $5,000 sandbox ceiling — plenty of
 * room to open three positions concurrently while staying well inside the
 * real Level 1 exposure and loss ceilings enforced by the risk policy engine.
 * preferredMarkets is crypto-only, matching every symbol the scenario trades.
 */
export const DEMO_INTAKE: AdvisorIntake = {
  startingCapitalUsd: 5000,
  primaryObjective: "balanced_growth",
  timeHorizon: "medium_term",
  riskAppetite: "aggressive",
  maxTolerableDrawdownPct: 25,
  preferredMarkets: ["crypto"],
  autonomyLevel: "assisted",
  tradingMode: "recommendations_only",
  wantsGatedRealExecution: false,
};

export type DemoTradeStepId = "btc_signal_win" | "eth_signal_hold" | "sol_manual_loss" | "avax_overleveraged_rejected" | "avax_manual_hold";

export type DemoTradeIntentStep = {
  id: DemoTradeStepId;
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  notionalUsd: number;
  leverage: number;
  source: "manual" | "signal";
  /** Symbol to look up a seeded market signal by, when source === "signal". */
  signalSymbol?: string;
  /** Human-readable narrative shown in the UI timeline, written before the intent is submitted. */
  narrative: string;
};

export type DemoCloseStep = {
  /** The DemoTradeStepId of the submit_intent action whose resulting position should be closed. */
  refId: DemoTradeStepId;
  closeReason: CloseReason;
  narrative: string;
};

export type DemoScenarioAction = { kind: "submit_intent"; step: DemoTradeIntentStep } | { kind: "close_position"; close: DemoCloseStep };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Builds the scripted action plan for the current UTC hour bucket. Pure
 * function of `now` — the same bucket always produces the same plan, since
 * getSimulatedPrice() is itself a pure function of (symbol, bucket). Actions
 * run strictly in array order:
 *
 *  1-3. Open BTC-USD, ETH-USD, SOL-USD — all approved, bringing the
 *       portfolio to exactly the 3-open-position ceiling.
 *  4.   Attempt a 3x-leveraged AVAX-USD trade while at that ceiling —
 *       rejected on both no_leverage and max_open_positions simultaneously.
 *  5-6. Close BTC-USD (winner) and SOL-USD (loser), freeing exposure and a
 *       position slot.
 *  7.   Open a properly-sized, unleveraged AVAX-USD trade — approved.
 *
 * ETH-USD and the second AVAX-USD position are left open for live mark-to-market.
 */
export function buildDemoScenarioPlan(now: Date = new Date()): DemoScenarioAction[] {
  const btcPrice = getSimulatedPrice("BTC-USD", now);
  const ethPrice = getSimulatedPrice("ETH-USD", now);
  const solPrice = getSimulatedPrice("SOL-USD", now);
  const avaxPrice = getSimulatedPrice("AVAX-USD", now);

  const btcEntry = round2(btcPrice * 0.98); // ~2% below sim price -> closes as a winner
  const ethEntry = round2(ethPrice * 1.01); // ~1% above sim price -> sits at a small open loss
  const solEntry = round2(solPrice * 1.02); // ~2% above sim price -> closes as a loser
  const avaxRejectedEntry = round2(avaxPrice);
  const avaxEntry = round2(avaxPrice * 0.99); // ~1% below sim price -> sits at a small open gain

  return [
    {
      kind: "submit_intent",
      step: {
        id: "btc_signal_win",
        symbol: "BTC-USD",
        side: "buy",
        notionalUsd: 700,
        quantity: roundQuantity(700 / btcEntry, 6),
        leverage: 1,
        source: "signal",
        signalSymbol: "BTC-USD",
        narrative: "Advisor-recommended, signal-informed long on BTC-USD.",
      },
    },
    {
      kind: "submit_intent",
      step: {
        id: "eth_signal_hold",
        symbol: "ETH-USD",
        side: "buy",
        notionalUsd: 700,
        quantity: roundQuantity(700 / ethEntry, 6),
        leverage: 1,
        source: "signal",
        signalSymbol: "ETH-USD",
        narrative: "Signal-informed long on ETH-USD — left open to demonstrate live mark-to-market on a position currently underwater.",
      },
    },
    {
      kind: "submit_intent",
      step: {
        id: "sol_manual_loss",
        symbol: "SOL-USD",
        side: "buy",
        notionalUsd: 600,
        quantity: roundQuantity(600 / solEntry, 6),
        leverage: 1,
        source: "manual",
        narrative: "Manually submitted long on SOL-USD, bringing the portfolio to its 3-open-position ceiling.",
      },
    },
    {
      kind: "submit_intent",
      step: {
        id: "avax_overleveraged_rejected",
        symbol: "AVAX-USD",
        side: "buy",
        notionalUsd: 500,
        quantity: roundQuantity(500 / avaxRejectedEntry, 6),
        leverage: 3,
        source: "manual",
        narrative:
          "Deliberately over-leveraged AVAX-USD trade intent (3x), submitted while already at the 3-open-position ceiling — shows the Level 1 risk policy engine reject a trade on two rules at once, not just approve everything.",
      },
    },
    {
      kind: "close_position",
      close: { refId: "btc_signal_win", closeReason: "take_profit", narrative: "BTC-USD hits its target — closed at a simulated profit." },
    },
    {
      kind: "close_position",
      close: { refId: "sol_manual_loss", closeReason: "stop_loss", narrative: "SOL-USD stopped out at a simulated loss, well inside the daily/weekly loss limits." },
    },
    {
      kind: "submit_intent",
      step: {
        id: "avax_manual_hold",
        symbol: "AVAX-USD",
        side: "buy",
        notionalUsd: 900,
        quantity: roundQuantity(900 / avaxEntry, 6),
        leverage: 1,
        source: "manual",
        narrative: "Properly-sized, unleveraged AVAX-USD trade intent submitted once the two closes freed up exposure and a position slot — left open at a small simulated gain.",
      },
    },
  ];
}
