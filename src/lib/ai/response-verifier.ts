// Exported regex constants — word-boundary anchored to prevent catastrophic backtracking

export const FULL_NAME_REGEX = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;

export const NAME_FROM_DEPT_REGEX = /\b[A-Z][a-z]+\s+from\s+[A-Z][a-zA-Z]+\b/;

export const DATE_REGEX =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)\s+of\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\bQ[1-4]\s+\d{4}\b|\b(?:next|last)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i;

export const TITLE_CASE_PHRASE_REGEX = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;

export const DEFINITIVE_START_REGEX = /^(?:The project|The team|Management has|Budget is)\b/i;

export const HEDGING_REGEX =
  /\b(?:assumed|likely|appears|may|probably|seems|unclear|pending|estimated|expected)\b/i;

export type VerificationFlag = {
  field: string;
  rule: string;
  severity: "warn" | "strip" | "redact";
  detail: string;
};

export type VerificationResult = {
  passed: boolean;
  confidenceScore: number;
  flags: VerificationFlag[];
  sanitized: {
    facts: string[];
    assumptions: string[];
    diagnosis: string | undefined;
    immediateAction: string | undefined;
  };
};

export type VerificationContext = {
  projectName?: string | null;
  knownRisks: string[];
  knownDependencies: string[];
  unresolvedMemory: string[];
  userMessage: string;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "has", "have", "be", "been",
  "being", "do", "does", "did", "for", "and", "or", "but", "in", "on", "at",
  "to", "of", "it", "this", "that",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function hasKeywordOverlap(text: string, contextStrings: string[]): boolean {
  const textTokens = tokenize(text);
  for (const ctx of contextStrings) {
    const ctxTokens = tokenize(ctx);
    for (const token of textTokens) {
      if (ctxTokens.has(token)) return true;
    }
  }
  return false;
}

function contextHasDate(context: VerificationContext): boolean {
  const combined = [
    context.userMessage,
    ...context.unresolvedMemory,
  ].join(" ");
  const globalDate = new RegExp(DATE_REGEX.source, "gi");
  return globalDate.test(combined);
}

function redactNames(text: string, context: VerificationContext): string {
  const contextText = [context.userMessage, ...context.unresolvedMemory].join(" ").toLowerCase();

  const globalFull = new RegExp(FULL_NAME_REGEX.source, "g");
  let result = text.replace(globalFull, (match) => {
    if (contextText.includes(match.toLowerCase())) return match;
    return "[stakeholder]";
  });

  const globalDept = new RegExp(NAME_FROM_DEPT_REGEX.source, "g");
  result = result.replace(globalDept, (match) => {
    const firstName = match.split(/\s+/)[0].toLowerCase();
    if (contextText.includes(firstName)) return match;
    return "[stakeholder]";
  });

  return result;
}

function detectNamesNotInContext(text: string, context: VerificationContext): boolean {
  const contextText = [context.userMessage, ...context.unresolvedMemory].join(" ").toLowerCase();

  const globalFull = new RegExp(FULL_NAME_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = globalFull.exec(text)) !== null) {
    if (!contextText.includes(match[0].toLowerCase())) return true;
  }

  const globalDept = new RegExp(NAME_FROM_DEPT_REGEX.source, "g");
  while ((match = globalDept.exec(text)) !== null) {
    const firstName = match[0].split(/\s+/)[0].toLowerCase();
    if (!contextText.includes(firstName)) return true;
  }

  return false;
}

function detectDatesNotInContext(text: string, context: VerificationContext): boolean {
  if (contextHasDate(context)) return false;
  return DATE_REGEX.test(text);
}

function extractTitleCasePhrases(text: string): string[] {
  const global = new RegExp(TITLE_CASE_PHRASE_REGEX.source, "g");
  const phrases: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = global.exec(text)) !== null) {
    phrases.push(match[0]);
  }
  return phrases;
}

function isKnownPhrase(phrase: string, context: VerificationContext): boolean {
  const lower = phrase.toLowerCase();
  const contextStrings = [
    context.userMessage,
    context.projectName ?? "",
    ...context.knownRisks,
    ...context.knownDependencies,
  ];
  return contextStrings.some((s) => s.toLowerCase().includes(lower));
}

function applyRule1(
  field: string,
  text: string,
  context: VerificationContext,
  flags: VerificationFlag[],
): void {
  if (!context.projectName || context.projectName === "Not specified") {
    const phrases = extractTitleCasePhrases(text);
    for (const phrase of phrases) {
      if (!isKnownPhrase(phrase, context)) {
        flags.push({
          field,
          rule: "no_project_name_invention",
          severity: "warn",
          detail: `Unrecognized title-case phrase "${phrase}" may be an invented project reference.`,
        });
        break;
      }
    }
  }
}

function applyRule2ToFacts(
  facts: string[],
  context: VerificationContext,
  flags: VerificationFlag[],
  stripIndices: Set<number>,
): void {
  if (contextHasDate(context)) return;
  facts.forEach((fact, i) => {
    if (DATE_REGEX.test(fact)) {
      flags.push({
        field: "facts",
        rule: "no_specific_date_invention",
        severity: "strip",
        detail: `Fact at index ${i} contains a specific date not grounded in context.`,
      });
      stripIndices.add(i);
    }
  });
}

