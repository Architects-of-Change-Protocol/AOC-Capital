"use client";

import { useEffect, useMemo, useState } from "react";
import type { InvestorConstitution } from "@/features/capital/domain/investor-constitution-schema";
import {
  buildInvestorConstitutionReading,
  type InvestorConstitutionReadingInsight,
} from "@/features/capital/domain/investor-constitution-reading";
import {
  buildStrategyEligibilitySummary,
  type StrategyEligibilityCard,
} from "@/features/capital/domain/strategy-eligibility-summary";
import {
  clearInvestorConstitutionForResult,
  loadInvestorConstitutionForResult,
} from "@/lib/capital/investor-constitution-handoff";
import {
  COMPLEXITY_ALLOWED_LABELS,
  CURRENCY_LABELS,
  EMERGENCY_RESERVE_LABELS,
  FINANCIAL_KNOWLEDGE_LABELS,
  LIQUIDITY_REQUIREMENT_LABELS,
  OBJECTIVE_LABELS,
  PROHIBITED_INSTRUMENT_LABELS,
  RESULT_TITLE,
  REVIEW_FREQUENCY_LABELS,
  RISK_LEVEL_LABELS,
  TIME_HORIZON_LABELS,
} from "@/lib/capital/investor-constitution-intake-content";
import {
  ACTION_EDIT_ANSWERS,
  ACTION_START_OVER,
  CTA_CONTINUE_TO_SIMULATION,
  CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON,
  ELIGIBILITY_SECTION_TITLES,
  EMPTY_STATE_NO_STRATEGIES,
  EMPTY_STATE_ONLY_CASH,
  NO_CONSTITUTION_FOUND_MESSAGE,
  PAGE_SUBTITLE,
  PAPER_ONLY_DISCLAIMER_NOTE,
  SECTION_TITLE_ELIGIBILITY,
  SECTION_TITLE_READING,
  SECTION_TITLE_SUMMARY,
  STATUS_BADGE_HUMAN_REVIEW_NOT_REQUIRED,
  STATUS_BADGE_HUMAN_REVIEW_REQUIRED,
  STATUS_BADGE_PAPER_ONLY,
  STATUS_BADGE_REAL_EXECUTION_LOCKED,
} from "@/lib/capital/investor-constitution-result-content";

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

function ReadingList({ insights }: { insights: InvestorConstitutionReadingInsight[] }) {
  return (
    <ul className="space-y-2 text-sm text-slate-300">
      {insights.map((insight) => (
        <li key={insight.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
          {insight.message}
        </li>
      ))}
    </ul>
  );
}

function eligibilityStatusLabel(card: StrategyEligibilityCard): string {
  if (card.status === "deprecated" || card.status === "blocked") return "blocked by your Investor Constitution";
  if (card.status === "locked_advanced") return "advanced strategy locked";
  if (!card.allowed) return "blocked by your Investor Constitution";
  if (card.status === "advisor_review_only") return "requires advisor review";
  return "available for paper simulation";
}

function StrategyCard({ card }: { card: StrategyEligibilityCard }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-base font-semibold text-white">{card.name}</h4>
        <span className="text-xs text-slate-400">v{card.version}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{card.status.replace(/_/g, " ")}</p>
      <p className="mt-2 text-sm text-slate-300">{card.explanationTemplate}</p>
      <p className="mt-2 text-sm font-medium text-cyan-100">{eligibilityStatusLabel(card)}</p>

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
      <p className="mt-3 text-xs text-slate-500">
        Hypothetical paper-trading simulation only. {card.disclaimer}
      </p>
    </div>
  );
}

function EligibilityGroup({ title, cards }: { title: string; cards: StrategyEligibilityCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <StrategyCard key={card.strategyId} card={card} />
        ))}
      </div>
    </div>
  );
}

type LoadState = { hydrated: boolean; constitution: InvestorConstitution | null };

