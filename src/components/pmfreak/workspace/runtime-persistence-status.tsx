"use client";

import type { RuntimeHydrationIntegrity, RuntimeSyncStatus } from "@/lib/workspace/runtime-persistence";

export function RuntimePersistenceStatus({
  betaMode,
  syncStatus,
  lastCheckpoint,
  integrity,
}: {
  betaMode: boolean;
  syncStatus: RuntimeSyncStatus;
  lastCheckpoint: number | null;
  integrity: RuntimeHydrationIntegrity;
}) {
  if (!betaMode) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
      <p>Runtime sync: <span className="font-medium text-slate-100">{syncStatus}</span></p>
      <p>Hydration: <span className="font-medium text-slate-100">{integrity}</span></p>
      <p>Checkpoint: <span className="font-medium text-slate-100">{lastCheckpoint ? new Date(lastCheckpoint).toLocaleString() : "pending"}</span></p>
    </div>
  );
}
