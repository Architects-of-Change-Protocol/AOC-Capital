import { requireAuthUser } from "@/lib/auth";
import { ensureRiskConstitution, getPortfolioSummary } from "@/lib/trading/trade-service";

type LossLimitStatus = "OK" | "Nearing Limit" | "Breached";

function lossLimitStatus(usedUsd: number, limitUsd: number): LossLimitStatus {
  if (!(limitUsd > 0)) return "OK";
  const ratio = usedUsd / limitUsd;
  if (ratio >= 1) return "Breached";
  if (ratio >= 0.5) return "Nearing Limit";
  return "OK";
}

const STATUS_STYLE: Record<LossLimitStatus, string> = {
  OK: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  "Nearing Limit": "border-amber-300/30 bg-amber-300/[0.08] text-amber-200",
  Breached: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
};

function LossLimitCard({ label, limitUsd, usedUsd, remainingUsd, window }: { label: string; limitUsd: number; usedUsd: number; remainingUsd: number; window: string }) {
  const status = lossLimitStatus(usedUsd, limitUsd);
  return (
    <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{label}</span>
        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[status]}`}>{status}</span>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Limit: ${limitUsd.toFixed(2)} · Current realized loss ({window}): ${usedUsd.toFixed(2)} · Remaining: ${remainingUsd.toFixed(2)}
      </p>
    </div>
  );
}

export default async function RiskConstitutionPage() {
  const user = await requireAuthUser();
  const [rules, summary] = await Promise.all([ensureRiskConstitution(user.companyId), getPortfolioSummary(user.companyId)]);

  const dailyUsedUsd = Math.max(0, -summary.dailyRealizedPnlUsd);
  const weeklyUsedUsd = Math.max(0, -summary.weeklyRealizedPnlUsd);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Loss Limit Status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Daily and weekly windows are rolling (trailing 24h / trailing 7d, not UTC calendar windows) and only count realized P&L from
            closed paper positions — unrealized P&L on open positions never counts against these limits.
          </p>
        </div>
        <div className="space-y-2">
          <LossLimitCard label="Daily simulated loss" limitUsd={summary.maxDailyLossUsd} usedUsd={dailyUsedUsd} remainingUsd={summary.dailyLossRemainingUsd} window="trailing 24h" />
          <LossLimitCard label="Weekly simulated loss" limitUsd={summary.maxWeeklyLossUsd} usedUsd={weeklyUsedUsd} remainingUsd={summary.weeklyLossRemainingUsd} window="trailing 7d" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Risk Constitution — Level 1</h2>
          <p className="mt-1 text-sm text-slate-400">
            These rules are enforced by the risk policy engine on every trade intent. They are read-only in this MVP.
          </p>
        </div>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{rule.label}</span>
                <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs text-cyan-100">Level {rule.level}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
