import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";

const CAPITAL_NAV = [
  { href: "/capital/demo", label: "Demo Sandbox" },
  { href: "/capital/advisor", label: "Advisor" },
  { href: "/capital/constitution/new", label: "Investor Constitution" },
  { href: "/capital/strategies", label: "Strategy Library" },
  { href: "/capital", label: "Command Center" },
  { href: "/capital/overview", label: "Portfolio Overview" },
  { href: "/capital/allocation", label: "Allocation & Exposure" },
  { href: "/capital/performance", label: "Strategy Performance" },
  { href: "/capital/performance/closed", label: "Closed Performance" },
  { href: "/capital/performance/strategies", label: "Strategy Attribution" },
  { href: "/capital/performance/signals", label: "Signal Cohorts" },
  { href: "/capital/governance/snapshot", label: "Governance Snapshot" },
  { href: "/capital/signals", label: "Signal Engine" },
  { href: "/capital/market-signals", label: "Market Signals" },
  { href: "/capital/market-data", label: "Market Data" },
  { href: "/capital/trade-intents", label: "Trade Intents" },
  { href: "/capital/positions", label: "Paper Positions" },
  { href: "/capital/risk-constitution", label: "Risk Constitution" },
  { href: "/capital/capital-levels", label: "Capital Levels" },
  { href: "/capital/audit-ledger", label: "Audit Ledger" },
];

export default async function CapitalLayout({ children }: { children: React.ReactNode }) {
  await requireAuthUser();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Capital Command Center</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">AOC Capital — Governed Paper Trading</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Simulated, governed trading only. No real exchange execution is connected — every trade intent is evaluated by the Level 1
          risk policy engine before it can become a paper position.
        </p>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {CAPITAL_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.07] hover:text-cyan-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
