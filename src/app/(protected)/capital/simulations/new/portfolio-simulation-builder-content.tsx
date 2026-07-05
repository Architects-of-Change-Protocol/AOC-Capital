"use client";

import { useEffect, useMemo, useState } from "react";
import type { InvestorConstitution, TimeHorizon } from "@/features/capital/domain/investor-constitution-schema";
import { getStrategyById, type AssetClass, type StrategyDefinition } from "@/features/capital/domain/strategy-registry";
import {
  buildDefaultAllocationForStrategy,
  buildPortfolioSimulationDraft,
  formatAssetClassLabel,
  getSimulationBuilderEligibility,
  summarizeAllocationRange,
  validateDraftSimulationAllocation,
  validateSimulationAssumptions,
  type DraftSimulationAllocation,
  type PortfolioSimulationDraft,
  type RebalanceFrequency,
  type SimulationAssumptions,
  type SimulationBuilderEligibility,
} from "@/features/capital/domain/portfolio-simulation-builder";
import type { StrategyEligibilityCard } from "@/features/capital/domain/strategy-eligibility-summary";
import { loadInvestorConstitutionForResult } from "@/lib/capital/investor-constitution-handoff";
import {
  ALLOCATION_GENERATED_NOTE,
  ALLOCATION_TOTAL_LABEL,
  ALLOCATION_TOTAL_REQUIREMENT_NOTE,
  ASSUMPTIONS_LABELS,
  CTA_CREATE_SIMULATION_RECORD,
  CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON,
  CTA_VALIDATE,
  DEFAULT_INITIAL_AMOUNT,
  DEFAULT_MONTHLY_CONTRIBUTION,
  DEFAULT_REBALANCE_FREQUENCY,
  DEFAULT_TIME_HORIZON_YEARS,
  NO_CONSTITUTION_COPY,
  NO_CONSTITUTION_CTA,
  NO_CONSTITUTION_HEADING,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  REBALANCE_FREQUENCY_LABELS,
  SAFETY_FOOTER_LINES,
  SECTION_TITLE_ALLOCATION,
  SECTION_TITLE_ASSUMPTIONS,
  SECTION_TITLE_CONSTITUTION_SUMMARY,
  SECTION_TITLE_STRATEGY_SELECTION,
  SECTION_TITLE_VALIDATION,
  STATUS_BADGE_NO_REAL_ORDER,
  STATUS_BADGE_PAPER_ONLY,
  STATUS_BADGE_REAL_EXECUTION_LOCKED,
  STRATEGY_GROUP_TITLES,
  VALIDATION_INVALID_HEADING,
  VALIDATION_VALID_COPY,
  VALIDATION_VALID_HEADING,
} from "@/lib/capital/portfolio-simulation-builder-content";

const TIME_HORIZON_YEARS_FALLBACK: Record<TimeHorizon, number> = {
  less_than_1y: 1,
  "1_3y": 2,
  "3_5y": 4,
  "5_10y": 7,
  "10y_plus": 10,
};

