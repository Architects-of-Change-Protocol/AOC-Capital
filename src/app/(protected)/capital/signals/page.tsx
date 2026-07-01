import { requireAuthUser } from "@/lib/auth";
import { listMarketSignals } from "@/lib/trading/trade-service";
import { CreateTradeIntentFromSignal } from "./signal-actions";

const DIRECTION_STYLE: Record<string, string> = {
  long: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  short: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  neutral: "border-white/10 bg-white/5 text-slate-300",
};

export default async function MarketSignalsPage() {
  const user = await requireAuthUser();
  const signals = await listMarketSignals(user.companyId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Market Signals</h2>
        <p className="mt-1 text-sm text-slate-400">
          Deterministic mock signal feed for the paper-trading MVP — no live exchange connection is wired up yet.
        </p>
      </div>

      <div className="space-y-2">
        {signals.map((signal) => (
          <div key={signal.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/10 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{signal.symbol}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${DIRECTION_STYLE[signal.direction]}`}>{signal.direction}</span>
                <span className="text-xs text-slate-500">{signal.signal_type.replace("_", " ")}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{signal.note}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">confidence {(signal.confidence * 100).toFixed(0)}%</span>
              <CreateTradeIntentFromSignal signalId={signal.id} symbol={signal.symbol} direction={signal.direction} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