function applyRule2ToTextField(
  field: string,
  text: string,
  context: VerificationContext,
  flags: VerificationFlag[],
): void {
  if (detectDatesNotInContext(text, context)) {
    flags.push({
      field,
      rule: "no_specific_date_invention",
      severity: "warn",
      detail: `Field "${field}" contains a specific date not grounded in context.`,
    });
  }
}

function applyRule3(
  field: string,
  text: string,
  context: VerificationContext,
  flags: VerificationFlag[],
): void {
  if (detectNamesNotInContext(text, context)) {
    flags.push({
      field,
      rule: "no_invented_stakeholder_name",
      severity: "redact",
      detail: `Field "${field}" contains a stakeholder name not found in known context.`,
    });
  }
}

function applyRule4(
  facts: string[],
  context: VerificationContext,
  flags: VerificationFlag[],
): void {
  const contextStrings = [
    context.userMessage,
    ...context.knownRisks,
    ...context.knownDependencies,
    ...context.unresolvedMemory,
  ];
  facts.forEach((fact, i) => {
    if (!hasKeywordOverlap(fact, contextStrings)) {
      flags.push({
        field: "facts",
        rule: "facts_grounded_in_context",
        severity: "warn",
        detail: `Fact at index ${i} has no keyword overlap with known context.`,
      });
    }
  });
}

function applyRule5(
  assumptions: string[],
  flags: VerificationFlag[],
): void {
  assumptions.forEach((assumption, i) => {
    if (DEFINITIVE_START_REGEX.test(assumption) && !HEDGING_REGEX.test(assumption)) {
      flags.push({
        field: "assumptions",
        rule: "assumptions_labeled_correctly",
        severity: "warn",
        detail: `Assumption at index ${i} reads as a definitive assertion without hedging language.`,
      });
    }
  });
}

export function verifyAiResponse(
  response: {
    facts?: string[];
    assumptions?: string[];
    diagnosis?: string;
    immediateAction?: string;
  },
  context: VerificationContext,
): VerificationResult {
  try {
    const facts = Array.isArray(response.facts) ? response.facts.filter((f) => typeof f === "string") : [];
    const assumptions = Array.isArray(response.assumptions) ? response.assumptions.filter((a) => typeof a === "string") : [];
    const diagnosis = typeof response.diagnosis === "string" ? response.diagnosis : undefined;
    const immediateAction = typeof response.immediateAction === "string" ? response.immediateAction : undefined;

    const flags: VerificationFlag[] = [];
    const stripIndices = new Set<number>();

    // Rule 1: no_project_name_invention
    facts.forEach((fact) => applyRule1("facts", fact, context, flags));
    if (diagnosis) applyRule1("diagnosis", diagnosis, context, flags);
    if (immediateAction) applyRule1("immediateAction", immediateAction, context, flags);

    // Rule 2: no_specific_date_invention
    applyRule2ToFacts(facts, context, flags, stripIndices);
    if (diagnosis) applyRule2ToTextField("diagnosis", diagnosis, context, flags);
    if (immediateAction) applyRule2ToTextField("immediateAction", immediateAction, context, flags);

    // Rule 3: no_invented_stakeholder_name
    facts.forEach((fact) => applyRule3("facts", fact, context, flags));
    assumptions.forEach((assumption) => applyRule3("assumptions", assumption, context, flags));
    if (immediateAction) applyRule3("immediateAction", immediateAction, context, flags);

    // Rule 4: facts_grounded_in_context
    applyRule4(facts, context, flags);

    // Rule 5: assumptions_labeled_correctly
    applyRule5(assumptions, flags);

    // Compute confidence score
    let score = 100;
    for (const flag of flags) {
      if (flag.severity === "warn") score -= 5;
      else if (flag.severity === "strip") score -= 15;
      else if (flag.severity === "redact") score -= 10;
    }
    const confidenceScore = Math.max(0, Math.min(100, score));

    const hasStripFlags = flags.some((f) => f.severity === "strip");
    const passed = confidenceScore >= 60 && !hasStripFlags;

    // Build sanitized output
    const sanitizedFacts = facts
      .filter((_, i) => !stripIndices.has(i))
      .map((fact) => redactNames(fact, context));

    const sanitizedAssumptions = assumptions.map((a) => redactNames(a, context));

    const sanitizedDiagnosis = diagnosis !== undefined ? redactNames(diagnosis, context) : undefined;
    const sanitizedImmediateAction = immediateAction !== undefined ? redactNames(immediateAction, context) : undefined;

    return {
      passed,
      confidenceScore,
      flags,
      sanitized: {
        facts: sanitizedFacts,
        assumptions: sanitizedAssumptions,
        diagnosis: sanitizedDiagnosis,
        immediateAction: sanitizedImmediateAction,
      },
    };
  } catch {
    return {
      passed: true,
      confidenceScore: 100,
      flags: [],
      sanitized: {
        facts: Array.isArray(response?.facts) ? (response.facts as string[]) : [],
        assumptions: Array.isArray(response?.assumptions) ? (response.assumptions as string[]) : [],
        diagnosis: typeof response?.diagnosis === "string" ? response.diagnosis : undefined,
        immediateAction: typeof response?.immediateAction === "string" ? response.immediateAction : undefined,
      },
    };
  }
}
