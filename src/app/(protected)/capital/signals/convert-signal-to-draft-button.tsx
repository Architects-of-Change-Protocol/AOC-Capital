"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POSTs with no body — symbol, side, quantity, and notional are all derived server-side from the signal itself; there is nothing for this button to submit. */
export function ConvertSignalToDraftButton({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capital/signals/${signalId}/convert-to-draft`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to convert this signal to a draft trade intent.");
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
        disabled={pending}
        onClick={convert}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Converting…" : "Convert to Draft Trade Intent"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
