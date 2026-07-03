"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * User-confirmed cancellation of a draft trade intent. Clicking "Cancel
 * Draft" only opens an inline confirmation panel — it never POSTs by itself.
 * The confirmation panel states exactly what cancellation will and will not
 * do before the user can confirm. POSTs with no body — this action accepts
 * only the path param id; there is nothing else for it to submit.
 */
export function CancelDraftButton({ intentId }: { intentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmCancel = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capital/trade-intents/${intentId}/cancel-draft`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to cancel this draft trade intent.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.08] px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-300/[0.16]"
        >
          Cancel Draft
        </button>
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="max-w-sm rounded-xl border border-rose-300/20 bg-black/20 p-3 text-right">
      <p className="text-left text-xs font-medium text-white">Cancel draft trade intent?</p>
      <p className="mt-1 text-left text-xs text-slate-300">This will withdraw the draft before Risk Constitution review.</p>
      <p className="mt-2 text-left text-xs text-slate-400">It will not:</p>
      <ul className="mt-1 space-y-0.5 text-left text-xs text-slate-400">
        <li>- submit the draft</li>
        <li>- run risk review</li>
        <li>- open a paper position</li>
        <li>- place an order</li>
        <li>- connect to a broker</li>
        <li>- enable real execution</li>
      </ul>
      <p className="mt-2 text-left text-xs text-slate-500">
        If the draft came from a signal recommendation, that signal may become available for draft creation again if it is still eligible.
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Keep Draft
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmCancel}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.1] px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Cancel Draft"}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
