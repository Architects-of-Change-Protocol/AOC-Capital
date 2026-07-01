/**
 * Deterministic pattern promotion rules.
 *
 * Each rule evaluates a SignalGroup and returns a PromotionCandidate if the
 * group's recurrence profile meets the promotion threshold. Rules are
 * ordered — first match wins per group.
 *
 * Promotion thresholds are conservative by design: every pattern must have
 * clear, repeated evidence from multiple digestion runs before being promoted.
 */

import type { VaultNutrient, VaultSemanticResidue } from "../digestive/types";
import type { SignalGroup } from "./recurrence-engine";
import type {
  LearnedPatternType,
  PatternPromotionReason,
  PatternSeverity,
  PatternStatus,
  PatternTrajectory,
  PatternRecurrenceProfile,
} from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PromotionCandidate = {
  patternType: LearnedPatternType;
  promotionReason: PatternPromotionReason;
  title: string;
  summary: string;
  severity: PatternSeverity;
  status: PatternStatus;
  trajectory: PatternTrajectory;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function highestSeverity(severities: string[]): PatternSeverity {
  if (severities.includes("critical")) return "critical";
  if (severities.includes("high")) return "high";
  if (severities.includes("medium")) return "medium";
  return "low";
}

function computeStatus(
  group: SignalGroup,
): PatternStatus {
  const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
  if (totalOccurrences >= 5 && distinctDigestionRuns >= 4) return "chronic";
  if (totalOccurrences >= 3 && distinctDigestionRuns >= 2) return "confirmed";
  return "emerging";
}

function computeTrajectory(group: SignalGroup): PatternTrajectory {
  const sigs = [...group.signals].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  if (sigs.length < 2) return "unknown";

  const rank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const midpoint = Math.ceil(sigs.length / 2);
  const firstHalf = sigs.slice(0, midpoint);
  const secondHalf = sigs.slice(midpoint);

  const avgFirst =
    firstHalf.reduce((s, x) => s + (rank[x.severity] ?? 2), 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((s, x) => s + (rank[x.severity] ?? 2), 0) / secondHalf.length;

  if (avgSecond > avgFirst + 0.5) return "increasing";
  if (avgFirst > avgSecond + 0.5) return "decreasing";
  if (sigs.length >= 4) {
    // Check for intermittent: alternating high/low severity
    const severityValues = sigs.map((s) => rank[s.severity] ?? 2);
    let alternations = 0;
    for (let i = 1; i < severityValues.length; i++) {
      if (Math.abs(severityValues[i] - severityValues[i - 1]) >= 1) alternations++;
    }
    if (alternations >= Math.floor(sigs.length / 2)) return "intermittent";
  }
  return "stable";
}

function topSignalSummary(group: SignalGroup): string {
  return [...group.signals]
    .sort((a, b) => b.confidence - a.confidence)[0]
    ?.summary?.slice(0, 100) ?? "unknown";
}

// ─── Promotion Rules ──────────────────────────────────────────────────────────

type PromotionRule = {
  patternType: LearnedPatternType;
  evaluate: (group: SignalGroup) => PromotionCandidate | null;
};

const RULES: PromotionRule[] = [
  // A. Recurring Blocker Pattern
  {
    patternType: "recurring_blocker_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "blocker_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 3 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      if (severity === "low") return null;
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "recurring_blocker_pattern",
        promotionReason: "repeated_blocker_threshold_met",
        title: `Recurring Blocker: ${top}`,
        summary: `A blocker has recurred ${totalOccurrences} times across ${distinctDigestionRuns} digestion runs. The same impediment theme keeps appearing, indicating an unresolved systemic blocker.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // B. Recurring Dependency Pattern
  {
    patternType: "recurring_dependency_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "dependency_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 3 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "recurring_dependency_pattern",
        promotionReason: "repeated_dependency_threshold_met",
        title: `Recurring Dependency: ${top}`,
        summary: `A dependency signal has recurred ${totalOccurrences} times across ${distinctDigestionRuns} runs. A persistent upstream dependency is blocking or constraining delivery.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // C. Financial Friction Pattern (lower threshold — financial is high-severity persistent)
  {
    patternType: "financial_friction_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "financial_impediment_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 2 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "financial_friction_pattern",
        promotionReason: "financial_friction_threshold_met",
        title: `Financial Friction: ${top}`,
        summary: `A financial impediment has recurred ${totalOccurrences} times across ${distinctDigestionRuns} runs. Recurring budget, payment, PO, or billing friction is affecting delivery.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // D. Governance Degradation Pattern
  {
    patternType: "governance_degradation_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "governance_gap_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 2 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "governance_degradation_pattern",
        promotionReason: "governance_gap_accumulation",
        title: `Governance Degradation: ${top}`,
        summary: `Governance gaps have recurred ${totalOccurrences} times across ${distinctDigestionRuns} runs. Unclear ownership, missing approvals, or compliance issues are accumulating without resolution.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // E. Escalation Trajectory Pattern (lower threshold — escalations are inherently high-severity)
  {
    patternType: "escalation_trajectory_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "escalation_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 2 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "escalation_trajectory_pattern",
        promotionReason: "escalation_frequency_threshold",
        title: `Escalation Trajectory: ${top}`,
        summary: `Escalation signals have recurred ${totalOccurrences} times across ${distinctDigestionRuns} runs. The issue has repeatedly required senior attention without being fully resolved.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // F. Stakeholder Pressure Pattern
  {
    patternType: "stakeholder_pressure_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "stakeholder_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 3 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "stakeholder_pressure_pattern",
        promotionReason: "stakeholder_pressure_accumulation",
        title: `Stakeholder Pressure: ${top}`,
        summary: `Stakeholder pressure signals have appeared ${totalOccurrences} times across ${distinctDigestionRuns} runs. Recurring concern, frustration, or pressure indicates a systemic relationship risk.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // G. Delivery Drift Pattern (combines delivery_drift_signal and timeline_pressure_signal)
  {
    patternType: "delivery_drift_pattern",
    evaluate(group) {
      if (
        group.primaryNutrientType !== "delivery_drift_signal" &&
        group.primaryNutrientType !== "timeline_pressure_signal"
      )
        return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 2 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "delivery_drift_pattern",
        promotionReason: "delivery_drift_accumulation",
        title: `Delivery Drift: ${top}`,
        summary: `Delivery drift or timeline pressure signals have recurred ${totalOccurrences} times across ${distinctDigestionRuns} runs. The delivery schedule is repeatedly slipping without structural correction.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // H. Ambiguity Accumulation Pattern
  {
    patternType: "ambiguity_accumulation_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "ambiguity_signal") return null;
      const { totalOccurrences, distinctDigestionRuns } = group.recurrenceProfile;
      if (totalOccurrences < 3 || distinctDigestionRuns < 2) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "ambiguity_accumulation_pattern",
        promotionReason: "ambiguity_accumulation_threshold",
        title: `Ambiguity Accumulation: ${top}`,
        summary: `Ambiguity signals have accumulated ${totalOccurrences} times across ${distinctDigestionRuns} runs. Recurring unclear ownership, undefined processes, or unresolved decisions are creating structural uncertainty.`,
        severity,
        status,
        trajectory,
      };
    },
  },

  // J. Chronic Risk Pattern (requires meaningful time spread)
  {
    patternType: "chronic_risk_pattern",
    evaluate(group) {
      if (group.primaryNutrientType !== "risk_signal") return null;
      const { totalOccurrences, distinctDigestionRuns, timeSpanDays } =
        group.recurrenceProfile;
      if (totalOccurrences < 3 || distinctDigestionRuns < 3) return null;
      if (timeSpanDays < 3) return null;
      const severity = highestSeverity(group.signals.map((s) => s.severity));
      const status = computeStatus(group);
      const trajectory = computeTrajectory(group);
      const top = topSignalSummary(group);
      return {
        patternType: "chronic_risk_pattern",
        promotionReason: "chronic_risk_persistence",
        title: `Chronic Risk: ${top}`,
        summary: `Risk signals have persisted ${totalOccurrences} times across ${distinctDigestionRuns} runs over ${Math.round(timeSpanDays)} days. This risk is not being mitigated and keeps recurring.`,
        severity,
        status,
        trajectory,
      };
    },
  },
];

// ─── Recovery Pattern (cross-type detector) ───────────────────────────────────

/**
 * Detects recovery patterns by checking for recovery_signal nutrients that
 * appear after prior blocker/risk/dependency signals in the same workspace+project.
 *
 * Returns one candidate per workspace+project combination where recovery
 * follows earlier blockers.
 */
export function detectRecoveryPatternCandidates(
  nutrients: VaultNutrient[],
  residue: VaultSemanticResidue[],
): Array<
  PromotionCandidate & {
    workspaceId: string;
    projectId: string | null;
    involvedNutrientIds: string[];
    involvedResidueIds: string[];
  }
> {
  const recoveries = nutrients.filter((n) => n.nutrientType === "recovery_signal");
  const antecedents = nutrients.filter((n) =>
    ["blocker_signal", "risk_signal", "dependency_signal"].includes(n.nutrientType),
  );

  const scopeKeys = new Set(
    nutrients.map((n) => `${n.workspaceId}:${n.projectId ?? ""}`),
  );

  const results: ReturnType<typeof detectRecoveryPatternCandidates> = [];

  for (const scopeKey of scopeKeys) {
    const [ws, proj] = scopeKey.split(":", 2);
    const projectId = proj || null;

    const scopeRecoveries = recoveries.filter(
      (n) => n.workspaceId === ws && (n.projectId ?? "") === (proj ?? ""),
    );
    const scopeAntecedents = antecedents.filter(
      (n) => n.workspaceId === ws && (n.projectId ?? "") === (proj ?? ""),
    );

    if (scopeRecoveries.length < 1 || scopeAntecedents.length < 2) continue;

    const earliestAntecedent = Math.min(
      ...scopeAntecedents.map((n) => Date.parse(n.createdAt)).filter((t) => !isNaN(t)),
    );
    const latestRecovery = Math.max(
      ...scopeRecoveries.map((n) => Date.parse(n.createdAt)).filter((t) => !isNaN(t)),
    );

    if (latestRecovery <= earliestAntecedent) continue;

    const topRecovery = [...scopeRecoveries].sort(
      (a, b) => b.scoring.confidence - a.scoring.confidence,
    )[0];

    const involvedNutrientIds = [
      ...scopeRecoveries.map((n) => n.id),
      ...scopeAntecedents.map((n) => n.id),
    ];

    results.push({
      patternType: "recovery_pattern",
      promotionReason: "recovery_after_blockers",
      title: `Recovery Pattern: ${topRecovery.summary.slice(0, 100)}`,
      summary: `Recovery signals appeared after ${scopeAntecedents.length} blocker/risk signals. The project appears to have overcome a previous impediment, indicating a positive operational shift.`,
      severity: "low",
      status: "recovering",
      trajectory: "decreasing",
      workspaceId: ws,
      projectId,
      involvedNutrientIds,
      involvedResidueIds: residue
        .filter((r) => r.workspaceId === ws && (r.projectId ?? "") === (proj ?? ""))
        .map((r) => r.id),
    });
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluates a signal group against all promotion rules.
 * Returns the first matching promotion candidate, or null if no rule fires.
 */
export function evaluatePromotionRules(group: SignalGroup): PromotionCandidate | null {
  for (const rule of RULES) {
    const result = rule.evaluate(group);
    if (result !== null) return result;
  }
  return null;
}
