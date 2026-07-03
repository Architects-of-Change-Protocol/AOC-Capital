import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "@/lib/capital/strategy-selection-service";
import { listSignalRecommendations } from "@/lib/capital/signal-engine-service";
import type { PaperSignalRecommendationRow } from "@/lib/trading/database-contract";
import {
  CHOOSE_STRATEGY_CTA_LABEL,
  CHOOSE_STRATEGY_HREF,
  GUIDING_SENTENCE,
  HEADER_EXPLAINER,
  NO_STRATEGY_SELECTED_BODY,
  NO_STRATEGY_SELECTED_TITLE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  SAFETY_DISCLOSURE,
  SIGNAL_STRENGTH_DISCLOSURE,
  STALE_STRATEGY_BODY,
  STALE_STRATEGY_TITLE,
} from "@/lib/capital/signal-engine-content";
import { GenerateSignalsButton } from "./generate-signals-button";
import { ConvertSignalToDraftButton } from "./convert-signal-to-draft-button";

const ACTION_COPY: Record<string, { label: string; className: string }> = {
  paper_buy_candidate: { label: "Paper Buy Candidate", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  watch: { label: "Watch", className: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100" },
  reduce_exposure: { label: "Reduce Exposure", className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200" },
  avoid: { label: "Avoid", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  no_action: { label: "No Action", className: "border-white/10 bg-white/5 text-slate-300" },
};

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  blocked_by_risk: { label: "Blocked by Risk", className: "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" },
  expired: { label: "Expired", className: "border-white/10 bg-white/5 text-slate-400" },
  superseded: { label: "Superseded", className: "border-white/10 bg-white/5 text-slate-400" },
};

const STRENGTH_COPY: Record<string, { label: string; className: string }> = {
  weak: { label: "Weak", className: "border-white/10 bg-white/5 text-slate-300" },
  moderate: { label: "Moderate", className: "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100" },
  strong: { label: "Strong", className: "border-fuchsia-300/30 bg-fuchsia-300/[0.08] text-fuchsia-200" },
};

function fallbackCopy(value: string) {
  return { label: value.replace(/_/g, " "), className: "border-white/10 bg-white/5 text-slate-300" };
}

/** Mirrors the eligibility rule enforced server-side in signal-trade-intent-handoff-service.ts — display-only; the API route re-validates before writing anything. */
function isConvertibleToDraft(signal: PaperSignalRecommendationRow): boolean {
  return (
    signal.action === "paper_buy_candidate" &&
    signal.status === "active" &&
    !signal.converted_trade_intent_id &&
    signal.suggested_notional_usd !== null &&
    signal.suggested_notional_usd > 0 &&
    signal.market_price_usd !== null &&
    signal.market_price_usd > 0
  );
}

function SignalCard({ signal }: { signal: PaperSignalRecommendationRow }) {
  const actionCopy = ACTION_COPY[signal.action] ?? fallbackCopy(signal.action);
  const statusCopy = STATUS_COPY[signal.status] ?? fallbackCopy(signal.status);
  const strengthCopy = STRENGTH_COPY[signal.strength] ?? fallbackCopy(signal.strength);

  return (
    <div className={`rounded-2xl border p-5 ${signal.status === "blocked_by_risk" ? "border-rose-300/20 bg-rose-300/[0.04]" : "border-white/10 bg-white/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{signal.symbol}</h3>
          <p className="mt-1 text-xs text-slate-500">{signal.strategy_name}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${actionCopy.className}`}>{actionCopy.label}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusCopy.className}`}>{statusCopy.label}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${strengthCopy.className}`}>{strengthCopy.label}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Confidence</span>
          <p className="mt-1 text-white">{signal.confidence_score}/100</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Suggested paper notional</span>
          <p className="mt-1 text-white">{signal.suggested_notional_usd != null ? `$${signal.suggested_notional_usd.toFixed(2)}` : "—"}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Market price</span>
          <p className="mt-1 text-white">{signal.market_price_usd != null ? `$${signal.market_price_usd.toFixed(2)}` : "Unavailable"}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Market data source</span>
          <p className="mt-1 text-white">{signal.market_data_source.replace(/_/g, " ")}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Rationale</span>
          <ul className="mt-2 space-y-1 text-slate-300">
            {signal.rationale.map((line, index) => (
              <li key={index}>• {line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Risk notes</span>
          {signal.risk_notes.length === 0 ? (
            <p className="mt-2 text-slate-500">No additional risk notes.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-slate-300">
              {signal.risk_notes.map((line, index) => (
                <li key={index}>• {line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {signal.blocked_reasons.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-300/10 bg-black/10 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-rose-300">Blocked reasons (governance evidence)</span>
          <ul className="mt-2 space-y-1 text-slate-300">
            {signal.blocked_reasons.map((line, index) => (
              <li key={index}>✕ {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">Required user action: </span>
          {signal.required_user_action}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Paper-only</span>
          <span className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs font-medium text-cyan-100">Real execution locked</span>
        </div>
      </div>

      {isConvertibleToDraft(signal) ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/10 px-4 py-3">
          <p className="max-w-xl text-xs text-slate-400">
            Converting creates a draft trade intent only. It does not submit the draft for Risk Constitution review and does not open a paper position.
          </p>
          <ConvertSignalToDraftButton signalId={signal.id} />
        </div>
      ) : signal.converted_trade_intent_id ? (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-xs text-slate-400">
          Converted to a draft trade intent. See{" "}
          <Link href="/capital/trade-intents" className="text-cyan-200 underline underline-offset-2">
            Trade Intents
          </Link>
          .
        </div>
      ) : null}
    </div>
  );
}

export default async function SignalEnginePage() {
  const user = await requireAuthUser();
  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  const [profile, signals] = await Promise.all([getSelectedStrategyProfile(user.companyId), listSignalRecommendations(user.companyId, portfolio.id)]);
  const { selectedStrategy, staleSelectedStrategy } = resolveSelectedStrategy(profile);

  const activeSignals = signals.filter((signal) => signal.status !== "blocked_by_risk");
  const blockedSignals = signals.filter((signal) => signal.status === "blocked_by_risk");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Paper only · Simulation mode · No real money is being traded
      </div>

      {/* 1. Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{PAGE_TITLE}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{PAGE_SUBTITLE}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{HEADER_EXPLAINER}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{SIGNAL_STRENGTH_DISCLOSURE}</p>
      </div>

      {/* 2. Selected strategy context + 3. Generate Signals button */}
      <div
        className={`rounded-2xl border p-5 ${
          selectedStrategy ? "border-emerald-300/30 bg-emerald-300/[0.06]" : staleSelectedStrategy ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/5"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected Strategy</p>
        {selectedStrategy ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedStrategy.name}</h3>
              <p className="mt-1 text-sm text-slate-300">Supported symbols evaluated: {selectedStrategy.supportedSymbols.join(", ")}</p>
            </div>
            <GenerateSignalsButton />
          </div>
        ) : staleSelectedStrategy ? (
          <>
            <h3 className="mt-1 text-xl font-semibold text-white">{STALE_STRATEGY_TITLE}</h3>
            <p className="mt-2 max-w-2xl text-sm text-amber-200">{STALE_STRATEGY_BODY}</p>
            <Link
              href={CHOOSE_STRATEGY_HREF}
              className="mt-3 inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2]"
            >
              {CHOOSE_STRATEGY_CTA_LABEL}
            </Link>
          </>
        ) : (
          <>
            <h3 className="mt-1 text-xl font-semibold text-white">{NO_STRATEGY_SELECTED_TITLE}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{NO_STRATEGY_SELECTED_BODY}</p>
            <Link
              href={CHOOSE_STRATEGY_HREF}
              className="mt-3 inline-block rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2]"
            >
              {CHOOSE_STRATEGY_CTA_LABEL}
            </Link>
          </>
        )}
      </div>

      {/* 4. Active signal recommendations */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Active Signal Recommendations</p>
        {activeSignals.length === 0 ? (
          <p className="text-sm text-slate-500">No active signal recommendations yet. Generate signals to see paper-only recommendations here.</p>
        ) : (
          activeSignals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
        )}
      </div>

      {/* 5. Risk-gated / blocked signals — shown as governance evidence, never silently dropped */}
      {blockedSignals.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-rose-300">Risk-Gated Signals · Governance Evidence</p>
          {blockedSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : null}

      {/* 7. Safety disclosure */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">{SAFETY_DISCLOSURE}</div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs uppercase tracking-[0.15em] text-slate-500">{GUIDING_SENTENCE}</div>
    </div>
  );
}
