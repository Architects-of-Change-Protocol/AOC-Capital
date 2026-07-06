import { requireAuthUser } from "@/lib/auth";
import { listTradeDecisions, listTradeIntents } from "@/lib/trading/trade-service";
import { CreateTradeIntentForm } from "./create-trade-intent-form";
import { SubmitDraftForReviewButton } from "./submit-draft-for-review-button";
import { CancelDraftButton } from "./cancel-draft-button";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100",
  pending: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200",
  approved: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  rejected: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
  closed: "border-white/10 bg-white/5 text-slate-300",
  cancelled: "border-white/10 bg-white/5 text-slate-400",
};

export default async function TradeIntentsPage() {
  const user = await requireAuthUser();
  const [intents, decisions] = await Promise.all([listTradeIntents(user.companyId), listTradeDecisions(user.companyId)]);
  const decisionByIntent = new Map(decisions.map((d) => [d.trade_intent_id, d]));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      <CreateTradeIntentForm />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Trade Intents</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {["Paper-only", "Governed paper action", "Real execution locked", "No broker connected"].map((badge) => (
              <span key={badge} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
                {badge}
              </span>
            ))}
          </div>
        </div>
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
                {intent.status === "draft" ? (
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Draft from a signal recommendation. Not yet submitted for Risk Constitution review — no paper position exists for this draft.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        This withdraws the draft before Risk Constitution review. It will not run risk review, open a paper position, place an order,
                        connect to a broker, or enable real execution.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <SubmitDraftForReviewButton intentId={intent.id} />
                      <CancelDraftButton intentId={intent.id} />
                    </div>
                  </div>
                ) : null}
                {intent.status === "cancelled" ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-400">This draft was cancelled before Risk Constitution review. No paper position was opened.</p>
                    <p className="text-xs text-slate-500">
                      Cancelled drafts are historical records only. They do not open paper positions or enable real execution.
                    </p>
                  </div>
                ) : null}
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
