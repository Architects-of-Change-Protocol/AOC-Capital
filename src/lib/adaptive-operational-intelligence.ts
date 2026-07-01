// Adaptive operational intelligence — deterministic pattern detection over historical records.
// No ML, no vector DB, no speculative inference. All patterns require grounded evidence
// from at least 2-3 OperationalMemoryRecord entries to qualify. Confidence scales with
// the number of corroborating records, not with heuristic guesses.

import type { OperationalMemoryRecord } from "@/lib/operational-memory";
import type { OperationalContradiction } from "@/lib/cross-signal-reasoning";

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdaptivePatternType =
  | "repeated_failure_cycle"
  | "escalation_trajectory"
  | "stakeholder_volatility"
  | "chronic_governance_gap"
  | "intervention_fatigue"
  | "recovery_pattern"
  | "pm_environment_pattern";

export type AdaptivePattern = {
  type: AdaptivePatternType;
  recurrenceCount: number;
  supportingFacts: string[];
  confidence: number; // 0–100; scales with corroborating evidence
  severityImpact: "increase" | "decrease" | "neutral";
  description: string;
};

export type AdaptiveAdjustmentDirection =
  | "increase_severity"
  | "decrease_severity"
  | "increase_confidence"
  | "decrease_confidence";

export type AdaptiveAdjustment = {
  type: AdaptivePatternType;
  direction: AdaptiveAdjustmentDirection;
  delta: number;
  reason: string;
};

export type PMEnvironmentStyle =
  | "fast_resolver"
  | "overloaded_coordinator"
  | "reactive_firefighter"
  | "governance_oriented"
  | "escalation_prone_environment";

