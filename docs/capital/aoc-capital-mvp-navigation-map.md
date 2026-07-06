# AOC Capital MVP Navigation Map

## Purpose

This document maps the paper-only AOC Capital MVP's navigation after the MVP
Integration Review & Hardening (PR #22) and the MVP Polish & Navigation
Consolidation (PR #23). It exists so a reader can see, in one place, where
every page sits in the paper-capital lifecycle, whether it mutates anything,
and how to get to it. It does not claim production readiness or external
trading readiness — see "Known Caveats" below.

The single source of truth for navigation grouping and route metadata is
`src/lib/capital/capital-navigation.ts`. This document narrates that data;
if the two ever disagree, the code is authoritative.

## Product Zones

AOC Capital's sidebar groups routes into six zones plus a "More Tools" group
for supplementary read-only utilities that sit outside the primary journey:

1. **Command Center** — the guided entry point (`/capital`).
2. **Setup** — Investor Constitution and Strategy Library.
3. **Lifecycle** — Signals, Trade Intents, Paper Positions.
4. **Portfolio** — Portfolio Overview, Allocation & Exposure.
5. **Performance** — Closed Performance, Strategy Attribution, Signal Cohorts.
6. **Governance** — Governance Snapshot.
7. **More Tools** *(not one of the six primary zones)* — Advisor, Demo
   Sandbox, the legacy Strategy Performance page, Market Signals, Market
   Data, Risk Constitution, Capital Levels, Audit Ledger.

## Route Map

| Label | Route | Zone | Mode | Sidebar | Paper-only | Real execution locked | Notes |
|---|---|---|---|---|---|---|---|
| Command Center | `/capital` | Command Center | read_only | Yes | Yes | Yes | Guided journey, primary actions, discoverability links |
| Investor Constitution | `/capital/constitution/new` | Setup | intake | Yes | Yes | Yes | Educational, non-binding intake |
| Strategy Library | `/capital/strategies` | Setup | governed_action | Yes | Yes | Yes | Select a paper strategy profile |
| Signals | `/capital/signals` | Lifecycle | governed_action | Yes | Yes | Yes | Generate/list paper signal recommendations |
| Trade Intents | `/capital/trade-intents` | Lifecycle | governed_action | Yes | Yes | Yes | Draft, cancel, submit for Risk Constitution review |
| Paper Positions | `/capital/positions` | Lifecycle | governed_action | Yes | Yes | Yes | Open/closed positions, mark-to-market |
| Position Detail | `/capital/positions/[id]` | Lifecycle (detail) | governed_action | No — reached via tables/related links | Yes | Yes | The one read-only-looking page with a governed action (Request Paper Close Review) |
| Portfolio Overview | `/capital/overview` | Portfolio | read_only | Yes | Yes | Yes | Canonical dashboard |
| Allocation & Exposure | `/capital/allocation` | Portfolio | read_only | Yes | Yes | Yes | Concentration, exposure, cash vs invested |
| Closed Performance | `/capital/performance/closed` | Performance | read_only | Yes | Yes | Yes | Realized simulated P&L, governance evidence |
| Strategy Attribution | `/capital/performance/strategies` | Performance | read_only | Yes | Yes | Yes | Strategy-level lifecycle funnel and P&L |
| Signal Cohorts | `/capital/performance/signals` | Performance | read_only | Yes | Yes | Yes | Signal cohort conversion and outcomes |
| Governance Snapshot | `/capital/governance/snapshot` | Governance | diagnostic | Yes | Yes | Yes | Internal MVP review aid, composes the reports above |
| Advisor | `/capital/advisor` | More Tools | intake | Yes | Yes | Yes | Guided strategy-brief intake |
| Demo Sandbox | `/capital/demo` | More Tools | governed_action | Yes | Yes | Yes | One-click deterministic demo scenario |
| Strategy Performance (legacy) | `/capital/performance` | More Tools | read_only | Yes | Yes | Yes | Superseded by Strategy Attribution; kept live |
| Market Signals | `/capital/market-signals` | More Tools | diagnostic | Yes | Yes | Yes | Read-only mock signal feed |
| Market Data | `/capital/market-data` | More Tools | diagnostic | Yes | Yes | Yes | Read-only live-public-or-simulated price feed |
| Risk Constitution | `/capital/risk-constitution` | More Tools | read_only | Yes | Yes | Yes | Level 1 rules, read-only in this MVP |
| Capital Levels | `/capital/capital-levels` | More Tools | read_only | Yes | Yes | Yes | Static simulated capital tiers |
| Audit Ledger | `/capital/audit-ledger` | More Tools | read_only | Yes | Yes | Yes | Full read-only event history |

## User Journey

```
Investor Constitution → Strategy Library → Signals → Trade Intents (draft)
  → cancel OR submit for Risk Constitution review → approved/rejected
  → Paper Positions (if approved) → mark-to-market
  → Portfolio Overview → Allocation & Exposure → Position Detail
  → governed paper close review
  → Closed Performance → Strategy Attribution → Signal Cohorts
  → Governance Snapshot → MVP Integration Review (internal)
```

Every arrow above is a navigation, not a mutation guarantee — the underlying
mutation only happens through the one governed action button each lifecycle
page owns (submit/cancel a draft, request a close review, mark to market,
etc.), never from a reporting page.

## Read-Only Reporting Pages

These pages only ever read stored paper-capital state. None of them mutate,
refresh valuation, generate signals, create/submit/cancel drafts, close
positions, or call an LLM:

- Portfolio Overview (`/capital/overview`)
- Allocation & Exposure (`/capital/allocation`)
- Closed Performance (`/capital/performance/closed`)
- Strategy Attribution (`/capital/performance/strategies`)
- Signal Cohorts (`/capital/performance/signals`)
- Governance Snapshot (`/capital/governance/snapshot`)
- Position Detail (`/capital/positions/[id]`) is a special case: it is
  read-only except for exactly one governed action button, "Request Paper
  Close Review" (see below).

## Governed Action Pages / Components

These are the only places in the product that mutate paper-capital state:

- Strategy Library — select a strategy profile.
- Signals — generate signal recommendations; convert a signal to a draft.
- Trade Intents — cancel a draft; submit a draft for Risk Constitution review.
- Paper Positions — mark a position (or all positions) to market.
- Position Detail — request a governed paper close review.
- Advisor / Demo Sandbox — confirm an advisor recommendation; load/reset the
  demo scenario.

## Safety Copy Standard

Every AOC Capital page reinforces, where relevant: **Paper-only**,
**Read-only** (on reporting pages), **Real execution locked**, **No broker
connected**, **No live order routing**, **No real order was placed**,
**Simulated P&L**, **Not investment advice**. Forbidden copy (Execute, Place
Order, Trade Now, Buy/Sell Now, Send to Broker, Connect Exchange, Fund
account, Deposit/Withdraw as actions, Refresh Valuation, Recommended/Best
strategy or signal) never appears outside of safety tests, forbidden-word
allowlists, or documentation explicitly stating the capability does not
exist. Pinned by `tests/aoc-capital-mvp-ui-copy-safety.test.mjs` and this
PR's `tests/aoc-capital-mvp-navigation-polish.test.mjs`.

## Known Caveats

- Dynamic detail routes (Position Detail) are intentionally not sidebar
  entries — they are reached from tables and related links on Paper
  Positions, Allocation & Exposure, Closed Performance, and other reporting
  pages.
- Historical records (positions closed before PR #17's governed close
  review, e.g.) may be readable but incomplete; they are labeled
  "historical," never silently treated as governed.
- Governance Snapshot is an internal MVP review aid. It does not indicate
  readiness for real trading or external execution.
- No broker/exchange integration, trading API keys, deposits, withdrawals,
  or live order routing exist anywhere in this product. This document
  describes navigation among simulated, paper-only pages only.
