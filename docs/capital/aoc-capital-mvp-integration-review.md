# AOC Capital MVP Integration Review

Internal MVP integration review. Audit + hardening only — no new product surfaces, no new mutation capability, no schema migration.

## Scope

This review covers the paper-only AOC Capital MVP as it exists after PR #21 (Portfolio Governance Snapshot v1): Investor Constitution / Strategy Playbook groundwork, Investor Constitution Intake v0.1, Strategy Library, Signal Engine v1, Signal → Draft Trade Intent handoff, draft submit/cancel, Risk Constitution review, governed paper position lifecycle (open, mark-to-market, governed close review), Portfolio Overview, Allocation & Exposure, Position Detail, Closed Position Performance, Strategy Performance Attribution, Signal Cohort Outcome Tracking, and Portfolio Governance Snapshot v1.

Real execution is not implemented anywhere in this codebase. There is no broker/exchange integration, no trading API keys, no deposits, no withdrawals, and no live order routing to review — this report confirms their continued absence rather than reviewing controls around them.

## Lifecycle Reviewed

```
Investor Constitution / Strategy Playbook groundwork
  → Investor Constitution Intake v0.1
  → strategy selection
  → signal recommendation (Signal Engine v1)
  → draft trade intent (signal → draft handoff, or manual entry)
  → cancel draft OR submit draft for Risk Constitution review
  → approved/rejected decision
  → paper position (if approved)
  → mark-to-market updates
  → Portfolio Overview / Allocation & Exposure
  → Position Detail & Lifecycle Timeline
  → governed paper close review
  → Closed Position Performance & Realized P&L
  → Strategy-Level Performance Attribution
  → Signal Cohort Outcome Tracking
  → Portfolio Governance Snapshot
  → MVP Integration Review & Hardening (this PR)
```

## Route Inventory

All routes require `requireAuthUser()`, which resolves `companyId` from the authenticated user's session (never from a client-supplied field). This MVP is single-portfolio-per-company; every mutation route re-derives `portfolioId` server-side via `getOrCreateDefaultPortfolio(companyId)` rather than accepting it from the client.

