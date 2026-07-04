"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CLOSE_REVIEW_CONFIRM_BODY_1,
  CLOSE_REVIEW_CONFIRM_BODY_2,
  CLOSE_REVIEW_CONFIRM_BUTTON,
  CLOSE_REVIEW_CONFIRM_TITLE,
  CLOSE_REVIEW_CONFIRM_WILL_NOT_ITEMS,
  CLOSE_REVIEW_CONFIRM_WILL_NOT_LABEL,
  CLOSE_REVIEW_CTA_LABEL,
  CLOSE_REVIEW_HELP_TEXT,
  CLOSE_REVIEW_KEEP_OPEN_BUTTON,
  CLOSE_REVIEW_SUCCESS_NOTE,
} from "@/lib/capital/position-detail-content";

/**
 * User-confirmed governed paper close review. Clicking "Request Paper Close
 * Review" only opens an inline confirmation panel — it never POSTs by
 * itself. The confirmation panel states exactly what the review will and
 * will not do before the user can confirm. POSTs with no body — this action
 * accepts only the path param id; there is nothing else for it to submit.
 */
export function RequestPaperCloseReviewButton({ positionId }: { positionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const confirmCloseReview = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capital/positions/${positionId}/request-close-review`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to submit this paper position for close review.");
        return;
      }
      setConfirming(false);
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return <p className="text-xs text-emerald-300">{CLOSE_REVIEW_SUCCESS_NOTE}</p>;
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.08] px-4 py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-300/[0.16]"
        >
          {CLOSE_REVIEW_CTA_LABEL}
        </button>
        <p className="max-w-sm text-right text-xs text-slate-500">{CLOSE_REVIEW_HELP_TEXT}</p>
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="max-w-sm rounded-xl border border-rose-300/20 bg-black/20 p-3 text-right">
      <p className="text-left text-xs font-medium text-white">{CLOSE_REVIEW_CONFIRM_TITLE}</p>
      <p className="mt-1 text-left text-xs text-slate-300">{CLOSE_REVIEW_CONFIRM_BODY_1}</p>
      <p className="mt-1 text-left text-xs text-slate-300">{CLOSE_REVIEW_CONFIRM_BODY_2}</p>
      <p className="mt-2 text-left text-xs text-slate-400">{CLOSE_REVIEW_CONFIRM_WILL_NOT_LABEL}</p>
      <ul className="mt-1 space-y-0.5 text-left text-xs text-slate-400">
        {CLOSE_REVIEW_CONFIRM_WILL_NOT_ITEMS.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CLOSE_REVIEW_KEEP_OPEN_BUTTON}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmCloseReview}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.1] px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-300/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Submitting…" : CLOSE_REVIEW_CONFIRM_BUTTON}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