export type AdaptiveOperationalProfile = {
  patterns: AdaptivePattern[];
  adaptiveAdjustments: AdaptiveAdjustment[];
  // Net bounded deltas ready to apply to base scores. Bounded ±30 to prevent runaway drift.
  adaptedSeverityDelta: number;
  adaptedConfidenceDelta: number;
  pmEnvironmentStyle: PMEnvironmentStyle | null;
  missingPersistenceNotes: string[];
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sortByTime(records: OperationalMemoryRecord[]): OperationalMemoryRecord[] {
  return [...records].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function hasFact(facts: string[], pattern: RegExp): boolean {
  return facts.some((f) => pattern.test(f));
}

// ─── A. Repeated failure cycle ────────────────────────────────────────────────
// Pattern: blocker appears → escalation follows → cycle repeats without resolution.
// Requires: ≥2 distinct delivery records with blockers AND ≥2 stakeholder records with
// escalation, where at least one escalation record post-dates the earliest blocker record.

export function detectRepeatedFailureCycles(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const deliverySorted = sortByTime(records.filter((r) => r.domain === "delivery_intelligence"));
  const stakeholderSorted = sortByTime(records.filter((r) => r.domain === "stakeholder_intelligence"));

  if (deliverySorted.length < 2 || stakeholderSorted.length < 2) return null;

  const blockerEpisodes = deliverySorted.filter((r) =>
    hasFact(r.extractedFacts, /blockers:|current_status:\s*blocked/i),
  );
  const escalationEpisodes = stakeholderSorted.filter((r) =>
    hasFact(r.extractedFacts, /escalation_behavior:\s*(escalating|threatening|patterned|accelerating)/i),
  );

  if (blockerEpisodes.length < 2 || escalationEpisodes.length < 2) return null;

  // Temporal sequence check: at least one escalation record post-dates earliest blocker record.
  const earliestBlockerMs = Date.parse(blockerEpisodes[0].createdAt);
  const hasTemporalSequence = escalationEpisodes.some((e) => Date.parse(e.createdAt) > earliestBlockerMs);
  if (!hasTemporalSequence) return null;

  const recurrenceCount = Math.min(blockerEpisodes.length, escalationEpisodes.length);
  // Confidence: base 45, +12 per confirmed cycle, capped at 82. More cycles = stronger evidence.
  const confidence = clamp(45 + recurrenceCount * 12);

  const supportingFacts = [
    ...blockerEpisodes
      .flatMap((r) => r.extractedFacts.filter((f) => /blockers:|current_status:\s*blocked/i.test(f)))
      .slice(0, 2),
    ...escalationEpisodes
      .flatMap((r) => r.extractedFacts.filter((f) => /escalation_behavior:/i.test(f)))
      .slice(0, 2),
  ];

  return {
    type: "repeated_failure_cycle",
    recurrenceCount,
    supportingFacts,
    confidence,
    severityImpact: "increase",
    description: `Blocker → escalation failure cycle observed across ${recurrenceCount} distinct operational records. Blockers are not resolving before escalation pressure rises.`,
  };
}

// ─── B. Escalation trajectory ─────────────────────────────────────────────────
// Pattern: escalation severity worsening across sequential stakeholder records.
// Requires: ≥2 stakeholder records where the final escalation ordinal > initial ordinal.

export function detectEscalationTrajectories(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const stakeholderSorted = sortByTime(records.filter((r) => r.domain === "stakeholder_intelligence"));
  if (stakeholderSorted.length < 2) return null;

  const escalationOrdinal = (facts: string[]): number => {
    if (hasFact(facts, /escalation_behavior:\s*accelerating/i)) return 4;
    if (hasFact(facts, /escalation_behavior:\s*threatening/i)) return 3;
    if (hasFact(facts, /escalation_behavior:\s*(escalating|patterned)/i)) return 2;
    if (hasFact(facts, /escalation_behavior:\s*reactive/i)) return 1;
    return 0;
  };

  const ordinals = stakeholderSorted.map((r) => escalationOrdinal(r.extractedFacts));
  const first = ordinals[0];
  const last = ordinals[ordinals.length - 1];

  if (last <= first) return null;

  const delta = last - first;
  const activeRecords = stakeholderSorted.filter((r) => escalationOrdinal(r.extractedFacts) > 0).length;
  // Confidence: base 40 + 10 per active escalation record + 8 per ordinal step climbed.
  const confidence = clamp(40 + activeRecords * 10 + delta * 8);

  const escalationFacts = stakeholderSorted
    .flatMap((r) => r.extractedFacts.filter((f) => /escalation_behavior:/i.test(f)))
    .slice(0, 3);

  const trajectoryLabels = ["none", "reactive", "patterned", "threatening", "accelerating"];

  return {
    type: "escalation_trajectory",
    recurrenceCount: activeRecords,
    supportingFacts: escalationFacts,
    confidence,
    severityImpact: "increase",
    description: `Escalation trajectory: ${trajectoryLabels[first] ?? "unknown"} → ${trajectoryLabels[last] ?? "unknown"} across ${stakeholderSorted.length} stakeholder records. Trend is worsening, not static.`,
  };
}

// ─── C. Stakeholder volatility ────────────────────────────────────────────────
// Pattern: stakeholder support signals oscillate between positive and negative across records.
// Requires: ≥2 stakeholder records showing both supported AND concerned/opposed signals.

export function detectStakeholderVolatility(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const stakeholderRecords = sortByTime(records.filter((r) => r.domain === "stakeholder_intelligence"));
  if (stakeholderRecords.length < 2) return null;

  const supportRecords = stakeholderRecords.filter((r) =>
    hasFact(r.extractedFacts, /support_level:\s*(supported|aligned|favorable)/i),
  );
  const oppositionRecords = stakeholderRecords.filter((r) =>
    hasFact(r.extractedFacts, /support_level:\s*(concerned|opposed|resistant)/i),
  );

  // Need at least one of each to establish oscillation
  if (supportRecords.length === 0 || oppositionRecords.length === 0) return null;

  const volatilityCount = supportRecords.length + oppositionRecords.length;
  // Base 30: two signals is minimum; each additional oscillation adds evidence.
  const confidence = clamp(30 + volatilityCount * 10);

  const supportFacts = supportRecords
    .flatMap((r) => r.extractedFacts.filter((f) => /support_level:/i.test(f)))
    .slice(0, 1);
  const opposeFacts = oppositionRecords
    .flatMap((r) => r.extractedFacts.filter((f) => /support_level:/i.test(f)))
    .slice(0, 1);
  const nameFacts = stakeholderRecords
    .flatMap((r) => r.extractedFacts.filter((f) => /stakeholder_name:|stakeholder:/i.test(f)))
    .slice(0, 2);

  return {
    type: "stakeholder_volatility",
    recurrenceCount: volatilityCount,
    supportingFacts: [...supportFacts, ...opposeFacts, ...nameFacts],
    confidence,
    severityImpact: "increase",
    description: `Stakeholder alignment is oscillating — ${supportRecords.length} record${supportRecords.length !== 1 ? "s" : ""} show support, ${oppositionRecords.length} show opposition. Stable alignment cannot be assumed.`,
  };
}

// ─── D. Chronic governance gap ────────────────────────────────────────────────
// Pattern: governance fields missing or incomplete across multiple records — structural,
// not incidental. Requires: ≥2 pmo_governance records with completionScore <60 or
// missingFields >2, and at least one field missing in ≥2 records.

export function detectChronicGovernanceGaps(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const govRecords = sortByTime(records.filter((r) => r.domain === "pmo_governance"));
  if (govRecords.length < 2) return null;

  const incompleteRecords = govRecords.filter(
    (r) => r.completionScore < 60 || r.missingFields.length > 2,
  );
  if (incompleteRecords.length < 2) return null;

  // Identify fields missing in ≥2 records — those are structural, not one-off gaps.
  const fieldMissingCounts = new Map<string, number>();
  for (const r of govRecords) {
    for (const field of r.missingFields) {
      fieldMissingCounts.set(field, (fieldMissingCounts.get(field) ?? 0) + 1);
    }
  }
  const chronicFields = [...fieldMissingCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([field]) => field);

  if (chronicFields.length === 0 && incompleteRecords.length < 3) return null;

  const recurrenceCount = incompleteRecords.length;
  // Confidence: base 40, +12 per incomplete record confirming the pattern.
  const confidence = clamp(40 + recurrenceCount * 12);

  const supportingFacts =
    chronicFields.length > 0
      ? [`Chronically missing: ${chronicFields.slice(0, 4).join(", ")}`]
      : [`${incompleteRecords.length} governance records below completion threshold`];

  return {
    type: "chronic_governance_gap",
    recurrenceCount,
    supportingFacts,
    confidence,
    severityImpact: "increase",
    description:
      chronicFields.length > 0
        ? `Chronic governance gap: fields [${chronicFields.slice(0, 3).join(", ")}] missing across ${recurrenceCount} governance records — structural accountability deficit, not incidental.`
        : `Governance completeness is consistently low across ${recurrenceCount} records — structural accountability gap.`,
  };
}

// ─── E. Intervention fatigue ──────────────────────────────────────────────────
// Pattern: same adverse operational signal appearing in ≥3 records without improvement.
// Since no intervention outcome table exists, fatigue is inferred from signal persistence.
// Future enhancement: persist intervention outcomes for precise fatigue detection.

export function detectInterventionFatigue(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const sorted = sortByTime(records);
  if (sorted.length < 3) return null;

  const adverseSignalDefs = [
    { pattern: /escalation_behavior:\s*(escalating|threatening|patterned|accelerating)/i, label: "persistent escalation" },
    { pattern: /blockers:/i, label: "persistent blockers" },
    { pattern: /delivery_confidence:\s*(at_risk|critical)/i, label: "persistent delivery risk" },
    { pattern: /fatigue_risk:\s*(medium|high)/i, label: "persistent PM fatigue" },
  ];

  const improvementPattern = /status:\s*(resolved|improving|closed)|delivery_confidence:\s*(on_track|improving)/i;
  const lastThree = sorted.slice(-3);

  const fatiguedSignals: string[] = [];
  let maxRecurrenceCount = 0;

  for (const { pattern, label } of adverseSignalDefs) {
    const matchingCount = sorted.filter((r) => hasFact(r.extractedFacts, pattern)).length;
    if (matchingCount < 3) continue;
    // Fatigue only if the most recent 3 records show no improvement alongside the signal
    const recentImprovement = lastThree.some((r) => hasFact(r.extractedFacts, improvementPattern));
    if (!recentImprovement) {
      fatiguedSignals.push(`${label} (${matchingCount} records, no improvement detected)`);
      maxRecurrenceCount = Math.max(maxRecurrenceCount, matchingCount);
    }
  }

  if (fatiguedSignals.length === 0) return null;

  // Confidence: base 40, +8 per recurrence beyond threshold minimum of 3.
  const confidence = clamp(40 + (maxRecurrenceCount - 3) * 8);

  return {
    type: "intervention_fatigue",
    recurrenceCount: maxRecurrenceCount,
    supportingFacts: fatiguedSignals,
    confidence,
    severityImpact: "neutral",
    description: `Intervention fatigue: ${fatiguedSignals.join("; ")}. Repeated operational responses appear not to have resolved the underlying signal.`,
  };
}

// ─── F. Recovery pattern ──────────────────────────────────────────────────────
// Pattern: adverse signals decreasing in later records vs. earlier records, indicating
// genuine improvement. Requires ≥3 records to establish a meaningful before/after split.

export function detectRecoveryPatterns(records: OperationalMemoryRecord[]): AdaptivePattern | null {
  const sorted = sortByTime(records);
  if (sorted.length < 3) return null;

  const midpoint = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, midpoint);
  const later = sorted.slice(midpoint);

  const adversePattern = /escalation_behavior:\s*(escalating|threatening|patterned|accelerating)|blockers:|delivery_confidence:\s*(at_risk|critical)/i;

  const adverseInEarlier = earlier.flatMap((r) => r.extractedFacts).filter((f) => adversePattern.test(f)).length;
  const adverseInLater = later.flatMap((r) => r.extractedFacts).filter((f) => adversePattern.test(f)).length;

  const avgEarlierConf = earlier.reduce((sum, r) => sum + r.confidenceScore, 0) / earlier.length;
  const avgLaterConf = later.reduce((sum, r) => sum + r.confidenceScore, 0) / later.length;

  const adverseDecreased = adverseInLater < adverseInEarlier;
  // 5-point threshold avoids noise from minor score fluctuations.
  const confidenceImproved = avgLaterConf > avgEarlierConf + 5;

  if (!adverseDecreased && !confidenceImproved) return null;

  const recoverySignals: string[] = [];
  if (adverseDecreased) {
    recoverySignals.push(`adverse signal count reduced from ${adverseInEarlier} to ${adverseInLater}`);
  }
  if (confidenceImproved) {
    recoverySignals.push(`avg confidence improved from ${Math.round(avgEarlierConf)} to ${Math.round(avgLaterConf)}`);
  }

  const resolutionPattern = /status:\s*(resolved|closed|completed)|delivery_confidence:\s*(on_track|stable)/i;
  const explicitResolutions = later.flatMap((r) => r.extractedFacts).filter((f) => resolutionPattern.test(f)).length;
  if (explicitResolutions > 0) {
    recoverySignals.push(`${explicitResolutions} explicit resolution signal${explicitResolutions !== 1 ? "s" : ""} in recent records`);
  }

  // Base 35 + 12 per recovery signal + 10 bonus when both adverse decrease AND confidence improve.
  const confidence = clamp(35 + recoverySignals.length * 12 + (adverseDecreased && confidenceImproved ? 10 : 0));

  return {
    type: "recovery_pattern",
    recurrenceCount: recoverySignals.length,
    supportingFacts: recoverySignals,
    confidence,
    severityImpact: "decrease",
    description: `Recovery pattern detected: ${recoverySignals.join("; ")}. Situation appears to be improving — monitor before de-escalating.`,
  };
}

// ─── G. PM environment style ──────────────────────────────────────────────────
// Infers the operational environment style from team_health, delivery, stakeholder, and
// governance record patterns. Only infers when ≥3 total records exist for grounding.

export function detectPMEnvironmentStyle(records: OperationalMemoryRecord[]): PMEnvironmentStyle | null {
  const teamRecords = records.filter((r) => r.domain === "team_health");
  const deliveryRecords = records.filter((r) => r.domain === "delivery_intelligence");
  const stakeholderRecords = records.filter((r) => r.domain === "stakeholder_intelligence");
  const govRecords = records.filter((r) => r.domain === "pmo_governance");

  if (teamRecords.length + deliveryRecords.length < 3) return null;

  const overloadCount = teamRecords.filter((r) =>
    hasFact(r.extractedFacts, /workload_level:\s*(high|critical)|overload_signals:|fatigue_risk:\s*high/i),
  ).length;
  const fatigueCount = teamRecords.filter((r) =>
    hasFact(r.extractedFacts, /fatigue_risk:\s*(medium|high)|after_hours_activity:\s*detected/i),
  ).length;
  const escalationCount = stakeholderRecords.filter((r) =>
    hasFact(r.extractedFacts, /escalation_behavior:\s*(patterned|accelerating|escalating)/i),
  ).length;
  const govHighCompletion = govRecords.filter((r) => r.completionScore >= 70).length;
  const deliveryResolved = deliveryRecords.filter((r) =>
    hasFact(r.extractedFacts, /delivery_confidence:\s*on_track|current_status:\s*(on_track|completed)/i),
  ).length;

  // Priority order: most specific/severe patterns first.
  if (overloadCount >= 2 && fatigueCount >= 2) return "overloaded_coordinator";
  if (fatigueCount >= 2 && escalationCount >= 2) return "reactive_firefighter";
  if (escalationCount >= 3) return "escalation_prone_environment";
  if (govHighCompletion >= 3 && deliveryResolved >= 2) return "governance_oriented";
  if (deliveryResolved >= 3 && overloadCount === 0) return "fast_resolver";

  return null;
}

// ─── Adaptive severity utility ────────────────────────────────────────────────
// Applies pattern-derived adjustments to a base severity score.
// Each increase is evidence-bounded; total net adjustment capped at ±30.

export function computeAdaptiveSeverity(
  baseSeverity: number,
  patterns: AdaptivePattern[],
): { adjusted: number; adjustments: AdaptiveAdjustment[] } {
  const adjustments: AdaptiveAdjustment[] = [];
  let delta = 0;

  for (const pattern of patterns) {
    if (pattern.confidence < 40) continue;

    switch (pattern.type) {
      case "repeated_failure_cycle": {
        // 8 per confirmed cycle, max +24 (3 cycles). More cycles = more severity.
        const d = Math.min(24, pattern.recurrenceCount * 8);
        adjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: `Blocker + escalation pattern observed across ${pattern.recurrenceCount} records` });
        delta += d;
        break;
      }
      case "escalation_trajectory": {
        // 5 per record showing escalation, max +15.
        const d = Math.min(15, pattern.recurrenceCount * 5);
        adjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: `Escalation trajectory worsening across ${pattern.recurrenceCount} records` });
        delta += d;
        break;
      }
      case "stakeholder_volatility": {
        // 3 per oscillating signal, max +10.
        const d = Math.min(10, pattern.recurrenceCount * 3);
        adjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: `Stakeholder alignment oscillating across ${pattern.recurrenceCount} signal records` });
        delta += d;
        break;
      }
      case "chronic_governance_gap": {
        // 4 per incomplete governance record, max +12.
        const d = Math.min(12, pattern.recurrenceCount * 4);
        adjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: `Governance gaps recurring across ${pattern.recurrenceCount} records — structural accountability deficit` });
        delta += d;
        break;
      }
      case "recovery_pattern": {
        // Recovery reduces severity; 5 per recovery signal, max -15.
        const d = Math.min(15, pattern.recurrenceCount * 5);
        adjustments.push({ type: pattern.type, direction: "decrease_severity", delta: d, reason: `Recovery signals detected across ${pattern.recurrenceCount} dimensions — situation appears improving` });
        delta -= d;
        break;
      }
      case "intervention_fatigue": {
        // Fatigue = issue is persistent; small severity increase to prevent underweighting.
        adjustments.push({ type: pattern.type, direction: "increase_severity", delta: 5, reason: `Repeated adverse signals without measurable improvement — underlying issue is persistent` });
        delta += 5;
        break;
      }
    }
  }

  const boundedDelta = Math.max(-30, Math.min(30, delta));
  return { adjusted: clamp(baseSeverity + boundedDelta), adjustments };
}