export function ConstitutionResultContent() {
  const [{ hydrated, constitution }, setLoadState] = useState<LoadState>({ hydrated: false, constitution: null });

  useEffect(() => {
    let active = true;
    async function load() {
      const stored = await Promise.resolve().then(() => loadInvestorConstitutionForResult());
      if (active) setLoadState({ hydrated: true, constitution: stored });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const reading = useMemo(
    () => (constitution ? buildInvestorConstitutionReading(constitution) : []),
    [constitution]
  );
  const eligibility = useMemo(
    () => (constitution ? buildStrategyEligibilitySummary(constitution) : null),
    [constitution]
  );

  if (hydrated && !constitution) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        <p>{NO_CONSTITUTION_FOUND_MESSAGE}</p>
        <a
          href="/capital/constitution/new"
          className="mt-4 inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16]"
        >
          Build your Investor Constitution
        </a>
      </div>
    );
  }

  if (!constitution || !eligibility) {
    return null;
  }

  const onlyCashAvailable =
    eligibility.availableForSimulation.length === 1 &&
    eligibility.availableForSimulation[0].strategyId === "cash_reserve";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AOC Capital — Investor Constitution</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{RESULT_TITLE}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{PAGE_SUBTITLE}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{STATUS_BADGE_PAPER_ONLY}</Badge>
          <Badge>{constitution.requiresHumanReview ? STATUS_BADGE_HUMAN_REVIEW_REQUIRED : STATUS_BADGE_HUMAN_REVIEW_NOT_REQUIRED}</Badge>
          <Badge>{STATUS_BADGE_REAL_EXECUTION_LOCKED}</Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-base font-semibold text-white">{SECTION_TITLE_SUMMARY}</h3>
        <SummaryRow label="Objective" value={OBJECTIVE_LABELS[constitution.investorObjective]} />
        <SummaryRow label="Time horizon" value={TIME_HORIZON_LABELS[constitution.timeHorizon]} />
        <SummaryRow label="Liquidity requirement" value={LIQUIDITY_REQUIREMENT_LABELS[constitution.liquidityRequirement]} />
        <SummaryRow label="Emergency reserve" value={EMERGENCY_RESERVE_LABELS[constitution.emergencyReserveMonths]} />
        <SummaryRow label="Risk tolerance" value={RISK_LEVEL_LABELS[constitution.riskTolerance]} />
        <SummaryRow label="Risk capacity" value={RISK_LEVEL_LABELS[constitution.riskCapacity]} />
        <SummaryRow label="Knowledge level" value={FINANCIAL_KNOWLEDGE_LABELS[constitution.financialKnowledge]} />
        <SummaryRow label="Complexity allowed" value={COMPLEXITY_ALLOWED_LABELS[constitution.complexityAllowed]} />
        <SummaryRow label="Base currency" value={CURRENCY_LABELS[constitution.baseCurrency]} />
        <SummaryRow label="Spending currency" value={CURRENCY_LABELS[constitution.spendingCurrency]} />
        <SummaryRow label="Max single asset exposure" value={`${constitution.maxSingleAssetExposurePct}%`} />
        <SummaryRow label="Max sector exposure" value={`${constitution.maxSectorExposurePct}%`} />
        <SummaryRow label="Max crypto exposure" value={`${constitution.maxCryptoExposurePct}%`} />
        <SummaryRow
          label="Prohibited instruments"
          value={
            constitution.prohibitedInstruments.length > 0
              ? constitution.prohibitedInstruments.map((instrument) => PROHIBITED_INSTRUMENT_LABELS[instrument]).join(", ")
              : "None"
          }
        />
        <SummaryRow label="Preferred review frequency" value={REVIEW_FREQUENCY_LABELS[constitution.preferredReviewFrequency]} />
        <SummaryRow label="Paper-only" value="Yes" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-base font-semibold text-white">{SECTION_TITLE_READING}</h3>
        <ReadingList insights={reading} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-base font-semibold text-white">{SECTION_TITLE_ELIGIBILITY}</h3>

        {eligibility.availableForSimulation.length === 0 ? (
          <p className="mb-4 rounded-xl border border-amber-200/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">
            {EMPTY_STATE_NO_STRATEGIES}
          </p>
        ) : onlyCashAvailable ? (
          <p className="mb-4 rounded-xl border border-amber-200/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">
            {EMPTY_STATE_ONLY_CASH}
          </p>
        ) : null}

        <div className="space-y-6">
          <EligibilityGroup title={ELIGIBILITY_SECTION_TITLES.availableForSimulation} cards={eligibility.availableForSimulation} />
          <EligibilityGroup title={ELIGIBILITY_SECTION_TITLES.blockedByConstitution} cards={eligibility.blockedByConstitution} />
          <EligibilityGroup title={ELIGIBILITY_SECTION_TITLES.requiresAdvisorReview} cards={eligibility.requiresAdvisorReview} />
          <EligibilityGroup title={ELIGIBILITY_SECTION_TITLES.lockedAdvanced} cards={eligibility.lockedAdvanced} />
          <EligibilityGroup title={ELIGIBILITY_SECTION_TITLES.deprecatedOrBlocked} cards={eligibility.deprecatedOrBlocked} />
        </div>

        <p className="mt-4 text-xs text-slate-500">{PAPER_ONLY_DISCLAIMER_NOTE}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/capital/constitution/new"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100"
        >
          {ACTION_EDIT_ANSWERS}
        </a>
        <button
          type="button"
          onClick={() => {
            clearInvestorConstitutionForResult();
            window.location.href = "/capital/constitution/new";
          }}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100"
        >
          {ACTION_START_OVER}
        </button>
        <button
          type="button"
          disabled
          title={CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON}
          className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-500 opacity-60"
        >
          {CTA_CONTINUE_TO_SIMULATION}
        </button>
        <span className="text-xs text-slate-500">{CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON}</span>
      </div>
    </div>
  );
}
