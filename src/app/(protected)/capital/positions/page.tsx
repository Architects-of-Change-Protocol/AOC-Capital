import { requireAuthUser } from "@/lib/auth";
import { listPaperPositions } from "@/lib/trading/trade-service";

export default async function PaperPositionsPage() {
  const user = await requireAuthUser();
  const positions = await listPaperPositions(user.companyId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Paper Positions</h2>
      <div className="space-y-2">
        {positions.length === 0 && <p className="text-sm text-slate-500">No paper positions yet.</p>}
        {positions.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium text-white">{p.symbol}</span>
              <span className="text-slate-400">{p.side} · {p.quantity} @ ${p.entry_price.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3">
              {p.status === "closed" ? <span className="text-slate-400">realized P&L ${p.realized_pnl_usd.toFixed(2)}</span> : null}
              <span className={`rounded-full border px-3 py-1 text-xs ${p.status === "open" ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"}`}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
