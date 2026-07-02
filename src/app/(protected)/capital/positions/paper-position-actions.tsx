"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLOSE_REASONS, type CloseReason } from "@/lib/trading/database-contract";

const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
  user_requested: "User requested",
  risk_review: "Risk review",
  strategy_exit: "Strategy exit",
  stop_loss: "Stop loss",
  take_profit: "Take profit",
  system_rebalance: "System rebalance",
  manual_test: "Manual test",
};

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

export function PositionActions({ positionId }: { positionId: string }) {
  const router = useRouter();
  const [closeReason, setCloseReason] = useState<CloseReason>("user_requested");
  const [pending, setPending] = useState<"mark" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mark = async () => {
    setPending("mark");
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
      setPending(null);
    }
  };

  const close = async () => {
    setPending("close");
    setError(null);
    try {
      const res = await fetch(`/api/capital/paper-positions/${positionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closeReason }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to close position.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={closeReason}
          onChange={(e) => setCloseReason(e.target.value as CloseReason)}
          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white"
        >
          {CLOSE_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {CLOSE_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={mark}
          disabled={pending !== null}
          className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50"
        >
          {pending === "mark" ? "Marking…" : "Mark"}
        </button>
        <button
          type="button"
          onClick={close}
          disabled={pending !== null}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.08] px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-300/[0.16] disabled:opacity-50"
        >
          {pending === "close" ? "Closing…" : "Close Position"}
        </button>
      </div>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
