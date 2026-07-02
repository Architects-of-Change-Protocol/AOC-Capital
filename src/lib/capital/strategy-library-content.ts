// Static copy for /capital/strategies — the Strategy Library page. Kept as
// plain data, mirroring command-center-content.ts, so product copy stays easy
// to review independent of the page component's JSX.

export const PAGE_TITLE = "Strategy Library";

export const PAGE_SUBTITLE = "Choose a paper-only strategy profile for AOC Capital to simulate, govern, and evaluate before any real capital is ever deployed.";

export const HEADER_EXPLAINER =
  "Strategies define the logic and constraints AOC Capital should consider during paper trading. They do not place real trades, connect to brokers, or unlock real execution.";

export const SELECTION_BEHAVIOR_DISCLOSURE =
  "Selecting a strategy stores your strategy context and shows how it aligns with the Risk Constitution. It does not automatically open a paper position or create a trade intent — every future paper trade still has to pass the Level 1 risk policy engine, and you take a separate, explicit action to submit one.";

export const CAPABILITY_GUARDRAILS_INTRO = "All strategies are simulation-only.";

export const CAPABILITY_GUARDRAILS: string[] = [
  "keeps real execution locked",
  "requires no broker connection",
  "requires no trading API keys",
  "cannot withdraw funds",
  "cannot route live orders",
  "remains governed by the Risk Constitution",
];

export const MARKET_DATA_DISCLOSURE =
  "Supported symbols are observed using paper-only market data when available. Market data is observation only. It does not imply execution.";

export const REAL_EXECUTION_LOCKED_DISCLOSURE =
  "Real execution stays locked for every strategy in this library, regardless of which one you select. There is no broker integration, no trading API keys, no withdrawals, and no live order routing anywhere in this product today. This is simulation and governance tooling, not financial advice, and no strategy here implies guaranteed profits.";

export const RISK_CONSTITUTION_ALIGNMENT_NOTE =
  "Strategy selection can only suggest tighter rules or the same Level 1 limits — it never widens max exposure, enables leverage or shorts, or loosens daily/weekly loss limits. The Risk Constitution itself is not changed automatically by selecting a strategy.";
