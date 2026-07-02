import { requireAuthUser } from "@/lib/auth";
import { getMarketDataSnapshot } from "@/lib/trading/trade-service";
import { isLiveMarketDataEnabled } from "@/lib/trading/live-price-provider";
import { LIVE_MARKET_DATA_DISCLOSURE, PAPER_ONLY_BANNER } from "@/lib/capital/command-center-content";

const SOURCE_LABEL: Record<string, string> = {
  live: "Live",
  mock: "Simulated",
  manual: "Manual",
};

const SOURCE_STYLE: Record<string, string> = {
  live: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  mock: "border-white/10 bg-white/5 text-slate-300",
  manual: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200",
};

export default async function MarketDataPage() {
  const user = await requireAuthUser();
  const marketData = await getMarketDataSnapshot(user.companyId);
  const liveEnabled = isLiveMarketDataEnabled();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        {PAPER_ONLY_BANNER}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Market Data</h2>
        <p className="mt-1 text-sm text-slate-400">
          {liveEnabled
            ? "A read-only live market data feed is enabled for this environment. Prices below reflect it where the provider covers the symbol; every other symbol falls back to a deterministic simulated price."
            : "Live market data is disabled for this environment. Every price below is a deterministic simulated price — the same source used for mark-to-market since PR #3."}
        </p>
        <p className="mt-2 text-xs text-slate-500">{LIVE_MARKET_DATA_DISCLOSURE}</p>

        <div className="mt-4 space-y-2">
          {marketData.map((entry) => (
            <div
              key={entry.symbol}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-white">{entry.symbol}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${SOURCE_STYLE[entry.source] ?? SOURCE_STYLE.mock}`}>
                  {SOURCE_LABEL[entry.source] ?? entry.source}
                </span>
                {entry.provider && <span className="text-xs text-slate-500">via {entry.provider}</span>}
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <span>${entry.priceUsd.toFixed(2)}</span>
                <span className="text-xs text-slate-500">as of {new Date(entry.asOf).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
