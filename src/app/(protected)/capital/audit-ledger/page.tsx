import { requireAuthUser } from "@/lib/auth";
import { listAuditLedger } from "@/lib/trading/trade-service";

const EVENT_STYLE: Record<string, string> = {
  trade_intent_created: "border-white/10 bg-white/5 text-slate-300",
  trade_decision_approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  trade_decision_rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  position_opened: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100",
  position_closed: "border-white/10 bg-white/5 text-slate-300",
};

export default async function AuditLedgerPage() {
  const user = await requireAuthUser();
  const events = await listAuditLedger(user.companyId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Audit Ledger</h2>
        <p className="mt-1 text-sm text-slate-400">Every trade intent, risk-policy decision, and paper position event is recorded here.</p>
      </div>
      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-slate-500">No audit events yet.</p>}
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className={`rounded-full border px-3 py-1 text-xs ${EVENT_STYLE[event.event_type] ?? "border-white/10 bg-white/5 text-slate-300"}`}>
                {event.event_type.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-slate-500">{new Date(event.occurred_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">actor: {event.actor} · {event.subject_type} {event.subject_id.slice(0, 8)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
