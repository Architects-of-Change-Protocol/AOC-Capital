/**
 * Recurrence Detection Engine.
 *
 * Detects longitudinal recurrence in a set of VaultNutrients — signals that
 * appear across multiple digestion runs, indicating systemic operational patterns.
 *
 * Two detection strategies:
 *   1. Specific-theme: same nutrient type + similar theme words (Jaccard >= 0.4)
 *      across 2+ distinct digestion runs.
 *   2. Project-type aggregate: same workspace + project + nutrient type,
 *      3+ occurrences from 3+ distinct runs, regardless of theme.
 *
 * Safety invariant: within-run duplicates (same digestionRunId, different
 * duplicateMergeCount) are NEVER counted as longitudinal recurrence.
 */

import type { VaultNutrient } from "../digestive/types";
import type { LearnedPatternSignal, PatternRecurrenceProfile, PatternSeverity } from "./types";

export type SignalGroupMethod = "specific_theme" | "project_type_aggregate";

export type SignalGroup = {
  groupKey: string;
  primaryNutrientType: string;
  groupingMethod: SignalGroupMethod;
  signals: LearnedPatternSignal[];
  recurrenceProfile: PatternRecurrenceProfile;
  involvedNutrientIds: string[];
  workspaceId: string;
  projectId: string | null;
};

// ─── Theme Utilities ──────────────────────────────────────────────────────────

const THEME_STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "has", "have", "been", "be",
  "to", "of", "in", "for", "on", "with", "as", "by", "at", "from",
  "that", "this", "it", "its", "and", "or", "but", "not", "so",
  "we", "our", "they", "their", "you", "your", "will", "can",
  "still", "now", "also", "just", "very", "some", "any", "all",
  "being", "would", "could", "should", "may", "might", "must",
  "shall", "does", "did", "had", "into", "than", "then",
]);

function extractThemeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !THEME_STOP_WORDS.has(w))
    .slice(0, 6);
}

function buildThemeKey(nutrientType: string, summary: string): string {
  const words = extractThemeWords(summary).slice(0, 3);
  return `${nutrientType}:${words.join("_")}`;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Signal Conversion ────────────────────────────────────────────────────────

function nutrientToSignal(n: VaultNutrient): LearnedPatternSignal {
  return {
    nutrientId: n.id,
    nutrientType: n.nutrientType,
    summary: n.summary,
    artifactId: n.evidence[0]?.sourceArtifactId ?? null,
    digestionRunId: n.digestionRunId,
    createdAt: n.createdAt,
    severity: n.scoring.severity as PatternSeverity,
    confidence: n.scoring.confidence,
  };
}

function computeRecurrenceProfile(signals: LearnedPatternSignal[]): PatternRecurrenceProfile {
  const distinctArtifacts = new Set(
    signals.map((s) => s.artifactId).filter(Boolean),
  ).size;
  const distinctDigestionRuns = new Set(signals.map((s) => s.digestionRunId)).size;
  const timestamps = signals
    .map((s) => Date.parse(s.createdAt))
    .filter((t) => !isNaN(t));
  const timeSpanDays =
    timestamps.length > 1
      ? (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000
      : 0;
  const multiDaySpread =
    new Set(signals.map((s) => s.createdAt.slice(0, 10))).size > 1;
  return {
    totalOccurrences: signals.length,
    distinctArtifacts,
    distinctDigestionRuns,
    timeSpanDays: Math.round(timeSpanDays * 10) / 10,
    multiDaySpread,
  };
}

// ─── Strategy 1: Specific-Theme Grouping ─────────────────────────────────────

function detectThemeGroups(nutrients: VaultNutrient[]): SignalGroup[] {
  type AugmentedSignal = LearnedPatternSignal & {
    themeKey: string;
    themeWords: string[];
    workspaceId: string;
    projectId: string | null;
  };

  const augmented: AugmentedSignal[] = nutrients.map((n) => ({
    ...nutrientToSignal(n),
    themeKey: buildThemeKey(n.nutrientType, n.summary),
    themeWords: extractThemeWords(n.summary),
    workspaceId: n.workspaceId,
    projectId: n.projectId,
  }));

  // Group by workspace + project + themeKey
  const exactGroups = new Map<string, AugmentedSignal[]>();
  for (const sig of augmented) {
    const key = `${sig.workspaceId}:${sig.projectId ?? ""}:${sig.themeKey}`;
    const existing = exactGroups.get(key);
    if (existing) existing.push(sig);
    else exactGroups.set(key, [sig]);
  }

  // Merge groups sharing the same workspace+project+type with Jaccard >= 0.4
  const groupEntries = [...exactGroups.entries()].map(([k, sigs]) => ({
    key: k,
    sigs,
    nutrientType: sigs[0].nutrientType,
    themeWords: sigs[0].themeWords,
    wpScope: `${sigs[0].workspaceId}:${sigs[0].projectId ?? ""}`,
    workspaceId: sigs[0].workspaceId,
    projectId: sigs[0].projectId,
  }));

  const mergedIdx = new Set<number>();
  const mergedGroups: typeof groupEntries = [];

  for (let i = 0; i < groupEntries.length; i++) {
    if (mergedIdx.has(i)) continue;
    let current = { ...groupEntries[i], sigs: [...groupEntries[i].sigs] };

    for (let j = i + 1; j < groupEntries.length; j++) {
      if (mergedIdx.has(j)) continue;
      const other = groupEntries[j];
      if (current.nutrientType !== other.nutrientType) continue;
      if (current.wpScope !== other.wpScope) continue;
      if (jaccardSimilarity(current.themeWords, other.themeWords) >= 0.4) {
        current = { ...current, sigs: [...current.sigs, ...other.sigs] };
        mergedIdx.add(j);
      }
    }
    mergedGroups.push(current);
  }

  // Keep only groups with 2+ distinct digestion runs
  const groups: SignalGroup[] = [];
  for (const group of mergedGroups) {
    const distinctRuns = new Set(group.sigs.map((s) => s.digestionRunId));
    if (distinctRuns.size < 2) continue;

    const signals: LearnedPatternSignal[] = group.sigs.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ themeKey: _tk, themeWords: _tw, workspaceId: _wid, projectId: _pid, ...rest }) =>
        rest as LearnedPatternSignal,
    );
    const profile = computeRecurrenceProfile(signals);

    groups.push({
      groupKey: group.key,
      primaryNutrientType: group.nutrientType,
      groupingMethod: "specific_theme",
      signals,
      recurrenceProfile: profile,
      involvedNutrientIds: signals.map((s) => s.nutrientId),
      workspaceId: group.workspaceId,
      projectId: group.projectId,
    });
  }

  return groups;
}

