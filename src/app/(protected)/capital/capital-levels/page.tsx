import { requireAuthUser } from "@/lib/auth";
import { ensureCapitalLevels, getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";

const STATUS_STYLE: Record<string, string> = {
  locked: "border-white/10 bg-white/5 text-slate-300",
  active: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  breached: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200",
};

export default async function CapitalLevelsPage() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const levels = await ensureCapitalLevels(user.companyId, portfolio);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Capital Levels</h2>
      <div className="space-y-2">
        {levels.map((level) => (
          <div key={level.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">
            <span className="font-medium text-white">{level.level_name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">${level.threshold_usd.toFixed(2)}</span>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[level.status]}`}>{level.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