| Route | Type | Auth | Company scoped | Portfolio scoped | Mutation allowed | Notes |
|---|---|---|---|---|---|---|
| `GET /api/capital/portfolio-overview` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Portfolio Overview |
| `GET /api/capital/allocation-exposure` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Allocation & Exposure |
| `GET /api/capital/positions/[id]` | read_only_get | ✓ | ✓ | n/a (single position by id + company) | No | Canonical Position Detail |
| `GET /api/capital/performance/closed` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Closed Position Performance |
| `GET /api/capital/performance/strategies` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Strategy Performance Attribution |
| `GET /api/capital/performance/signals` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Signal Cohort Outcomes |
| `GET /api/capital/governance/snapshot` | read_only_get | ✓ | ✓ | ✓ | No | Canonical Portfolio Governance Snapshot; composes the four reports above |
| `GET /api/capital/audit-ledger` | read_only_get | ✓ | ✓ | n/a | No | Read-only audit list |
| `GET /api/capital/market-data` | read_only_get | ✓ | ✓ | n/a | No | Read-only market data snapshot |
| `GET /api/capital/market-signals` | read_only_get | ✓ | ✓ | n/a | No | Read-only |
| `GET /api/capital/strategies` | read_only_get | ✓ | ✓ | n/a | No | Static library + selected profile read |
| `GET /api/capital/signals` | read_only_get | ✓ | ✓ | ✓ | No | Lists signal recommendations |
| `GET /api/capital/trade-intents` | read_only_get | ✓ | ✓ | n/a | No | List side of a mixed GET/POST route (see below) |
| `GET /api/capital/performance` | **hardened this PR** | ✓ | ✓ | n/a | No | See "Fixed in this PR" below — previously mutated on read |
| `GET /api/capital/portfolio/summary` | **hardened this PR** | ✓ | ✓ | n/a | No | See "Fixed in this PR" below — previously mutated on read |
| `GET /api/capital/portfolios` | read_only_get | ✓ | ✓ | n/a | No | Legacy overview aggregation, not user-facing (no page fetches it) |
| `GET /api/capital/capital-levels` | read_only_get (idempotent seed) | ✓ | ✓ | ✓ | Seed-if-missing only | `ensureCapitalLevels` seeds default static tiers once if absent; never mutates existing rows — see Known Gaps |
| `GET /api/capital/risk-constitution` | read_only_get (idempotent seed) | ✓ | ✓ | n/a | Seed-if-missing only | `ensureRiskConstitution` seeds default static rules once if absent — see Known Gaps |
| `GET /api/capital/paper-positions` | not a canonical reporting route | ✓ | ✓ | n/a | Yes (mark-on-read) | Orphaned: no page fetches this route. Calls `listPaperPositionsMarked`, which does refresh marks. Documented as a known, non-blocking gap. |
| `POST /api/capital/strategies/select` | intentional_paper_mutation_post | ✓ | ✓ | n/a | Yes | Only `strategyKey` trusted from client; full config re-derived server-side |
| `POST /api/capital/signals/generate` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Body never read; all inputs derived server-side |
| `POST /api/capital/signals/[id]/convert-to-draft` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Body never read; symbol/side/quantity re-derived from the signal |
| `POST /api/capital/trade-intents` | intentional_paper_mutation_post (mixed with GET) | ✓ | ✓ | ✓ | Yes | Manual draft entry; validates side ∈ {buy, sell}, quantity/notional > 0 |
| `POST /api/capital/trade-intents/[id]/cancel-draft` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Body never read; only path id is input |
| `POST /api/capital/trade-intents/[id]/submit-for-review` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Body never read; runs Level 1 risk policy; opens position only if approved |
| `POST /api/capital/positions/[id]/request-close-review` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Body never read; closes using already-stored valuation only, never a fresh fetch |
| `POST /api/capital/paper-positions/[id]/mark` | intentional_paper_mutation_post | ✓ | ✓ | n/a | Yes | Writes a `position_marked_to_market` audit event |
| `POST /api/capital/paper-positions/mark-all` | intentional_paper_mutation_post | ✓ | ✓ | ✓ | Yes | Bulk refresh; intentionally does not write an audit event per position (would spam the ledger) |
| `POST /api/capital/paper-positions/[id]/close` | **disabled_legacy_guard** | ✓ | n/a | n/a | No | Always returns 410; never touches `paper_positions`/`audit_ledger`; no page calls it |
| `POST /api/capital/advisor/recommend` | intentional_paper_mutation_post (stateless) | ✓ | — | — | No | Preview-only; no persistence |
| `POST /api/capital/advisor/confirm` | intentional_paper_mutation_post | ✓ | ✓ | n/a | Yes | Re-derives the recommendation server-side; never trusts a client-supplied recommendation |
| `POST /api/capital/demo/load` | intentional_paper_mutation_post | ✓ | ✓ | n/a | Yes | Idempotent; scripted deterministic demo scenario only |
| `POST /api/capital/demo/reset` | intentional_paper_mutation_post | ✓ | ✓ | n/a | Yes | Tenant-scoped delete of the loaded demo manifest only |

### Fixed in this PR

`GET /api/capital/performance` (backing the live, nav-linked "Strategy Performance" page at `/capital/performance`) and the orphaned `GET /api/capital/portfolio/summary` both called `markAllOpenPositions()` as a side effect of a plain read, before this PR. This violated the read-only/mutation boundary this review exists to confirm: a user merely navigating to "Strategy Performance" was silently triggering a mark-to-market write on every page load, and the orphaned `/api/capital/portfolio/summary` route did the same to anyone who called it directly. `getStrategyPerformance()`/`getPortfolioSummary()` were already designed to be pure reads (their own doc comments say so explicitly — the auto-refresh was added only at the call site), and the newer canonical reporting services (Portfolio Overview, Allocation & Exposure, etc.) deliberately avoid this exact pattern, so removing it brings these two routes in line with the rest of the reporting layer. Fixed by removing the `markAllOpenPositions()` call from:

