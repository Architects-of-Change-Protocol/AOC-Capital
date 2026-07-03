"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTradeIntentFromSignal({ signalId, symbol, direction }: { signalId: string; symbol: string; direction: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (direction === "neutral") return <span className="text-xs text-slate-500">No directional trade</span>;

  const handleCreate = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/trade-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side: direction === "long" ? "buy" : "sell",
          quantity: 1,
          notionalUsd: 100,
          signalId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to create trade intent.");
        return;
      }
      router.push("/capital/trade-intents");
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
        onClick={handleCreate}
        disabled={pending}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create Trade Intent"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
