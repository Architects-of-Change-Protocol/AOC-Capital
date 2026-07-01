import { requireAuthUser } from "@/lib/auth";
import { ensureRiskConstitution } from "@/lib/trading/trade-service";

export default async function RiskConstitutionPage() {
  const user = await requireAuthUser();
  const rules = await ensureRiskConstitution(user.companyId);

  return (
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
  );
}
