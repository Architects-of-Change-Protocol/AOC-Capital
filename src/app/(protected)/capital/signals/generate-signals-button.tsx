"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POSTs with no body — the selected strategy, symbols, market data, portfolio state, and Risk Constitution are all derived server-side; there is nothing for this button to submit. */
export function GenerateSignalsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/signals/generate", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to generate signals.");
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
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={generate}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate Signals"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
