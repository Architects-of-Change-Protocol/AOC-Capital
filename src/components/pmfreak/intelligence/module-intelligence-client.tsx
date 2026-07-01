"use client";

import { useState } from "react";
import useSWR from "swr";
import type { AIResponseCard, AIResponseEnvelope } from "@/lib/ai/types";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load intelligence (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export function ModuleIntelligenceClient({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const { data, error, isLoading, isValidating, mutate } = useSWR<AIResponseEnvelope<AIResponseCard[]>>(endpoint, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
    errorRetryCount: 3,
  });

  const lastRefreshed = data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : null;

  if (isLoading) {
    return <section className="rounded-2xl border border-white/10 bg-white/20 p-5 text-sm text-slate-300">Loading intelligence…</section>;
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-300/30 bg-rose-950/20 p-5 text-sm text-rose-100">
        <p>We could not load this module’s intelligence right now.</p>
        <button onClick={() => void mutate()} className="mt-3 rounded-lg border border-rose-200/40 px-3 py-2 text-xs uppercase tracking-wide text-rose-100 hover:bg-rose-300/10">Retry fetch</button>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Last refreshed: {lastRefreshed}{isValidating ? " · updating…" : ""}</p>
      {data.data.map((card) => (
        <article key={card.id} className="rounded-2xl border border-white/10 bg-white/20 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{card.headline}</h2>
            <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 text-xs uppercase text-cyan-200">confidence {card.confidenceScore.toFixed(2)}</span>
            <span className="rounded-full border border-rose-300/30 px-2 py-0.5 text-xs uppercase text-rose-200">{card.severity}</span>
          </div>
          <p className="mt-3 text-sm text-slate-300">{card.rationale}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <p className="font-medium text-cyan-200">Recommended next action</p>
            <p className="mt-1 text-slate-200">{card.recommendedNextAction.title}</p>
            <p className="text-xs text-slate-400">Owner: {card.recommendedNextAction.owner} · Due: {card.recommendedNextAction.dueBy}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            {card.sourceTags.map((tag) => (
              <span key={tag.label} className="rounded-full border border-white/10 px-2 py-1">{tag.label}: {tag.context}</span>
            ))}
          </div>
          {card.recommendedNextAction.actionLabel ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setStatus((prev) => ({ ...prev, [card.id]: `${card.recommendedNextAction.actionLabel} completed` }))}
                className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/30"
              >
                {card.recommendedNextAction.actionLabel}
              </button>
              {status[card.id] ? <span className="text-xs text-emerald-300">{status[card.id]}</span> : null}
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