// ─── Adaptive confidence utility ──────────────────────────────────────────────
// Adjusts a base confidence score based on contradictions and adaptive patterns.
// Corroboration increases confidence; volatility and fatigue decrease it.

export function computeAdaptiveConfidence(
  baseConfidence: number,
  contradictions: OperationalContradiction[],
  patterns: AdaptivePattern[],
): { adjusted: number; adjustments: AdaptiveAdjustment[] } {
  const adjustments: AdaptiveAdjustment[] = [];
  let delta = 0;

  if (contradictions.length >= 1) {
    // 7 per contradiction, max -20. Contradictions strongly undermine confidence.
    const d = Math.min(20, contradictions.length * 7);
    adjustments.push({ type: "repeated_failure_cycle", direction: "decrease_confidence", delta: d, reason: `${contradictions.length} operational contradiction${contradictions.length !== 1 ? "s" : ""} reduce cross-domain coherence` });
    delta -= d;
  }

  for (const pattern of patterns) {
    switch (pattern.type) {
      case "repeated_failure_cycle": {
        if (pattern.recurrenceCount >= 3) {
          adjustments.push({ type: pattern.type, direction: "increase_confidence", delta: 8, reason: `Failure cycle corroborated across ${pattern.recurrenceCount} records` });
          delta += 8;
        }
        break;
      }
      case "recovery_pattern": {
        if (pattern.recurrenceCount >= 2 && pattern.confidence >= 50) {
          adjustments.push({ type: pattern.type, direction: "increase_confidence", delta: 6, reason: `Recovery pattern corroborated by ${pattern.recurrenceCount} independent signals` });
          delta += 6;
        }
        break;
      }
      case "stakeholder_volatility": {
        // Oscillating signals make directional conclusions unreliable.
        adjustments.push({ type: pattern.type, direction: "decrease_confidence", delta: 6, reason: `Volatile stakeholder signals make directional assessment unreliable` });
        delta -= 6;
        break;
      }
      case "intervention_fatigue": {
        adjustments.push({ type: pattern.type, direction: "decrease_confidence", delta: 5, reason: `Intervention effectiveness uncertain given repeated recurrence without resolution` });
        delta -= 5;
        break;
      }
    }
  }

  const boundedDelta = Math.max(-30, Math.min(30, delta));
  return { adjusted: clamp(baseConfidence + boundedDelta), adjustments };
}

