import { requireAuthUser } from "@/lib/auth";
import { listTradeDecisions, listTradeIntents } from "@/lib/trading/trade-service";
import { CreateTradeIntentForm } from "./create-trade-intent-form";

const STATUS_STYLE: Record<string, string> = {
  pending: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200",
  approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  closed: "border-white/10 bg-white/5 text-slate-300",
};

export default async function TradeIntentsPage() {
  const user = await requireAuthUser();
  const [intents, decisions] = await Promise.all([listTradeIntents(user.companyId), listTradeDecisions(user.companyId)]);
  const decisionByIntent = new Map(decisions.map((d) => [d.trade_intent_id, d]));

  return (
    <div className="space-y-6">
      <CreateTradeIntentForm />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Trade Intents</h2>
        <div className="space-y-2">
          {intents.length === 0 && <p className="text-sm text-slate-500">No trade intents yet.</p>}
          {intents.map((intent) => {
            const decision = decisionByIntent.get(intent.id);
            return (
              <div key={intent.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{intent.symbol}</span>
                    <span className="text-sm text-slate-400">{intent.side} · {intent.quantity} · ${intent.notional_usd.toFixed(2)}</span>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[intent.status]}`}>{intent.status}</span>
                </div>
                {decision ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {decision.reasons.map((reason) => (
                      <li key={reason.ruleKey} className={reason.passed ? "text-slate-500" : "text-rose-300"}>
                        {reason.passed ? "✓" : "✕"} {reason.label} — {reason.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
