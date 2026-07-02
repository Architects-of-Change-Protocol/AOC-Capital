import { requireAuthUser } from "@/lib/auth";
import { listAuditLedger } from "@/lib/trading/trade-service";

const EVENT_STYLE: Record<string, string> = {
  trade_intent_created: "border-white/10 bg-white/5 text-slate-300",
  trade_decision_approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  trade_decision_rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  position_opened: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100",
  position_closed: "border-white/10 bg-white/5 text-slate-300",
  position_marked_to_market: "border-white/10 bg-white/5 text-slate-300",
};

function closeEventDetail(payload: Record<string, unknown>): string | null {
  if (typeof payload.realizedPnlUsd !== "number" || typeof payload.closePriceUsd !== "number") return null;
  const reason = typeof payload.closeReason === "string" ? payload.closeReason : "unknown";
  return `close price $${payload.closePriceUsd.toFixed(2)} · realized P&L $${payload.realizedPnlUsd.toFixed(2)} · reason: ${reason}`;
}

function markEventDetail(payload: Record<string, unknown>): string | null {
  if (typeof payload.currentPriceUsd !== "number" || typeof payload.unrealizedPnlUsd !== "number") return null;
  return `current price $${payload.currentPriceUsd.toFixed(2)} · unrealized P&L $${payload.unrealizedPnlUsd.toFixed(2)}`;
}

export default async function AuditLedgerPage() {
  const user = await requireAuthUser();
  const events = await listAuditLedger(user.companyId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Audit Ledger</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every trade intent, risk-policy decision, and paper position event is recorded here. Mark-to-market events are only logged when
          explicitly triggered by a user, not on every routine refresh.
        </p>
      </div>
      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-slate-500">No audit events yet.</p>}
        {events.map((event) => {
          const detail = event.event_type === "position_closed" ? closeEventDetail(event.payload) : event.event_type === "position_marked_to_market" ? markEventDetail(event.payload) : null;
          return (
            <div key={event.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-3 py-1 text-xs ${EVENT_STYLE[event.event_type] ?? "border-white/10 bg-white/5 text-slate-300"}`}>
                  {event.event_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500">{new Date(event.occurred_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                actor: {event.actor} · {event.subject_type} {event.subject_id.slice(0, 8)}
              </p>
              {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
