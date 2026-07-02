// Deterministic simulated market price generator for AOC Capital paper
// trading. No live exchange connection, no API keys, no network calls: the
// price is a pure function of (symbol, UTC time bucket). The same symbol
// marked twice within the same bucket always returns the same price; a new
// bucket produces a new (still deterministic) price.

const BASE_PRICE_USD: Record<string, number> = {
  "BTC-USD": 65000,
  "ETH-USD": 3200,
  "SOL-USD": 145,
  AAPL: 195,
  SPY: 520,
};

const DEFAULT_BASE_PRICE_USD = 100;

/** Symbols outside BASE_PRICE_USD still get a stable, deterministic price via this default. */
export function basePriceForSymbol(symbol: string): number {
  return BASE_PRICE_USD[symbol.toUpperCase()] ?? DEFAULT_BASE_PRICE_USD;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Floors a timestamp to the start of its UTC bucket (default: 1 hour). */
export function timeBucketStart(at: Date, bucketMinutes = 60): Date {
  const bucketMs = bucketMinutes * 60 * 1000;
  return new Date(Math.floor(at.getTime() / bucketMs) * bucketMs);
}

/**
 * Deterministic simulated price for `symbol` as of the UTC time bucket
 * containing `at`. Oscillates the symbol's base price by up to +/-8% based on
 * a hash of symbol + bucket start — stable within a bucket, different across
 * buckets. This is a mock/manual price source only (paper_market_prices.source
 * = 'mock'); it is never fetched from a live market data API.
 */
export function getSimulatedPrice(symbol: string, at: Date = new Date(), bucketMinutes = 60): number {
  const bucketStart = timeBucketStart(at, bucketMinutes);
  const basePrice = basePriceForSymbol(symbol);
  const seed = hashSeed(`${symbol.toUpperCase()}:${bucketStart.toISOString()}`);
  const oscillation = ((seed % 1601) - 800) / 10000; // range: -0.08 .. +0.08
  const price = basePrice * (1 + oscillation);
  return Math.round(price * 100) / 100;
}