function defaultAssumptionsFor(constitution: InvestorConstitution): SimulationAssumptions {
  return {
    initialAmount: DEFAULT_INITIAL_AMOUNT,
    monthlyContribution: DEFAULT_MONTHLY_CONTRIBUTION,
    timeHorizonYears: TIME_HORIZON_YEARS_FALLBACK[constitution.timeHorizon] ?? DEFAULT_TIME_HORIZON_YEARS,
    rebalanceFrequency: DEFAULT_REBALANCE_FREQUENCY,
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">
      {children}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function UnavailableStrategyCard({ card, reason }: { card: StrategyEligibilityCard; reason: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-base font-semibold text-white">{card.name}</h4>
        <span className="text-xs text-slate-400">v{card.version}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{card.status.replace(/_/g, " ")}</p>
      <p className="mt-2 text-sm font-medium text-amber-200">{reason}</p>
      {card.suitability.flags.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          {card.suitability.flags.map((flag, index) => (
            <li key={`${card.strategyId}-${flag.code}-${index}`}>
              [{flag.severity}] {flag.message}
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        disabled
        className="mt-3 cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-500 opacity-60"
      >
        Not selectable
      </button>
    </div>
  );
}

function UnavailableGroup({ title, cards, reason }: { title: string; cards: StrategyEligibilityCard[]; reason: string }) {
  if (cards.length === 0) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <UnavailableStrategyCard key={card.strategyId} card={card} reason={reason} />
        ))}
      </div>
    </div>
  );
}

type LoadState = { hydrated: boolean; constitution: InvestorConstitution | null; assumptions: SimulationAssumptions | null };

export function PortfolioSimulationBuilderContent() {
  const [{ hydrated, constitution, assumptions }, setLoadState] = useState<LoadState>({
    hydrated: false,
    constitution: null,
    assumptions: null,
  });
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<DraftSimulationAllocation[]>([]);
  const [draft, setDraft] = useState<PortfolioSimulationDraft | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const stored = await Promise.resolve().then(() => loadInvestorConstitutionForResult());
      if (active) {
        setLoadState({
          hydrated: true,
          constitution: stored,
          assumptions: stored ? defaultAssumptionsFor(stored) : null,
        });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const eligibility: SimulationBuilderEligibility | null = useMemo(
    () => (constitution ? getSimulationBuilderEligibility(constitution) : null),
    [constitution]
  );

  const selectedCard = eligibility?.selectable.find((card) => card.strategyId === selectedStrategyId) ?? null;
  const selectedStrategy: StrategyDefinition | undefined = selectedCard ? getStrategyById(selectedCard.strategyId) : undefined;

  function selectStrategy(strategyId: string) {
    if (!constitution) return;
    const strategy = getStrategyById(strategyId);
    if (!strategy) return;
    setSelectedStrategyId(strategyId);
    setAllocation(buildDefaultAllocationForStrategy(strategy, constitution));
    setDraft(null);
  }

  function updateAllocationPercentage(assetClass: AssetClass, rawValue: string) {
    const parsed = Number(rawValue);
    const percentage = Number.isFinite(parsed) ? parsed : 0;
    setAllocation((prev) => prev.map((entry) => (entry.assetClass === assetClass ? { ...entry, percentage } : entry)));
    setDraft(null);
  }

  function updateAssumption<K extends keyof SimulationAssumptions>(field: K, value: SimulationAssumptions[K]) {
    setLoadState((prev) => (prev.assumptions ? { ...prev, assumptions: { ...prev.assumptions, [field]: value } } : prev));
    setDraft(null);
  }

  const liveAllocationValidation = useMemo(() => {
    if (!constitution || !selectedStrategy) return null;
    return validateDraftSimulationAllocation({ constitution, strategy: selectedStrategy, allocation });
  }, [constitution, selectedStrategy, allocation]);

  const assumptionIssues = useMemo(() => (assumptions ? validateSimulationAssumptions(assumptions) : []), [assumptions]);

  function handleValidate() {
    if (!constitution || !selectedStrategy || !assumptions) return;
    const nextDraft = buildPortfolioSimulationDraft({ constitution, strategy: selectedStrategy, assumptions, allocation });
    setDraft(nextDraft);
  }

  if (hydrated && !constitution) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">{NO_CONSTITUTION_HEADING}</h3>
          <p className="mt-2">{NO_CONSTITUTION_COPY}</p>
          <a
            href="/capital/constitution/new"
            className="mt-4 inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16]"
          >
            {NO_CONSTITUTION_CTA}
          </a>
        </div>
      </div>
    );
  }

  if (!constitution || !eligibility || !assumptions) {
    return <Header />;
  }

  const totalAllocationPct = liveAllocationValidation?.totalAllocationPct ?? 0;

  return (
    <div className="space-y-6">
      <Header />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-base font-semibold text-white">{SECTION_TITLE_CONSTITUTION_SUMMARY}</h3>
        <SummaryRow label="Objective" value={constitution.investorObjective.replace(/_/g, " ")} />
        <SummaryRow label="Time horizon" value={constitution.timeHorizon.replace(/_/g, " ")} />
        <SummaryRow label="Liquidity requirement" value={constitution.liquidityRequirement} />
        <SummaryRow label="Risk tolerance" value={constitution.riskTolerance} />
        <SummaryRow label="Risk capacity" value={constitution.riskCapacity} />
        <SummaryRow label="Complexity allowed" value={constitution.complexityAllowed} />
        <SummaryRow label="Max crypto exposure" value={`${constitution.maxCryptoExposurePct}%`} />
        <SummaryRow label="Paper-only" value="Yes" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-base font-semibold text-white">{SECTION_TITLE_STRATEGY_SELECTION}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {eligibility.selectable.map((card) => (
            <div
              key={card.strategyId}
              className={`rounded-2xl border p-4 ${
                selectedStrategyId === card.strategyId ? "border-cyan-200/40 bg-cyan-300/[0.08]" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-base font-semibold text-white">{card.name}</h4>
                <span className="text-xs text-slate-400">v{card.version}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{card.explanationTemplate}</p>
              {card.riskFlags.length > 0 ? (
                <p className="mt-2 text-xs text-slate-400">Risk flags: {card.riskFlags.join(", ")}</p>
              ) : null}
              {card.suitability.flags.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {card.suitability.flags.map((flag, index) => (
                    <li key={`${card.strategyId}-${flag.code}-${index}`}>
                      [{flag.severity}] {flag.message}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">Allocation range: {card.allocationRangeSummary}</p>
              <p className="mt-3 text-xs text-slate-500">Hypothetical paper-trading simulation only. {card.disclaimer}</p>
              <button
                type="button"
                onClick={() => selectStrategy(card.strategyId)}
                className="mt-3 rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.16]"
              >
                {selectedStrategyId === card.strategyId ? "Selected" : "Select this strategy"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          <UnavailableGroup
            title={STRATEGY_GROUP_TITLES.requiresAdvisorReview}
            cards={eligibility.requiresAdvisorReview}
            reason="Requires advisor review before it can be simulated."
          />
          <UnavailableGroup
            title={STRATEGY_GROUP_TITLES.blockedByConstitution}
            cards={eligibility.blockedByConstitution}
            reason="Blocked by your Investor Constitution."
          />
          <UnavailableGroup
            title={STRATEGY_GROUP_TITLES.lockedAdvanced}
            cards={eligibility.lockedAdvanced}
            reason="Advanced / locked — not available for simulation yet."
          />
          <UnavailableGroup
            title={STRATEGY_GROUP_TITLES.deprecatedOrBlocked}
            cards={eligibility.deprecatedOrBlocked}
            reason="Deprecated / blocked — not available for simulation."
          />
        </div>
      </div>

      {selectedStrategy ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-base font-semibold text-white">{SECTION_TITLE_ASSUMPTIONS}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                {ASSUMPTIONS_LABELS.initialAmount}
                <input
                  type="number"
                  min={0}
                  value={assumptions.initialAmount}
                  onChange={(e) => updateAssumption("initialAmount", Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                {ASSUMPTIONS_LABELS.monthlyContribution}
                <input
                  type="number"
                  min={0}
                  value={assumptions.monthlyContribution}
                  onChange={(e) => updateAssumption("monthlyContribution", Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                {ASSUMPTIONS_LABELS.timeHorizonYears}
                <input
                  type="number"
                  min={1}
                  value={assumptions.timeHorizonYears}
                  onChange={(e) => updateAssumption("timeHorizonYears", Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                {ASSUMPTIONS_LABELS.rebalanceFrequency}
                <select
                  value={assumptions.rebalanceFrequency}
                  onChange={(e) => updateAssumption("rebalanceFrequency", e.target.value as RebalanceFrequency)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
                >
                  {Object.entries(REBALANCE_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {assumptionIssues.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-rose-300">
                {assumptionIssues.map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-2 text-base font-semibold text-white">{SECTION_TITLE_ALLOCATION}</h3>
            <p className="mb-4 text-xs text-slate-500">{ALLOCATION_GENERATED_NOTE}</p>
            <p className="mb-4 text-xs text-slate-500">Allocation range: {summarizeAllocationRange(selectedStrategy)}</p>

            <div className="space-y-3">
              {allocation.map((entry) => {
                const range = selectedStrategy.allocationRanges[entry.assetClass];
                const rowIssues = liveAllocationValidation?.issues.filter((issue) => issue.assetClass === entry.assetClass) ?? [];
                return (
                  <div key={entry.assetClass} className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-300">{formatAssetClassLabel(entry.assetClass)}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={range?.min ?? 0}
                          max={range?.max ?? 100}
                          value={entry.percentage}
                          onChange={(e) => updateAllocationPercentage(entry.assetClass, e.target.value)}
                          className="w-24 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-right text-white"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                    {range ? (
                      <span className="text-xs text-slate-500">
                        Allowed range: {range.min}-{range.max}%
                      </span>
                    ) : null}
                    {rowIssues.map((issue) => (
                      <span key={issue.code} className="text-xs text-amber-300">
                        {issue.message}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-300">
                {ALLOCATION_TOTAL_LABEL}: {totalAllocationPct}%
              </span>
              <span className="text-xs text-slate-500">{ALLOCATION_TOTAL_REQUIREMENT_NOTE}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleValidate}
                className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/[0.16]"
              >
                {CTA_VALIDATE}
              </button>
              <button
                type="button"
                disabled
                title={CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON}
                className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-500 opacity-60"
              >
                {CTA_CREATE_SIMULATION_RECORD}
              </button>
              <span className="text-xs text-slate-500">{CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON}</span>
            </div>

            {draft ? (
              <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-base font-semibold text-white">{SECTION_TITLE_VALIDATION}</h3>
                {draft.validation.valid ? (
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/[0.08] p-3 text-sm text-emerald-100">
                    <p className="font-semibold">{VALIDATION_VALID_HEADING}</p>
                    <p className="mt-1 text-xs text-emerald-200/80">{VALIDATION_VALID_COPY}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-300/30 bg-rose-300/[0.08] p-3 text-sm text-rose-100">
                    <p className="font-semibold">{VALIDATION_INVALID_HEADING}</p>
                    <ul className="mt-2 space-y-1 text-xs text-rose-200/80">
                      {draft.validation.issues
                        .filter((issue) => issue.severity !== "info")
                        .map((issue, index) => (
                          <li key={`${issue.code}-${index}`}>
                            [{issue.severity}] {issue.message}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {draft.suitabilityFlags.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-400">
                    {draft.suitabilityFlags.map((flag, index) => (
                      <li key={`${flag.code}-${index}`}>
                        [{flag.severity}] {flag.message}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <p className="text-xs text-slate-500">
                  Strategy: {selectedCard?.name} (v{selectedCard?.version})
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-slate-500">
              {SAFETY_FOOTER_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AOC Capital — Strategy Playbook</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{PAGE_TITLE}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">{PAGE_SUBTITLE}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{STATUS_BADGE_PAPER_ONLY}</Badge>
        <Badge>{STATUS_BADGE_NO_REAL_ORDER}</Badge>
        <Badge>{STATUS_BADGE_REAL_EXECUTION_LOCKED}</Badge>
      </div>
    </div>
  );
}
