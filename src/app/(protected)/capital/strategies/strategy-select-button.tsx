"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StrategySelectButton({ strategyKey, isSelected }: { strategyKey: string; isSelected: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/strategies/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyKey }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to select this strategy.");
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
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending || isSelected}
        onClick={select}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSelected ? "Current Strategy" : pending ? "Selecting…" : "Select Strategy"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