// ─── Build adaptive operational profile ──────────────────────────────────────

export function buildAdaptiveOperationalProfile(records: OperationalMemoryRecord[]): AdaptiveOperationalProfile {
  if (records.length < 2) {
    return {
      patterns: [],
      adaptiveAdjustments: [],
      adaptedSeverityDelta: 0,
      adaptedConfidenceDelta: 0,
      pmEnvironmentStyle: null,
      missingPersistenceNotes: [
        "Insufficient record history for adaptive pattern detection (minimum 2 records required).",
        "Future enhancement: persist intervention outcomes to enable fatigue detection without signal inference.",
      ],
    };
  }

  const patterns: AdaptivePattern[] = [
    detectRepeatedFailureCycles(records),
    detectEscalationTrajectories(records),
    detectStakeholderVolatility(records),
    detectChronicGovernanceGaps(records),
    detectInterventionFatigue(records),
    detectRecoveryPatterns(records),
  ].filter((p): p is AdaptivePattern => p !== null);

  const pmEnvironmentStyle = detectPMEnvironmentStyle(records);

  const adaptiveAdjustments: AdaptiveAdjustment[] = [];
  let severityDelta = 0;
  let confidenceDelta = 0;

  for (const pattern of patterns) {
    if (pattern.confidence < 40) continue;

    switch (pattern.type) {
      case "repeated_failure_cycle": {
        const d = Math.min(24, pattern.recurrenceCount * 8);
        severityDelta += d;
        adaptiveAdjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: pattern.description });
        if (pattern.recurrenceCount >= 3) {
          confidenceDelta += 8;
          adaptiveAdjustments.push({ type: pattern.type, direction: "increase_confidence", delta: 8, reason: `Failure cycle corroborated across ${pattern.recurrenceCount} records` });
        }
        break;
      }
      case "escalation_trajectory": {
        const d = Math.min(15, pattern.recurrenceCount * 5);
        severityDelta += d;
        adaptiveAdjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: pattern.description });
        break;
      }
      case "stakeholder_volatility": {
        const d = Math.min(10, pattern.recurrenceCount * 3);
        severityDelta += d;
        confidenceDelta -= 6;
        adaptiveAdjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: pattern.description });
        adaptiveAdjustments.push({ type: pattern.type, direction: "decrease_confidence", delta: 6, reason: `Volatile stakeholder signals make directional assessment unreliable` });
        break;
      }
      case "chronic_governance_gap": {
        const d = Math.min(12, pattern.recurrenceCount * 4);
        severityDelta += d;
        adaptiveAdjustments.push({ type: pattern.type, direction: "increase_severity", delta: d, reason: pattern.description });
        break;
      }
      case "recovery_pattern": {
        const d = Math.min(15, pattern.recurrenceCount * 5);
        severityDelta -= d;
        adaptiveAdjustments.push({ type: pattern.type, direction: "decrease_severity", delta: d, reason: pattern.description });
        if (pattern.recurrenceCount >= 2 && pattern.confidence >= 50) {
          confidenceDelta += 6;
          adaptiveAdjustments.push({ type: pattern.type, direction: "increase_confidence", delta: 6, reason: `Recovery corroborated by ${pattern.recurrenceCount} independent signals` });
        }
        break;
      }
      case "intervention_fatigue": {
        severityDelta += 5;
        confidenceDelta -= 5;
        adaptiveAdjustments.push({ type: pattern.type, direction: "increase_severity", delta: 5, reason: pattern.description });
        adaptiveAdjustments.push({ type: pattern.type, direction: "decrease_confidence", delta: 5, reason: `Intervention effectiveness uncertain given repeated recurrence` });
        break;
      }
    }
  }

  return {
    patterns,
    adaptiveAdjustments,
    // Bounded ±30: no single adaptive pass should swing scores more than 30 points.
    adaptedSeverityDelta: Math.max(-30, Math.min(30, severityDelta)),
    adaptedConfidenceDelta: Math.max(-30, Math.min(30, confidenceDelta)),
    pmEnvironmentStyle,
    missingPersistenceNotes: [
      "Future enhancement: persist intervention outcomes to improve fatigue signal accuracy beyond signal-persistence inference.",
      "Future enhancement: persist per-stakeholder sentiment history snapshots for fine-grained volatility tracking.",
    ],
  };
}
