"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTradeIntentForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("BTC-USD");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [notionalUsd, setNotionalUsd] = useState("100");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/trade-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, side, quantity: Number(quantity), notionalUsd: Number(notionalUsd) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to create trade intent.");
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
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Symbol
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Side
        <select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
          <option value="buy">Buy (long)</option>
          <option value="sell">Sell (short)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Quantity
        <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Notional USD
        <input type="number" min="0" step="any" value={notionalUsd} onChange={(e) => setNotionalUsd(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
      </label>
      <div className="col-span-2 flex items-end gap-3 sm:col-span-4">
        <button type="submit" disabled={pending} className="rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.16] disabled:opacity-50">
          {pending ? "Submitting…" : "Submit Trade Intent"}
        </button>
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    </form>
  );
}
