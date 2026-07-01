import type { VaultNutrientType } from "./types";
import { evaluateSignificance } from "./significance";

export type NutrientCandidate = {
  nutrientType: VaultNutrientType;
  summary: string;
  excerpt: string;
  matchedPattern: string;
  confidence: number; // 0..1
  significanceScore: number;
  suppressed: boolean;
  suppressionReason: string | null;
};

type NutrientRule = {
  nutrientType: VaultNutrientType;
  patterns: RegExp[];
  confidenceBoost?: number;
};

const NUTRIENT_RULES: NutrientRule[] = [
  {
    nutrientType: "risk_signal",
    patterns: [
      /\brisk\b/i,
      /\bat risk\b/i,
      /\bthreat\b/i,
      /\bmay impact\b/i,
      /\bexposure\b/i,
      /\bvulnerable\b/i,
    ],
  },
  {
    nutrientType: "blocker_signal",
    patterns: [
      /\bblocker\b/i,
      /\bblocked\b/i,
      /\bcannot proceed\b/i,
      /\bblocking\s+(?:us|the|delivery|progress)\b/i,
      /\bstalled\b/i,
      /\bimpasse\b/i,
    ],
    confidenceBoost: 0.1,
  },
  {
    nutrientType: "stakeholder_signal",
    patterns: [
      /\bstakeholder\b/i,
      /\bsponsor\b/i,
      /\bclient\b/i,
      /\bexecutive\b/i,
      /\bvendor\b/i,
      /\blosing (?:confidence|patience)\b/i,
    ],
  },
  {
    nutrientType: "dependency_signal",
    patterns: [
      /\bdependency\b/i,
      /\bdepends on\b/i,
      /\bwaiting (?:on|for)\b/i,
      /\bblocked by\b/i,
      /\bpending from\b/i,
    ],
  },
  {
    nutrientType: "decision_signal",
    patterns: [
      /\bdecision\b/i,
      /\bdecided\b/i,
      /\bsigned off\b/i,
      /\bwe agreed\b/i,
      /\bdetermination\b/i,
    ],
  },
  {
    nutrientType: "commitment_signal",
    patterns: [
      /\bcommit(?:ment|ted)?\b/i,
      /\bpromise[ds]?\b/i,
      /\bpledged?\b/i,
      /\bsla\b/i,
      /\bguarantee[ds]?\b/i,
    ],
  },
  {
    nutrientType: "delivery_drift_signal",
    patterns: [
      /\bslip(?:ping|ped)?\b/i,
      /\bdelay(?:ed|ing)?\b/i,
      /\bbehind schedule\b/i,
      /\blate delivery\b/i,
      /\boverrun\b/i,
      /\bmissed (?:deadline|milestone)\b/i,
    ],
    confidenceBoost: 0.1,
  },
  {
    nutrientType: "financial_impediment_signal",
    patterns: [
      /\bbudget\b/i,
      /\bfunding\b/i,
      /\bcost overrun\b/i,
      /\bover budget\b/i,
      /\bfinancial\b/i,
      /\$[\d,]+/,
    ],
  },
  {
    nutrientType: "governance_gap_signal",
    patterns: [
      /\bgovernance\b/i,
      /\baudit\b/i,
      /\bcompliance\b/i,
      /\bapproval\s+(?:missing|needed|required|blocked)\b/i,
      /\bno\s+(?:owner|decision maker|sign-?off)\b/i,
    ],
  },
  {
    nutrientType: "escalation_signal",
    patterns: [
      /\bescalat/i,
      /\braised to\b/i,
      /\bexecutive review\b/i,
      /\bexecutive attention\b/i,
    ],
    confidenceBoost: 0.1,
  },
  {
    nutrientType: "recovery_signal",
    patterns: [
      /\brecovered?\b/i,
      /\bresolved\b/i,
      /\bback on track\b/i,
      /\bmitigated?\b/i,
      /\bworkaround\b/i,
    ],
  },
  {
    nutrientType: "ambiguity_signal",
    patterns: [
      /\bunclear\b/i,
      /\bunknown\b/i,
      /\bopen question\b/i,
      /\bpending decision\b/i,
      /\bnot yet decided\b/i,
      /\btbd\b/i,
    ],
  },
  {
    nutrientType: "contradiction_signal",
    patterns: [
      /\bcontradicts?\b/i,
      /\bconflicts? with\b/i,
      /\bchanged their (?:mind|position|decision)\b/i,
      /\bno longer\b/i,
    ],
  },
  {
    nutrientType: "timeline_pressure_signal",
    patterns: [
      /\bdeadline\b/i,
      /\bdue (?:by|on|date)\b/i,
      /\bby (?:end of|close of|COB|EOD|EOW|EOM)\b/i,
      /\btime(?:line)? pressure\b/i,
      /\bcrunch\b/i,
      /\bimminent\b/i,
      /\burgent\b/i,
    ],
  },
];

/**
 * Extract nutrient candidates from lines, returning ALL candidates including
 * suppressed ones (marked with suppressed: true). The pipeline filters active
 * candidates and counts suppressions separately.
 */
export function extractNutrientCandidates(lines: string[]): NutrientCandidate[] {
  const candidates: NutrientCandidate[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 20) continue;

    const isResolved = /\b(resolved|closed|completed|done|fixed|addressed|no longer blocking)\b/i.test(line);

    for (const { nutrientType, patterns, confidenceBoost } of NUTRIENT_RULES) {
      const matched = patterns.filter((p) => p.test(line));
      if (matched.length === 0) continue;

      const key = `${nutrientType}:${line.slice(0, 60).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let confidence = 0.6 + (confidenceBoost ?? 0) + Math.min(0.1, matched.length * 0.05);
      if (isResolved && nutrientType !== "recovery_signal") confidence *= 0.5;
      if (isResolved && nutrientType === "recovery_signal") confidence = Math.min(0.9, confidence + 0.15);
      confidence = Math.round(Math.min(0.95, confidence) * 100) / 100;

      const sig = evaluateSignificance(line, nutrientType, matched.length);

      candidates.push({
        nutrientType,
        summary: line.slice(0, 300),
        excerpt: line.slice(0, 200),
        matchedPattern: matched[0].toString(),
        confidence,
        significanceScore: sig.score,
        suppressed: sig.suppressed,
        suppressionReason: sig.reason,
      });
    }
  }

  return candidates;
}