- `src/app/(protected)/capital/performance/page.tsx`
- `src/app/api/capital/performance/route.ts`
- `src/app/api/capital/portfolio/summary/route.ts`

No other behavior changed; `markAllOpenPositions()` itself is untouched and remains reachable through its intentional, user-driven entry point (`POST /api/capital/paper-positions/mark-all`, the "Mark All to Market" button on the Paper Positions list). Regression-pinned in `tests/aoc-capital-mvp-route-boundary.test.mjs`.

## Service Inventory

| Service | Responsibility | Read-only / mutation | Company scoped | Portfolio scoped | Known caveats |
|---|---|---|---|---|---|
| `portfolio-overview-service.ts` | Portfolio Overview aggregation | Read-only | ✓ | ✓ | None |
| `allocation-exposure-service.ts` | Allocation & Exposure aggregation | Read-only | ✓ | ✓ | None |
| `position-detail-service.ts` | Position Detail & lifecycle timeline | Read-only | ✓ | n/a (by id + company) | Timeline display treats `position_closed`/`paper_position_closed` as equivalent (see Source-Chain Integrity) |
| `closed-position-performance-service.ts` | Closed Position Performance & realized P&L | Read-only | ✓ | ✓ | None |
| `strategy-performance-attribution-service.ts` | Strategy-level attribution | Read-only | ✓ | ✓ | None |
| `signal-cohort-outcome-service.ts` | Signal cohort outcome tracking | Read-only | ✓ | ✓ | None |
| `portfolio-governance-snapshot-service.ts` | Governance snapshot (composes the four reports above) | Read-only | ✓ | ✓ | `unlinkedSignalCount` is hardcoded to 0 when building governance gap rows — reviewed and confirmed intentional, not a bug: a signal is the root of the source chain, so there is no parent link for it to be "unlinked" from (see Known Gaps) |
| `strategy-selection-service.ts` | Strategy selection | Mutation (`selectStrategy`) + read (`getSelectedStrategyProfile`) | ✓ | ✓ | RPC `select_portfolio_strategy_profile_and_audit` |
| `signal-engine-service.ts` | Signal generation + listing | Mutation (`generateSignals`) + read (`listSignalRecommendations`) | ✓ | ✓ | RPC `insert_paper_signal_recommendations_and_audit` |
| `signal-trade-intent-handoff-service.ts` | Signal → draft conversion | Mutation | ✓ | ✓ | RPC `create_draft_trade_intent_from_signal_and_audit` |
| `draft-trade-intent-cancel-service.ts` | Draft cancellation | Mutation | ✓ | ✓ | RPC `cancel_draft_trade_intent_and_audit` |
| `draft-trade-intent-review-service.ts` | Draft submit for Risk Constitution review | Mutation | ✓ | ✓ | RPC `submit_draft_trade_intent_for_review` |
| `position-close-review-service.ts` | Governed close review | Mutation | ✓ | ✓ | RPC `close_paper_position_with_review_and_audit`; only accepts a position id, derives all values from stored valuation |
| `trade-service.ts` (`src/lib/trading`) | Portfolio/position CRUD, mark-to-market, legacy `createTradeIntent`/`closePaperPosition` | Mixed | ✓ | ✓ | `closePaperPosition()` (the pre-PR#17 direct-close function) is called only by the Demo Strategy Sandbox (`demo-write-service.ts`), never from a live user-facing mutation route — confirmed via repo-wide search |

## Paper-Only Safety Boundary

Confirmed by static grep across `src/app/(protected)/capital`, `src/app/api/capital`, `src/lib/capital`, `src/features/capital`, `src/lib/trading`, `src/lib/demo`, and all `tests/aoc-capital-*` files, plus a `package.json` dependency check:

- No broker integration exists (no broker client/SDK import, no `brokerClient`/`brokerSdk` symbol).
- No exchange integration exists (no `ccxt`/`coinbase`/`binance`/`alpaca`/`ib_insync` or similar package is a dependency).
- No trading API keys exist (no `apiSecret`/`privateKey`/`signedRequest` handling).
- No deposits exist (no `processDeposit`/`createDeposit` implementation; "Deposit" appears only as a negation, e.g. "No... deposit... functionality").
- No withdrawals exist (no `withdrawFunds`/`processWithdrawal` implementation; "Withdraw" appears only as a negation or as "withdraws the draft," which refers to cancelling a draft trade intent, not a funds withdrawal).
- No live order routing exists (no `orderRouter`, `placeOrder`, `createOrder`, or `executeTrade` implementation).
- No real execution exists anywhere in the reviewed surface; every governance-flag object returned by a reporting service (or embedded in page copy) sets `realExecutionLocked: true`, `brokerConnected: false`, `liveOrderRoutingEnabled: false`.
- No real orders are placed by any route; the one route that used to close a position directly (`POST /api/capital/paper-positions/[id]/close`) is disabled and returns 410 without touching any table.

Pinned by `tests/aoc-capital-mvp-paper-only-safety.test.mjs`.

## Read-Only Reporting Boundary

The seven canonical read-only reporting routes/services/pages (Portfolio Overview, Allocation & Exposure, Position Detail, Closed Position Performance, Strategy Performance Attribution, Signal Cohort Outcomes, Portfolio Governance Snapshot) were each verified to:

- Export only `GET` (no `POST`/`PUT`/`PATCH`/`DELETE`).
- Never call `request.json()` or read a request body.
- Never call a mutation RPC (`.rpc(`) or write a table (`.insert(`/`.update(`/`.upsert(`/`.delete(`).
- Never call any mutation helper (`generateSignals`, `convertSignalToDraftTradeIntent`, `cancelDraftTradeIntent`, `submitDraftTradeIntentForReview`, `requestPaperPositionCloseReview`, `closePaperPosition`, `markAllOpenPositions`, `markPositionToMarket`, `recordMarketPrice`, `createTradeIntent`, `selectStrategy`, `recordAuditEvent`, `listPaperPositionsMarked`).
- Never call an LLM.
- Never write an audit event (they only ever `.select()` from `audit_ledger`).

Position Detail is the one "read-only" page permitted to render exactly one governed mutation entry point — "Request Paper Close Review" — which posts to the governed close-review route, never a raw close. No other read-only page renders any mutation form, button, or action label.

Pinned by `tests/aoc-capital-mvp-readonly-mutation-boundary.test.mjs` and the per-feature `*-safety.test.mjs`/`*-ui.test.mjs` files.

## Mutation Boundary

Every intentional mutation route was verified to require auth, scope by `company_id` (and `portfolio_id` where the underlying table carries one), never accept a client-supplied `companyId`/`portfolioId`, never reference a broker/order/execution surface, and reject invalid lifecycle states with a 404/409/400 as appropriate (already covered in depth by each feature's own `-safety.test.mjs`, e.g. `SignalAlreadyConvertedError`, `TradeIntentNotDraftError`, `PaperPositionAlreadyHasCloseReviewError`).

Client-submitted values are trusted only where already narrow and validated:
- `POST /api/capital/strategies/select` trusts only `strategyKey` (validated against the static Strategy Library; everything else re-derived).
- `POST /api/capital/trade-intents` (manual draft entry) trusts `symbol`/`side`/`quantity`/`notionalUsd`/`leverage`/`signalId`, each explicitly validated (`side` ∈ {buy, sell}; numeric fields must be finite and positive).
- Every other mutation route (`convert-to-draft`, `cancel-draft`, `submit-for-review`, `request-close-review`, `mark`, `mark-all`) reads no body at all — the only client input is the path id, and price/notional/P&L values are always derived server-side, never accepted from the client.

The legacy quick-close route (`POST /api/capital/paper-positions/[id]/close`) remains a disabled guard: POST-only, always returns 410, never mutates `paper_positions`/`audit_ledger`, and no user-facing component calls it (`paper-position-actions.tsx` explicitly documents that it never posts to this route). Already covered by `tests/aoc-capital-position-close-review-safety.test.mjs`; not duplicated here.

Pinned by `tests/aoc-capital-mvp-route-boundary.test.mjs`.

## Source-Chain Integrity

The chain — strategy/profile → `paper_signal_recommendation` → `trade_intent` draft → `trade_decision`/Risk Constitution review → `paper_position` → `paper_position_close_review` → `audit_ledger` evidence — is traceable only through stored ids, never through symbol matching:

- `strategy-performance-attribution-service.ts` resolves a trade intent's strategy source only when `intent.source === "signal_recommendation"` (set server-side only by the governed signal→draft handoff RPC) **and** `paper_signal_recommendation_id` resolves to a real signal row; otherwise it falls back to an explicit `UNLINKED_STRATEGY_KEY` sentinel. It is never inferred from `symbol`.
- **Noteworthy distinction confirmed during this review:** `trade_intents.source` has three possible values — `manual`, `signal`, and `signal_recommendation`. The manual trade-intent form (`POST /api/capital/trade-intents`) sets `source: "signal"` when the client supplies an optional `signalId`, but this is a client-supplied, unverified reference. Only `source: "signal_recommendation"` (set exclusively by the governed `create_draft_trade_intent_from_signal_and_audit` RPC) is trusted for strategy/signal attribution. This is correct, intentional behavior — not a gap — but is easy to misread as an inconsistency, so it's documented here explicitly.
- `signal-cohort-outcome-service.ts` groups cohorts by `deriveSignalCohortKey()` using `action`/`strategyKey`/`generated_at`, never by `symbol`.
- `closed-position-performance-service.ts` sets `sourceChainStatus` only via the same `source === "signal_recommendation"` + resolved-signal check, and groups by `sourceStrategyId` from that same chain, else an `UNLINKED_SOURCE_KEY` sentinel.
- `position-detail-service.ts` builds its lifecycle timeline from stored ids/relationships only.

Distinctions preserved throughout: a signal not converted to a draft is `notConvertedSignals` (**not_advanced**, never penalized) — not broken; a record with no resolvable upstream link is **unlinked/incomplete**; a closed position with no `close_review_id` is **historical** (pre-PR#17 shape) and remains readable but is never counted as complete.

Pinned by `tests/aoc-capital-mvp-source-chain-audit-consistency.test.mjs`.

## Audit Evidence

Close-governance completeness (`closed-position-performance-service.ts`, `strategy-performance-attribution-service.ts`, `signal-cohort-outcome-service.ts`) is computed identically in all three services from the exact same audit `event_type` filter: `["paper_position_close_review_approved", "paper_position_closed"]`. `deriveGovernanceEvidenceStatus()` returns `complete` only when all three markers (`hasCloseReviewId`, `hasApprovedAudit`, `hasClosedAudit`) are present, `missing` only when none are, and `partial` otherwise — verified directly via unit tests against the exported pure function, and never backfilled.

**Confirmed, not a bug:** `position-detail-service.ts`'s lifecycle *timeline display* treats the older, pre-PR#17 bare `position_closed` audit event as equivalent to `paper_position_closed` for the purpose of rendering a "position closed" row in the UI — but the three governance-completeness *scoring* services above never do this; a position with only a legacy `position_closed` event and no `paper_position_closed`/`paper_position_close_review_approved` will correctly be classified as `missing` or `partial`, not `complete`. These are two intentionally separate concerns (display vs. governance scoring) and were verified to stay separate.

Reporting services never write an audit event — every reporting service verified in this review only `.select()`s from `audit_ledger`. `portfolio-governance-snapshot-service.ts` additionally distinguishes `historicalChains`/`historical_closed_positions` (always `severity: "info"`, never penalized) from `unlinkedChains`/`closedPositionsMissingCloseReviewId`/`closedPositionsMissingCloseAudit` (`severity: "high"`/`"medium"` only when their count is greater than zero).

Pinned by `tests/aoc-capital-mvp-source-chain-audit-consistency.test.mjs`.

## Tenant & Portfolio Scoping

Every query against a portfolio-scoped table (`paper_positions`, `trade_intents`, `paper_signal_recommendations`, `paper_position_close_reviews`) in every capital `*-service.ts` file filters by both `.eq("company_id", companyId)` and `.eq("portfolio_id", portfolioId)`. Every query against a company-only-scoped table (`trade_decisions`, `audit_ledger`, `portfolios`, `risk_constitution_rules`, `capital_levels`, `portfolio_strategy_profiles` — none of which carry a `portfolio_id` column in this single-portfolio-per-company MVP) filters by `.eq("company_id", companyId)`. No capital API route accepts a client-supplied `companyId`/`portfolioId` override via body or query string.

This MVP's data model is single-portfolio-per-company: there is exactly one portfolio per company (`getOrCreateDefaultPortfolio`), so "portfolio scoping" in practice means every mutation route re-derives the one true `portfolioId` server-side from `companyId` rather than trusting a portfolio id supplied by the client.

Pinned by `tests/aoc-capital-mvp-scoping-boundary.test.mjs`.

## UI Copy Safety

Swept every `.tsx` file under `src/app/(protected)/capital` for affirmative forbidden copy (Execute, Place Order, Trade Now, Buy/Sell Now, Send to Broker, Connect Exchange, Fund account, Deposit/Withdraw as actions, Refresh Valuation, Recommended/Best strategy or signal, affirmative investment-advice claims, Real trading/Broker/Live execution/Execution ready). No affirmative hit was found; every "Broker"/"Withdraw"/"Deposit"/"Buy"/"Sell" occurrence found is either:
- a negation/safety-boundary statement ("No broker connected", "brokerConnected: false", "does not... place orders... or connect to brokers"),
- an internal trade-intent `side` value (`"buy"`/`"sell"`) for the manual draft-entry form, or
- the "withdraws the draft" phrasing on the cancel-draft button, which refers to withdrawing a draft trade intent from Risk Constitution review, not a funds withdrawal.

Only Position Detail renders a "Request Paper Close Review" action; no other page does. The capital layout shell and every governance-relevant page (Overview, Governance Snapshot, Market Data, Advisor, Demo) carry paper-only/simulation framing and reference broker-connection status.

Pinned by `tests/aoc-capital-mvp-ui-copy-safety.test.mjs`.

## Known Gaps / Non-Blocking Issues

1. **`GET /api/capital/paper-positions` refreshes marks on read.** This route calls `listPaperPositionsMarked()`, which mutates stored prices as a side effect of a GET. It is not one of the seven canonical read-only reporting routes, mirrors the already-established, intentional behavior of the "Paper Positions" list page (`src/app/(protected)/capital/positions/page.tsx`, which already has explicit Mark/Mark-All buttons and is not a "reporting" page), and is not currently called by any page or client (`fetch` search found no callers). Not fixed in this PR because it is orphaned and its behavior matches an already-intentional pattern elsewhere; flagged here so a future caller doesn't assume it's a pure read.
2. **`ensureCapitalLevels`/`ensureRiskConstitution` perform a one-time insert-if-missing seed** on otherwise-read routes (`GET /api/capital/capital-levels`, `GET /api/capital/risk-constitution`). This is a distinct, narrower pattern than the performance/portfolio-summary bug fixed in this PR: it never mutates existing rows, only seeds default static configuration once per company on first access (same shape as `getOrCreateDefaultPortfolio`, used throughout the read-only reporting layer without objection). Reviewed and judged acceptable; documented rather than changed.
3. **`unlinkedSignalCount` is hardcoded to `0`** in `portfolio-governance-snapshot-service.ts`'s `buildGovernanceGapRows()` call. Reviewed and confirmed intentional: a paper signal recommendation is the root of the source chain, so there is no upstream record for it to be "unlinked" from — the correct concept for an unconverted signal is `not_advanced` (tracked separately via `notConvertedSignals`), not `unlinked`. Not a bug.
4. **`GET /api/capital/performance` and `GET /api/capital/portfolio/summary` are legacy, string-boundary duplicates** of the newer canonical `Strategy Performance Attribution` (`/capital/performance/strategies`) and `Portfolio Overview` surfaces. Both remain live and nav-linked (`/capital/performance`, "Strategy Performance") and were hardened in this PR (see Route Inventory) rather than removed, since consolidating/removing a still-linked page is a product decision, not an audit-scope fix. Recommended as a follow-up (see below).

## Blockers

None found. The one accidental-mutation-on-read defect discovered (`/api/capital/performance` and `/api/capital/portfolio/summary` calling `markAllOpenPositions()` on GET) was surgical to fix and has been fixed and regression-tested in this PR.

## Follow-Up Recommendations

- Consider consolidating or removing the legacy `/capital/performance` ("Strategy Performance") page/route now that `/capital/performance/strategies` (Strategy Performance Attribution) supersedes it with governance/source-chain evidence the older page lacks — a navigation/product decision, out of scope for this audit PR.
- Consider removing the orphaned `GET /api/capital/paper-positions` and `GET /api/capital/portfolios` routes if confirmed unused, or wiring them to the same read-only, non-marking pattern as the canonical reporting routes if they are meant to stay.
- If PR review of this document is clean, proceed to PR #23 — AOC Capital MVP Polish & Navigation Consolidation, per the plan already agreed.

## Verification

Commands run in this repository, in this order, with results as observed:

```
npm install                                         # dependencies were not yet installed in this session; installed clean, 0 errors
npm run typecheck                                    # tsc --noEmit — passed, no errors
npm run lint                                         # 0 errors, 543 warnings (all pre-existing, none in files touched by this PR)
npm test                                              # tsx --test tests/*.test.mjs tests/*.test.ts — 9919 tests, 9919 pass, 0 fail
npm run build                                         # next build — succeeded; all /capital/** routes and /api/capital/** routes compiled
npx tsx --test tests/aoc-capital-mvp-*.test.mjs       # 58 tests, 58 pass, 0 fail (the 6 new hardening files added by this PR)
npx tsx --test tests/aoc-capital-*.test.mjs           # 1361 tests, 1361 pass, 0 fail (every existing + new AOC Capital test)
```

Safety grep (the exact command specified for this PR) was run against the full repo (`src app tests supabase docs`) and produced many hits, the large majority from unrelated products in this monorepo (this repo hosts far more than AOC Capital). Re-run scoped to the AOC Capital surface only (`src/app/(protected)/capital`, `src/app/api/capital`, `src/lib/capital`, `src/features/capital`, `src/lib/trading`, `src/lib/demo`, `tests/aoc-capital-*`, `supabase/migrations/*capital*`, `docs/capital`) and manually reviewed every hit against the narrower "dangerous" keyword subset (buy now, sell now, trade now, place order, send to broker, connect exchange, fund account, live/real trade, broker/execution ready, recommended/best strategy or signal): every hit was either a safety-test assertion, a forbidden-phrase allowlist (llm-guardrails.ts, per-feature `-safety.test.mjs` files), or negation/safety-boundary copy already reviewed under UI Copy Safety above. No affirmative violation found.

Nothing in this report was claimed without running the corresponding command in this session. `git status --short` was checked before and after test/build runs; two unrelated, auto-regenerated artifacts (`artifacts/vault-smoke-test-report.json`/`.md`, produced by an unrelated test in the wider test suite) were reverted and are not part of this PR's diff.
