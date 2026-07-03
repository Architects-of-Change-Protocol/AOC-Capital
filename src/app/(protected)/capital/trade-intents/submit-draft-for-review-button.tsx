"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POSTs with no body — symbol, side, quantity, notional, and leverage are all fixed on the draft already; there is nothing for this button to submit. */
export function SubmitDraftForReviewButton({ intentId }: { intentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capital/trade-intents/${intentId}/submit-for-review`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to submit this draft for Risk Constitution review.");
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
        disabled={pending}
        onClick={submit}
        className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.1] px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for Risk Constitution Review"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
