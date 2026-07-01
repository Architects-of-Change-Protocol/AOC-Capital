import type { VaultNutrientType } from "./types";

export const SIGNIFICANCE_THRESHOLD = 0.35;

const HIGH_INTENSITY_PATTERNS: RegExp[] = [
  /\bblocked\b/i,
  /\bescalat/i,
  /\boverdue\b/i,
  /\bunresolved\b/i,
  /\burgent\b/i,
  /\bcannot proceed\b/i,
  /\bno response\b/i,
  /\bnot (?:processed|received|approved|confirmed|responded)\b/i,
  /\bstalled\b/i,
  /\bstill\s+(?:pending|waiting|blocked)\b/i,
  /\b\d+\s+(?:days?|weeks?)\s+(?:overdue|without|waiting|since)\b/i,
  /\bpayment.{0,20}(?:not|delay|block)/i,
  /\bfailed?\b/i,
];

const LOW_VALUE_FILLER_PATTERNS: RegExp[] = [
  /\bfollowing up (?:with|on)\b/i,
  /^following up\b/i,
  /\breviewing (?:status|alignment|progress)\b/i,
  /\bmonitoring progress\b/i,
  /\balignment (?:discussion|session|meeting|call|achieved|confirmed)\b/i,
  /\bcoordination (?:ongoing|in progress|happening)\b/i,
  /\bsync (?:completed|done|scheduled)\b/i,
  /\bdiscussed internally\b/i,
  /\bno (?:major )?issues? to report\b/i,
  /\bteam meeting (?:completed|held|scheduled)\b/i,
];

export const STAKEHOLDER_PRESSURE_PATTERNS: RegExp[] = [
  /\bescalat/i,
  /\blosing (?:confidence|patience)\b/i,
  /\bwaiting (?:on|for)\b/i,
  /\bno response\b/i,
  /\bnot responding\b/i,
  /\bdelayed? (?:feedback|response|delivery|approval)\b/i,
  /\bdelay/i,
  /\bconcern/i,
  /\bfrustrat/i,
  /\bunresolved\b/i,
  /\bpending (?:approval|response|confirmation|sign)\b/i,
  /\bblock/i,
  /\brequesting (?:update|clarification|decision|escalation)\b/i,
  /\boverdue\b/i,
  /\bpressure\b/i,
  /\bapproval\b/i,
];

export function evaluateSignificance(
  line: string,
  nutrientType: VaultNutrientType,
  matchedPatternCount: number,
): { score: number; suppressed: boolean; reason: string | null } {
  // Stakeholder signal requires operational pressure co-indicator
  if (nutrientType === "stakeholder_signal") {
    const hasPressure = STAKEHOLDER_PRESSURE_PATTERNS.some((p) => p.test(line));
    if (!hasPressure) {
      return { score: 0, suppressed: true, reason: "stakeholder_bare_reference" };
    }
  }

  // Low-value filler suppressed unless accompanied by intensity signal
  const isLowValueFiller = LOW_VALUE_FILLER_PATTERNS.some((p) => p.test(line));
  if (isLowValueFiller) {
    const hasIntensity = HIGH_INTENSITY_PATTERNS.some((p) => p.test(line));
    if (!hasIntensity) {
      return { score: 0.1, suppressed: true, reason: "low_value_filler" };
    }
  }

  let score = 0.4;

  // Intensity boost
  const intensityMatches = HIGH_INTENSITY_PATTERNS.filter((p) => p.test(line)).length;
  score += Math.min(0.3, intensityMatches * 0.1);

  // Multi-pattern boost
  score += Math.min(0.15, (matchedPatternCount - 1) * 0.05);

  // Specificity boost: numbers/dates and document identifiers
  if (/\b\d+\s*(?:days?|weeks?|USD|EUR|\$|hours?|months?)\b/i.test(line)) score += 0.05;
  if (/\b(?:invoice|payment|PO|RMA|SLA|SN-|#[A-Z]{2}-?\d{4,})\b/i.test(line)) score += 0.05;

  if (isLowValueFiller) score -= 0.2;

  score = Math.round(Math.min(1.0, Math.max(0, score)) * 100) / 100;

  if (score < SIGNIFICANCE_THRESHOLD) {
    return { score, suppressed: true, reason: "below_significance_threshold" };
  }

  return { score, suppressed: false, reason: null };
}
