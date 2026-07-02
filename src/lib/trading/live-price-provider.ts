// AOC Capital — optional live market data for paper trading only (PR #7).
//
// This module NEVER executes a trade, NEVER talks to a broker or exchange
// account, and NEVER requires trading credentials. It only reads a public,
// keyless price endpoint and hands a plain number back to the caller. It is
// off by default (LIVE_MARKET_DATA_ENABLED must be exactly "true") and only
// covers a small set of crypto symbols today — everything else, and every
// failure mode (disabled, unreachable, unsupported symbol, malformed
// response), resolves to LivePriceUnavailableError so the caller
// (trade-service.ts's recordMarketPrice) can fall back to the deterministic
// simulated price. Paper-trading mark-to-market must never fail, hang, or
// depend on an external service being up.

export const LIVE_MARKET_DATA_READ_ONLY = true as const;

export type LiveMarketDataProvider = "coingecko";

const DEFAULT_PROVIDER: LiveMarketDataProvider = "coingecko";
const DEFAULT_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 20_000;

/** Storage bucket granularity (minutes) used for live prices in paper_market_prices. */
export const LIVE_PRICE_BUCKET_MINUTES = 1;

/**
 * Only crypto symbols are covered by the free, keyless CoinGecko endpoint
 * today. Symbols outside this map (e.g. AAPL, SPY) always throw
 * LivePriceUnavailableError and fall back to the deterministic simulated
 * price — see trade-service.ts.
 */
const COINGECKO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin",
  "ETH-USD": "ethereum",
  "SOL-USD": "solana",
  "AVAX-USD": "avalanche-2",
};

export class LivePriceUnavailableError extends Error {
  constructor(symbol: string, reason: string) {
    super(`Live price unavailable for ${symbol}: ${reason}`);
    this.name = "LivePriceUnavailableError";
  }
}

/** Live market data is opt-in and off by default; unset or any value other than "true" keeps it disabled. */
export function isLiveMarketDataEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.LIVE_MARKET_DATA_ENABLED === "true";
}

export function getLiveMarketDataProvider(env: Record<string, string | undefined> = process.env): LiveMarketDataProvider {
  return env.MARKET_DATA_PROVIDER === "coingecko" ? "coingecko" : DEFAULT_PROVIDER;
}

/** Maps an AOC Capital symbol to the given provider's identifier, or null if the provider doesn't cover it. */
export function mapSymbolToProviderId(symbol: string, provider: LiveMarketDataProvider = DEFAULT_PROVIDER): string | null {
  if (provider === "coingecko") {
    return COINGECKO_IDS[symbol.toUpperCase()] ?? null;
  }
  return null;
}

export type LivePriceResult = {
  symbol: string;
  priceUsd: number;
  asOf: Date;
  provider: LiveMarketDataProvider;
};

type CacheEntry = { result: LivePriceResult; expiresAt: number };

// Module-level, in-memory only — never persisted, never shared across
// processes. Purely a rate-limiter so frequent mark-to-market calls (e.g.
// every Paper Positions page load) don't hammer the external provider.
const cache = new Map<string, CacheEntry>();

/** Test-only: clears the in-memory price cache between test cases. */
export function __clearLivePriceCacheForTests(): void {
  cache.clear();
}

export type FetchLivePriceOptions = {
  fetchImpl?: typeof fetch;
  now?: Date;
  timeoutMs?: number;
  provider?: LiveMarketDataProvider;
};

/**
 * Fetches a live spot price for `symbol` from a public, keyless market data
 * API. Always throws LivePriceUnavailableError (never a raw network error)
 * when the symbol isn't covered, the request fails or times out, or the
 * response can't be parsed — callers are expected to catch this and fall
 * back to the deterministic simulated price rather than surface it to the
 * end user.
 */
export async function fetchLivePrice(symbol: string, options: FetchLivePriceOptions = {}): Promise<LivePriceResult> {
  const provider = options.provider ?? DEFAULT_PROVIDER;
  const now = options.now ?? new Date();
  const cacheKey = `${provider}:${symbol.toUpperCase()}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) {
    return cached.result;
  }

  const providerId = mapSymbolToProviderId(symbol, provider);
  if (!providerId) {
    throw new LivePriceUnavailableError(symbol, `no ${provider} mapping for this symbol`);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(providerId)}&vs_currencies=usd`,
      { signal: controller.signal }
    );
  } catch (error) {
    throw new LivePriceUnavailableError(symbol, error instanceof Error ? error.message : "network error");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new LivePriceUnavailableError(symbol, `provider responded with status ${response.status}`);
  }

  const body: unknown = await response.json().catch(() => null);
  const price = (body as Record<string, Record<string, unknown>> | null)?.[providerId]?.usd;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new LivePriceUnavailableError(symbol, "malformed provider response");
  }

  const result: LivePriceResult = { symbol, priceUsd: price, asOf: now, provider };
  cache.set(cacheKey, { result, expiresAt: now.getTime() + CACHE_TTL_MS });
  return result;
}
