import type { VaultRawMaterial } from "./types";

export type NormalizedInput = {
  cleanedText: string;
  lines: string[];
  wordCount: number;
  rawMaterial: VaultRawMaterial;
};

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLines(cleaned: string): string[] {
  return cleaned
    .split(/\n+/)
    .map((l) => l.replace(/^[\-•*>\d.)\s]+/, "").trim())
    .filter((l) => l.length >= 10);
}

const COMMON_WORDS = new Set([
  "the", "and", "for", "are", "was", "has", "had", "not", "but",
  "you", "this", "that", "with", "from", "they", "will",
]);

export function normalizeRawMaterial(material: VaultRawMaterial): NormalizedInput {
  const cleanedText = cleanText(material.content);
  const lines = splitLines(cleanedText);
  const wordCount = cleanedText
    .split(/\s+/)
    .filter((w) => w.length > 0 && !COMMON_WORDS.has(w.toLowerCase())).length;

  return { cleanedText, lines, wordCount, rawMaterial: material };
}
