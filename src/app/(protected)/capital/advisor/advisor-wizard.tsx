"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdvisorRecommendation } from "@/lib/advisor/types";

type FormState = {
  startingCapitalUsd: string;
  primaryObjective: string;
  timeHorizon: string;
  riskAppetite: string;
  maxTolerableDrawdownPct: string;
  preferredMarkets: string[];
  autonomyLevel: string;
  tradingMode: string;
  wantsGatedRealExecution: boolean;
};

const DEFAULT_FORM: FormState = {
  startingCapitalUsd: "1000",
  primaryObjective: "balanced_growth",
  timeHorizon: "medium_term",
  riskAppetite: "moderate",
  maxTolerableDrawdownPct: "15",
  preferredMarkets: ["crypto"],
  autonomyLevel: "assisted",
  tradingMode: "recommendations_only",
  wantsGatedRealExecution: false,
};

const OBJECTIVE_OPTIONS = [
  { value: "capital_preservation", label: "Preserve capital" },
  { value: "income", label: "Generate income" },
  { value: "balanced_growth", label: "Balanced growth" },
  { value: "aggressive_growth", label: "Aggressive growth" },
  { value: "speculation", label: "Speculation" },
];

const HORIZON_OPTIONS = [
  { value: "short_term", label: "Short-term (under 1 year)" },
  { value: "medium_term", label: "Medium-term (1-5 years)" },
  { value: "long_term", label: "Long-term (5+ years)" },
];

const APPETITE_OPTIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

const MARKET_OPTIONS = [
  { value: "crypto", label: "Crypto" },
  { value: "equities", label: "Equities" },
  { value: "diversified", label: "Diversified" },
];

const AUTONOMY_OPTIONS = [
  { value: "manual_approval", label: "I approve every trade myself" },
  { value: "assisted", label: "Assist me, but keep me in the loop" },
  { value: "full_auto", label: "Act on my behalf as much as possible" },
];

const MODE_OPTIONS = [
  { value: "recommendations_only", label: "Recommendations only — I'll submit trade intents myself" },
  { value: "paper_trading_automation", label: "Paper-trading automation — simulate acting on my behalf" },
];

const STEP_LABELS = [
  "Starting capital",
  "Primary objective",
  "Time horizon",
  "Risk appetite",
  "Preferred markets",
  "Autonomy level",
  "Recommendations or automation",
  "Future real execution",
];

function fieldClass() {
  return "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white";
}

