// Static copy for /capital/signals — the Signal Engine page. Kept as plain
// data, mirroring command-center-content.ts and strategy-library-content.ts,
// so product copy stays easy to review independent of the page component's
// JSX.

export const PAGE_TITLE = "Signal Engine";

export const PAGE_SUBTITLE = "Generate paper-only strategy signals from your selected strategy, observed market data, portfolio state, and Risk Constitution.";

export const HEADER_EXPLAINER =
  "AOC Capital would consider these paper-only recommendations inside simulation. Signals help you understand what the selected strategy, observed prices, portfolio state, and the Risk Constitution imply right now — they never act on your behalf.";

export const SIGNAL_STRENGTH_DISCLOSURE =
  "Signal strength reflects paper-strategy alignment only. It is not financial advice and does not authorize real execution.";

export const SAFETY_DISCLOSURE =
  "Signals are recommendations for paper simulation only. They do not create trade intents, open positions, place orders, connect to brokers, or enable real execution.";

export const NO_STRATEGY_SELECTED_TITLE = "Select a strategy first.";

export const NO_STRATEGY_SELECTED_BODY = "AOC Capital needs a paper-only strategy profile before generating signals.";

export const STALE_STRATEGY_TITLE = "Previously selected strategy unavailable.";

export const STALE_STRATEGY_BODY = "Choose a current paper-only strategy before generating signals.";

export const CHOOSE_STRATEGY_CTA_LABEL = "Choose Strategy";

export const CHOOSE_STRATEGY_HREF = "/capital/strategies";

export const GUIDING_SENTENCE = "Signals recommend. Governance decides. Humans confirm. Real execution remains locked.";

export const NO_STRATEGY_SELECTED_GENERATE_HINT =
  "Generating signals from the Strategy Library is available once a strategy is selected — it never happens automatically.";
