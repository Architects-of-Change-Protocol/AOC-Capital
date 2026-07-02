// Pure P&L calculations shared by mark-to-market (unrealized, mark = current
// simulated price) and position close (realized, mark = simulated close
// price). Paper-only: these functions never touch real money or an exchange.

import type { TradeIntentSide } from "./database-contract";

/**
 * P&L for a position moving from entryPriceUsd to markPriceUsd.
 * Long (buy): gains when markPrice > entryPrice.
 * Level 1 never creates side = 'sell' (short) positions — no_real_shorts in
 * risk-policy-engine.ts always rejects them — but the sign flip below handles
 * one defensively (without enabling new short creation) should it ever exist.
 */
export function computePositionPnlUsd(side: TradeIntentSide, quantity: number, entryPriceUsd: number, markPriceUsd: number): number {
  const direction = side === "buy" ? 1 : -1;
  return direction * (markPriceUsd - entryPriceUsd) * quantity;
}

/** P&L as a percentage of the position's entry (cost-basis) notional. */
export function computePnlPct(pnlUsd: number, entryNotionalUsd: number): number {
  if (!(entryNotionalUsd > 0)) return 0;
  return (pnlUsd / entryNotionalUsd) * 100;
}

export function computeNotionalUsd(quantity: number, priceUsd: number): number {
  return quantity * priceUsd;
}
