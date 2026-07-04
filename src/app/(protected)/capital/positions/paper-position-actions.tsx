"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkAllButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAll = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/paper-positions/mark-all", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to mark positions to market.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={markAll}
        disabled={pending}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-1.5 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50"
      >
        {pending ? "Marking all…" : "Mark All to Market"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}

/**
 * Mark-to-market only. Closing a paper position is no longer available from
 * this list-row action set — see PR #17 hardening: the only path that can
 * close a paper position is the governed close review flow reached from
 * Position Detail (/capital/positions/[id], "Request Paper Close Review").
 * This component never POSTs to /api/capital/paper-positions/[id]/close.
 */
export function PositionActions({ positionId }: { positionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mark = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capital/paper-positions/${positionId}/mark`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to mark position.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={mark}
        disabled={pending}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50"
      >
        {pending ? "Marking…" : "Mark"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