export function AdvisorWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [recommendation, setRecommendation] = useState<AdvisorRecommendation | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = STEP_LABELS.length;
  const isReviewing = recommendation !== null && !confirmed;

  const toggleMarket = (value: string) => {
    setForm((prev) => ({
      ...prev,
      preferredMarkets: prev.preferredMarkets.includes(value)
        ? prev.preferredMarkets.filter((m) => m !== value)
        : [...prev.preferredMarkets, value],
    }));
  };

  const generateRecommendation = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/advisor/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startingCapitalUsd: Number(form.startingCapitalUsd),
          maxTolerableDrawdownPct: Number(form.maxTolerableDrawdownPct),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { recommendation?: AdvisorRecommendation; error?: string };
      if (!res.ok || !data.recommendation) {
        setError(data.error ?? "Unable to generate a recommendation.");
        return;
      }
      setRecommendation(data.recommendation);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const confirmRecommendation = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/advisor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startingCapitalUsd: Number(form.startingCapitalUsd),
          maxTolerableDrawdownPct: Number(form.maxTolerableDrawdownPct),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to confirm the recommendation.");
        return;
      }
      setConfirmed(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (confirmed && recommendation) {
    return (
      <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.08] p-6">
        <h3 className="text-lg font-semibold text-emerald-100">{recommendation.brief.recommendationMessage}</h3>
        <p className="mt-2 text-sm text-emerald-200/80">
          Your AOC Capital portfolio has been configured with ${recommendation.capitalRecommendation.recommendedBaseCapitalUsd.toFixed(2)}{" "}
          simulated capital and the generated risk constitution. Everything is simulated paper trading — no real exchange
          execution is connected.
        </p>
        <div className="mt-4 flex gap-3">
          <a href="/capital" className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16]">
            Go to Portfolio Overview
          </a>
          <a href="/capital/risk-constitution" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100">
            View Risk Constitution
          </a>
        </div>
      </div>
    );
  }

  if (isReviewing) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-cyan-200/30 bg-cyan-300/[0.06] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Investment Strategy Brief</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{recommendation.brief.headline}</h3>
          <p className="mt-2 text-sm text-slate-300">{recommendation.brief.summary}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Risk Profile</h4>
            <p className="mt-2 text-lg text-white">{recommendation.riskProfile}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Recommended Capital Level</h4>
            <p className="mt-2 text-lg text-white">${recommendation.capitalRecommendation.recommendedBaseCapitalUsd.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">{recommendation.capitalRecommendation.rationale}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Allowed Capabilities</h4>
            <ul className="mt-2 space-y-1 text-sm text-emerald-200">
              {recommendation.capabilities.allowed.map((c) => (
                <li key={c}>{c.replace(/_/g, " ")}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Blocked Capabilities</h4>
            <ul className="mt-2 space-y-1 text-sm text-rose-200">
              {recommendation.capabilities.blocked.map((c) => (
                <li key={c}>{c.replace(/_/g, " ")}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Initial Risk Constitution</h4>
          <div className="mt-3 space-y-2">
            {recommendation.constitution.map((rule) => (
              <div key={rule.rule_key} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
                <span className="font-medium text-white">{rule.label}</span>
                <p className="mt-1 text-sm text-slate-400">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Suggested Paper Trading Mode</h4>
          <p className="mt-2 text-lg text-white">{recommendation.brief.suggestedPaperTradingMode.replace(/_/g, " ")}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={confirmRecommendation}
            className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.1] px-5 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/[0.2] disabled:opacity-50"
          >
            {pending ? "Confirming…" : "Confirm & Activate Level 1 Governed Paper Sandbox"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRecommendation(null)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100"
          >
            Edit answers
          </button>
          {error ? <span className="text-xs text-rose-300">{error}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Question {step + 1} of {totalSteps}
        </p>
        <p className="text-xs text-slate-500">{STEP_LABELS[step]}</p>
      </div>

      {step === 0 && (
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          How much simulated starting capital would you like to work with?
          <input
            type="number"
            min="1"
            step="any"
            value={form.startingCapitalUsd}
            onChange={(e) => setForm((p) => ({ ...p, startingCapitalUsd: e.target.value }))}
            className={fieldClass()}
          />
        </label>
      )}

      {step === 1 && (
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          What is your primary objective?
          <select value={form.primaryObjective} onChange={(e) => setForm((p) => ({ ...p, primaryObjective: e.target.value }))} className={fieldClass()}>
            {OBJECTIVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {step === 2 && (
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          What is your time horizon?
          <select value={form.timeHorizon} onChange={(e) => setForm((p) => ({ ...p, timeHorizon: e.target.value }))} className={fieldClass()}>
            {HORIZON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3 text-sm text-slate-300">
          <label className="flex flex-col gap-2">
            How would you describe your risk appetite?
            <select value={form.riskAppetite} onChange={(e) => setForm((p) => ({ ...p, riskAppetite: e.target.value }))} className={fieldClass()}>
              {APPETITE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            What is the maximum drawdown (%) you could tolerate?
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.maxTolerableDrawdownPct}
              onChange={(e) => setForm((p) => ({ ...p, maxTolerableDrawdownPct: e.target.value }))}
              className={fieldClass()}
            />
          </label>
        </div>
      )}

      {step === 4 && (
        <fieldset className="flex flex-col gap-2 text-sm text-slate-300">
          <legend className="mb-1">Which markets do you want to focus on?</legend>
          {MARKET_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="checkbox" checked={form.preferredMarkets.includes(o.value)} onChange={() => toggleMarket(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}

      {step === 5 && (
        <fieldset className="flex flex-col gap-2 text-sm text-slate-300">
          <legend className="mb-1">How much autonomy do you want to give the advisor?</legend>
          {AUTONOMY_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="radio" name="autonomyLevel" checked={form.autonomyLevel === o.value} onChange={() => setForm((p) => ({ ...p, autonomyLevel: o.value }))} />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}

      {step === 6 && (
        <fieldset className="flex flex-col gap-2 text-sm text-slate-300">
          <legend className="mb-1">Do you want recommendations only, or paper-trading automation?</legend>
          {MODE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="radio" name="tradingMode" checked={form.tradingMode === o.value} onChange={() => setForm((p) => ({ ...p, tradingMode: o.value }))} />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}

      {step === 7 && (
        <fieldset className="flex flex-col gap-2 text-sm text-slate-300">
          <legend className="mb-1">
            Might you eventually want gated real-money execution? (Not available in this version — for future planning only.)
          </legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="wantsGatedRealExecution" checked={form.wantsGatedRealExecution === false} onChange={() => setForm((p) => ({ ...p, wantsGatedRealExecution: false }))} />
            No, paper trading only
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="wantsGatedRealExecution" checked={form.wantsGatedRealExecution === true} onChange={() => setForm((p) => ({ ...p, wantsGatedRealExecution: true }))} />
            Yes, I&apos;d consider it in the future
          </label>
        </fieldset>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100 disabled:opacity-40"
        >
          Back
        </button>
        {step < totalSteps - 1 ? (
          <button
            type="button"
            disabled={step === 4 && form.preferredMarkets.length === 0}
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={generateRecommendation}
            className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50"
          >
            {pending ? "Generating…" : "Generate My Strategy"}
          </button>
        )}
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    </div>
  );
}
