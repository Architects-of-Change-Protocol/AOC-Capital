import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { listPaperPositionsMarked } from "@/lib/trading/trade-service";
import { computePnlPct } from "@/lib/trading/mark-to-market";
import { MarkAllButton, PositionActions } from "./paper-position-actions";

function ViewDetailLink({ positionId }: { positionId: string }) {
  return (
    <Link href={`/capital/positions/${positionId}`} className="text-xs text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
      View Detail →
    </Link>
  );
}

function pnlClassName(value: number): string {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

export default async function PaperPositionsPage() {
  const user = await requireAuthUser();
  const positions = await listPaperPositionsMarked(user.companyId);
  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Open Paper Positions</h2>
            <p className="mt-1 text-sm text-slate-400">
              Marked to a live public market price when available, or a deterministic simulated price otherwise — see Market Data
              for the current source.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {["Paper-only", "Governed paper action", "Real execution locked", "No broker connected"].map((badge) => (
                <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <MarkAllButton />
        </div>
        <div className="space-y-3">
          {openPositions.length === 0 && <p className="text-sm text-slate-500">No open paper positions.</p>}
          {openPositions.map((p) => (
            <div key={p.id} className="rounded-xl border border-emerald-300/10 bg-black/10 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-white">{p.symbol}</span>
                  <span className="text-slate-400">
                    {p.side} · {p.quantity} @ ${p.entry_price_usd.toFixed(2)}
                  </span>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-3 py-1 text-xs text-emerald-200">open</span>
                </div>
                <div className="flex items-center gap-3">
                  <ViewDetailLink positionId={p.id} />
                  <PositionActions positionId={p.id} />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                <span>Entry notional: ${p.entry_notional_usd.toFixed(2)}</span>
                <span>Current price: ${p.current_price_usd.toFixed(2)}</span>
                <span>Current notional: ${p.current_notional_usd.toFixed(2)}</span>
                <span className={pnlClassName(p.unrealized_pnl_usd)}>
                  Unrealized P&L: ${p.unrealized_pnl_usd.toFixed(2)} ({p.unrealized_pnl_pct.toFixed(2)}%)
                </span>
                <span>Opened: {new Date(p.opened_at).toLocaleString()}</span>
                <span>Last marked: {p.last_marked_at ? new Date(p.last_marked_at).toLocaleString() : "not yet marked"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Closed Paper Positions</h2>
        <div className="space-y-3">
          {closedPositions.length === 0 && <p className="text-sm text-slate-500">No closed paper positions yet.</p>}
          {closedPositions.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-white">{p.symbol}</span>
                  <span className="text-slate-400">
                    {p.side} · {p.quantity} @ ${p.entry_price_usd.toFixed(2)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">closed</span>
                </div>
                <div className="flex items-center gap-3">
                  <ViewDetailLink positionId={p.id} />
                  <span className={`font-medium ${pnlClassName(p.realized_pnl_usd)}`}>
                    Realized P&L: ${p.realized_pnl_usd.toFixed(2)} ({computePnlPct(p.realized_pnl_usd, p.entry_notional_usd).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                <span>Close price: ${p.close_price_usd !== null ? p.close_price_usd.toFixed(2) : "—"}</span>
                <span>Opened: {new Date(p.opened_at).toLocaleString()}</span>
                <span>Closed: {p.closed_at ? new Date(p.closed_at).toLocaleString() : "—"}</span>
                <span>Close reason: {p.close_reason ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
