"use client";

import useSWR from "swr";
import { DeteriorationSignals } from "@/components/pmfreak/change-detection/deterioration-signals";
import { EscalationThresholdCard } from "@/components/pmfreak/change-detection/escalation-threshold-card";
import { OperationalDeltas } from "@/components/pmfreak/change-detection/operational-deltas";
import { TrendGraph } from "@/components/pmfreak/change-detection/trend-graph";
import type { ChangeDetectionSnapshot } from "@/lib/change-detection";

const fetcher = async (url: string): Promise<ChangeDetectionSnapshot> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load change detection.");
  return response.json() as Promise<ChangeDetectionSnapshot>;
};

export function ChangeFeed() {
  const { data, error, isLoading } = useSWR("/api/change-detection", fetcher, { refreshInterval: 30_000 });
  if (error) return <div className="rounded-lg border border-rose-700/40 bg-rose-950/40 p-3 text-rose-100">Unable to load change feed.</div>;
  if (isLoading || !data) return <div className="rounded-lg border border-slate-700 bg-white p-3 text-slate-300">Loading temporal intelligence…</div>;

  return <div className="space-y-4"><OperationalDeltas deltas={data.operationalDeltas} /><TrendGraph trends={data.trendMovements} /><EscalationThresholdCard transitions={data.escalationTransitions} /><DeteriorationSignals deterioration={data.deteriorationSignals} improvements={data.improvementSignals} /><section className="rounded-lg border border-slate-700 bg-white p-3 text-xs text-slate-300">Alert suppression state: {data.suppression.length} active tracks.</section></div>;
}
