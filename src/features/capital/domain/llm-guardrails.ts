// AOC Capital Strategy Playbook — LLM guardrails (v0.1).
//
// The LLM is only ever allowed to explain an already-generated, stored
// SimulationRecord — it must never be allowed to recommend a trade, invent a
// strategy, or imply real execution. This module is the last static checkpoint
// before any LLM-authored text reaches a user: every prohibited phrase here
// caught mid-sentence, case-insensitively, and independent of surrounding
// punctuation.

export const REQUIRED_DISCLOSURE =
  "This is an educational paper trading simulation and does not constitute investment advice.";

/**
 * Phrases that would turn an explanation into advice, a recommendation, a
 * promise, or an instruction to execute. Matched as case-insensitive
 * substrings so "You should buy," / "you SHOULD BUY" / "you should buy more"
 * all trip the same rule.
 */
export const PROHIBITED_PHRASES: string[] = [
  "you should buy",
  "you should sell",
  "i recommend buying",
  "i recommend selling",
  "best portfolio for you",
  "guaranteed return",
  "safe investment",
  "this will go up",
  "invest in",
  "buy",
  "sell",
  "execute",
  "place order",
  "live trade",
  "real trade",
  "send to broker",
  "connect exchange",
  "manage your money",
];

export type CapitalLLMOutputViolation = {
  phrase: string;
  index: number;
};

export type CapitalLLMOutputValidationResult = {
  valid: boolean;
  violations: CapitalLLMOutputViolation[];
};

/**
 * Scans LLM output for every prohibited phrase. Returns every match found
 * (not just the first) so callers can surface a complete violation report
 * rather than having to re-run validation after each fix.
 */
export function validateCapitalLLMOutput(output: string): CapitalLLMOutputValidationResult {
  const haystack = output.toLowerCase();
  const violations: CapitalLLMOutputViolation[] = [];

  for (const phrase of PROHIBITED_PHRASES) {
    let fromIndex = 0;
    for (;;) {
      const index = haystack.indexOf(phrase, fromIndex);
      if (index === -1) break;
      violations.push({ phrase, index });
      fromIndex = index + phrase.length;
    }
  }

  violations.sort((a, b) => a.index - b.index);

  return { valid: violations.length === 0, violations };
}

/**
 * Appends the required educational-simulation disclosure if it isn't already
 * present, so every path that renders LLM output can call this once at the
 * end without worrying about double-appending.
 */
export function appendRequiredDisclosure(output: string): string {
  const trimmed = output.trimEnd();
  if (trimmed.includes(REQUIRED_DISCLOSURE)) return trimmed;
  return `${trimmed}\n\n${REQUIRED_DISCLOSURE}`;
}
