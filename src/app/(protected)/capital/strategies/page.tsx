import { requireAuthUser } from "@/lib/auth";
import { getStrategyLibrary, type StrategyLibraryItem, type StrategyRiskProfile, type StrategyStatus } from "@/lib/capital/strategy-library";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "@/lib/capital/strategy-selection-service";
import {
  CAPABILITY_GUARDRAILS,
  CAPABILITY_GUARDRAILS_INTRO,
  HEADER_EXPLAINER,
  MARKET_DATA_DISCLOSURE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  REAL_EXECUTION_LOCKED_DISCLOSURE,
  RISK_CONSTITUTION_ALIGNMENT_NOTE,
  SELECTION_BEHAVIOR_DISCLOSURE,
} from "@/lib/capital/strategy-library-content";
import { StrategySelectButton } from "./strategy-select-button";
import { StrategyDetailsToggle } from "./strategy-details-toggle";

const RISK_PROFILE_COPY: Record<StrategyRiskProfile, { label: string; className: string }> = {
  defensive: { label: "Defensive", className: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100" },
  conservative: { label: "Conservative", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  balanced: { label: "Balanced", className: "border-sky-300/30 bg-sky-300/[0.08] text-sky-200" },
  growth: { label: "Growth", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  research: { label: "Research", className: "border-fuchsia-300/30 bg-fuchsia-300/[0.08] text-fuchsia-200" },
};

const STATUS_COPY: Record<StrategyStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  research_only: { label: "Research Only", className: "border-fuchsia-300/30 bg-fuchsia-300/[0.08] text-fuchsia-200" },
  locked: { label: "Locked · Future", className: "border-white/10 bg-white/5 text-slate-400" },
};

function humanize(slug: string): string {
  return slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function StrategyCard({ strategy, isSelected }: { strategy: StrategyLibraryItem; isSelected: boolean }) {
  const riskCopy = RISK_PROFILE_COPY[strategy.riskProfile];
  const statusCopy = STATUS_COPY[strategy.status];

  return (
    <div
      className={`rounded-2xl border p-5 ${isSelected ? "border-emerald-300/30 bg-emerald-300/[0.05]" : "border-white/10 bg-white/5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
          <p className="mt-1 text-sm text-slate-300">{strategy.objective}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${riskCopy.className}`}>{riskCopy.label}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusCopy.className}`}>{statusCopy.label}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Supported symbols</span>
          <p className="mt-1 text-white">{strategy.supportedSymbols.join(", ")}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Suggested capital level</span>
          <p className="mt-1 text-white">{strategy.suggestedCapitalLevel}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Time horizon</span>
          <p className="mt-1 text-white">{strategy.timeHorizon}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Best for</span>
          <p className="mt-1 text-white">{strategy.bestFor.join(", ")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Paper-only</span>
        <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Real execution locked</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StrategySelectButton strategyKey={strategy.key} isSelected={isSelected} />
        <StrategyDetailsToggle>
          <p className="text-sm leading-relaxed text-slate-300">{strategy.description}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-300/10 bg-black/10 px-4 py-3 text-sm">
              <span className="text-xs uppercase tracking-[0.15em] text-emerald-300">Allowed</span>
              <ul className="mt-2 space-y-1 text-slate-300">
                {strategy.allowedCapabilities.map((capability) => (
                  <li key={capability}>✓ {humanize(capability)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-300/10 bg-black/10 px-4 py-3 text-sm">
              <span className="text-xs uppercase tracking-[0.15em] text-rose-300">Blocked</span>
              <ul className="mt-2 space-y-1 text-slate-300">
                {strategy.blockedCapabilities.map((capability) => (
                  <li key={capability}>✕ {humanize(capability)}</li>
                ))}
              </ul>
            </div>
          </div>
        </StrategyDetailsToggle>
      </div>
    </div>
  );
}

export default async function StrategyLibraryPage() {
  const user = await requireAuthUser();
  const [strategies, profile] = await Promise.all([
    Promise.resolve(getStrategyLibrary()),
    getSelectedStrategyProfile(user.companyId),
  ]);
  const selectedStrategy = resolveSelectedStrategy(profile);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* 1. Header / explainer */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{PAGE_TITLE}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{PAGE_SUBTITLE}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{HEADER_EXPLAINER}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{SELECTION_BEHAVIOR_DISCLOSURE}</p>
      </div>

      {/* 2. Current selected strategy */}
      <div className={`rounded-2xl border p-5 ${selectedStrategy ? "border-emerald-300/30 bg-emerald-300/[0.06]" : "border-white/10 bg-white/5"}`}>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Strategy</p>
        {selectedStrategy ? (
          <>
            <h3 className="mt-1 text-xl font-semibold text-white">{selectedStrategy.name}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              This strategy is active for paper simulation only. Every paper trade intent remains governed by the Risk Constitution and
              must pass the risk policy engine before becoming a paper position.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No strategy selected yet. Choose one below to give AOC Capital paper-trading context.</p>
        )}
      </div>

      {/* 3. Strategy cards */}
      <div className="space-y-4">
        {strategies.map((strategy) => (
          <StrategyCard key={strategy.key} strategy={strategy} isSelected={profile?.strategy_key === strategy.key} />
        ))}
      </div>

      {/* 4. Strategy comparison */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Strategy Comparison</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                <th className="py-2 pr-4">Strategy</th>
                <th className="py-2 pr-4">Risk profile</th>
                <th className="py-2 pr-4">Supported symbols</th>
                <th className="py-2 pr-4">Suggested capital level</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.key} className="border-t border-white/5">
                  <td className="py-2 pr-4 text-white">{strategy.name}</td>
                  <td className="py-2 pr-4 text-slate-300">{RISK_PROFILE_COPY[strategy.riskProfile].label}</td>
                  <td className="py-2 pr-4 text-slate-300">{strategy.supportedSymbols.join(", ")}</td>
                  <td className="py-2 pr-4 text-slate-300">{strategy.suggestedCapitalLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">{RISK_CONSTITUTION_ALIGNMENT_NOTE}</p>
      </div>

      {/* 5. Capability guardrails */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Capability Guardrails</p>
        <p className="mt-2 text-sm text-slate-300">{CAPABILITY_GUARDRAILS_INTRO}</p>
        <p className="mt-1 text-sm text-slate-400">Every strategy in this library:</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {CAPABILITY_GUARDRAILS.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{MARKET_DATA_DISCLOSURE}</p>
      </div>

      {/* 6. Real execution locked disclosure */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">{REAL_EXECUTION_LOCKED_DISCLOSURE}</div>
    </div>
  );
}
