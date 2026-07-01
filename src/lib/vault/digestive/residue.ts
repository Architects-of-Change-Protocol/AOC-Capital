import crypto from "node:crypto";
import type { VaultSemanticResidue } from "./types";

type ResidueRule = {
  category: VaultSemanticResidue["residueCategory"];
  patterns: RegExp[];
  rationale: string;
};

/**
 * Residue patterns capture weak or ambiguous signals that don't meet the bar
 * for a full nutrient but should be preserved for future reference.
 */
const RESIDUE_RULES: ResidueRule[] = [
  {
    category: "vague_concern",
    patterns: [
      /\bsomething\b.{0,30}\bwrong\b/i,
      /\bi(?:'m)? not sure\b/i,
      /\bnot (?:great|good|ideal|clear)\b/i,
      /\ba bit (?:worried|concerned|uncertain)\b/i,
      /\bsomething (?:seems|feels) off\b/i,
    ],
    rationale: "Vague concern without specific subject or supporting evidence",
  },
  {
    category: "unclear_dependency",
    patterns: [
      /\b(?:might|may) (?:depend|need)\b/i,
      /\bsomething (?:else|another) (?:first|before)\b/i,
      /\bnot sure (?:if|whether) (?:we|they) (?:need|depend)\b/i,
    ],
    rationale: "Possible dependency without a clear subject or target",
  },
  {
    category: "incomplete_stakeholder_mention",
    patterns: [
      /\bsomeone\b.{0,30}\bsaid\b/i,
      /\bthey\b.{0,30}\b(?:want|need|said|mentioned)\b/i,
      /\bthe\s+(?:person|guy|woman|man|individual)\b/i,
    ],
    rationale: "Stakeholder referenced without identification",
  },
  {
    category: "possible_risk",
    patterns: [
      /\bcould (?:be|become) (?:a )?(?:problem|issue|risk)\b/i,
      /\bmight cause\b/i,
      /\bpotentially\b.{0,40}\brisk\b/i,
    ],
    rationale: "Possible risk signal with insufficient evidence for a nutrient",
  },
  {
    category: "unresolved_timeline_reference",
    patterns: [
      /\bsoon(?:ish)?\b/i,
      /\bin (?:a )?(?:few|couple) (?:days|weeks)\b/i,
      /\bwhen (?:it's|its|we're|we are) ready\b/i,
      /\bsome ?time (?:next|later)\b/i,
    ],
    rationale: "Timeline reference without a specific date or milestone anchor",
  },
  {
    category: "ambiguous_ownership",
    patterns: [
      /\bsomebody (?:needs? to|should|must)\b/i,
      /\bwe (?:need|should|must) (?:someone|somebody) to\b/i,
      /\bno (?:clear )?owner\b/i,
      /\bunassigned\b/i,
    ],
    rationale: "Ownership implied but no named person or role identified",
  },
];

export function extractSemanticResidue(
  lines: string[],
  workspaceId: string,
  projectId: string | null,
  digestionRunId: string,
): VaultSemanticResidue[] {
  const residue: VaultSemanticResidue[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 12) continue;
    for (const { category, patterns, rationale } of RESIDUE_RULES) {
      if (!patterns.some((p) => p.test(line))) continue;
      const key = `${category}:${line.slice(0, 40).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      residue.push({
        id: crypto.randomUUID(),
        residueCategory: category,
        rawExcerpt: line.slice(0, 300),
        rationale,
        workspaceId,
        projectId,
        digestionRunId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return residue.slice(0, 30);
}