// ─── Strategy 2: Project-Type Aggregate Grouping ──────────────────────────────

/**
 * Groups all nutrients of the same type within the same workspace+project.
 * Fires when 2+ occurrences exist from 2+ distinct digestion runs, catching
 * project-level patterns where individual instances have different themes.
 * Promotion rules apply type-specific thresholds on top of this minimum bar.
 */
function detectProjectTypeAggregates(nutrients: VaultNutrient[]): SignalGroup[] {
  const groups = new Map<string, VaultNutrient[]>();
  for (const n of nutrients) {
    const key = `${n.workspaceId}:${n.projectId ?? ""}:${n.nutrientType}`;
    const existing = groups.get(key);
    if (existing) existing.push(n);
    else groups.set(key, [n]);
  }

  const result: SignalGroup[] = [];
  for (const [key, groupNutrients] of groups) {
    const signals = groupNutrients.map(nutrientToSignal);
    const distinctRuns = new Set(signals.map((s) => s.digestionRunId));
    // Minimum bar: 2+ occurrences from 2+ distinct runs.
    // Promotion rules apply type-specific thresholds on top of this.
    if (signals.length < 2 || distinctRuns.size < 2) continue;

    const profile = computeRecurrenceProfile(signals);
    result.push({
      groupKey: `project-agg:${key}`,
      primaryNutrientType: groupNutrients[0].nutrientType,
      groupingMethod: "project_type_aggregate",
      signals,
      recurrenceProfile: profile,
      involvedNutrientIds: signals.map((s) => s.nutrientId),
      workspaceId: groupNutrients[0].workspaceId,
      projectId: groupNutrients[0].projectId,
    });
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detects recurring signal groups from a set of VaultNutrients.
 *
 * Returns fine-grained (same theme) and project-level (same type) groups.
 * When both strategies fire for the same workspace+project+type, the more
 * specific theme group is preserved and the aggregate is omitted to avoid
 * duplicate patterns.
 *
 * Safety: only groups with 2+ distinct digestion run IDs are returned.
 * Within-run duplicates (captured by duplicateMergeCount) do NOT count as
 * longitudinal recurrence.
 */
export function detectRecurringSignalGroups(nutrients: VaultNutrient[]): SignalGroup[] {
  const themeGroups = detectThemeGroups(nutrients);
  const aggregateGroups = detectProjectTypeAggregates(nutrients);

  // Track which workspace+project+type combos are already covered by a theme group
  const coveredByTheme = new Set(
    themeGroups.map(
      (g) => `${g.workspaceId}:${g.projectId ?? ""}:${g.primaryNutrientType}`,
    ),
  );

  // Only include aggregates for type+scope combos not already covered
  const filteredAggregates = aggregateGroups.filter((ag) => {
    const key = `${ag.workspaceId}:${ag.projectId ?? ""}:${ag.primaryNutrientType}`;
    return !coveredByTheme.has(key);
  });

  return [...themeGroups, ...filteredAggregates];
}
