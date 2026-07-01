import type { NutrientCandidate } from "./nutrient-extractor";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "has", "have", "been", "be",
  "to", "of", "in", "for", "on", "with", "as", "by", "at", "from",
  "that", "this", "it", "its", "and", "or", "but", "not", "so",
  "we", "our", "they", "their", "you", "your", "will", "can", "been",
  "still", "now", "also", "just", "very", "some", "any", "all",
]);

export type DeduplicatedCandidate = NutrientCandidate & {
  duplicateMergeCount: number;
  mergedExcerpts: string[];
};

function extractThemeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 6);
}

function themeKey(candidate: NutrientCandidate): string {
  const words = extractThemeWords(candidate.summary);
  return `${candidate.nutrientType}:${words.slice(0, 3).join("_")}`;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function deduplicateCandidates(candidates: NutrientCandidate[]): DeduplicatedCandidate[] {
  // Group by exact theme key first
  const exactGroups = new Map<string, NutrientCandidate[]>();
  for (const candidate of candidates) {
    const key = themeKey(candidate);
    const existing = exactGroups.get(key);
    if (existing) {
      existing.push(candidate);
    } else {
      exactGroups.set(key, [candidate]);
    }
  }

  // Merge exact-key groups into representatives
  const representatives: DeduplicatedCandidate[] = [];
  for (const group of exactGroups.values()) {
    group.sort((a, b) => b.confidence - a.confidence);
    representatives.push({
      ...group[0],
      duplicateMergeCount: group.length - 1,
      mergedExcerpts: group.slice(1).map((c) => c.excerpt),
    });
  }

  // Second pass: Jaccard similarity merge within same nutrientType
  const final: DeduplicatedCandidate[] = [];
  const merged = new Set<number>();
  for (let i = 0; i < representatives.length; i++) {
    if (merged.has(i)) continue;
    const rep = representatives[i];
    const repWords = extractThemeWords(rep.summary);
    for (let j = i + 1; j < representatives.length; j++) {
      if (merged.has(j)) continue;
      const other = representatives[j];
      if (rep.nutrientType !== other.nutrientType) continue;
      const otherWords = extractThemeWords(other.summary);
      if (jaccardSimilarity(repWords, otherWords) >= 0.45) {
        // Merge: keep higher confidence, accumulate mergeCount
        if (other.confidence > rep.confidence) {
          representatives[i] = {
            ...other,
            duplicateMergeCount: rep.duplicateMergeCount + other.duplicateMergeCount + 1,
            mergedExcerpts: [...(other.mergedExcerpts ?? []), rep.excerpt, ...(rep.mergedExcerpts ?? [])],
          };
        } else {
          representatives[i] = {
            ...rep,
            duplicateMergeCount: rep.duplicateMergeCount + other.duplicateMergeCount + 1,
            mergedExcerpts: [...(rep.mergedExcerpts ?? []), other.excerpt, ...(other.mergedExcerpts ?? [])],
          };
        }
        merged.add(j);
      }
    }
    final.push(representatives[i]);
  }

  return final;
}
