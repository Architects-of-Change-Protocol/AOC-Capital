import type { VaultExtractedEntity, VaultExtractedEntityType } from "./types";

type EntityPattern = {
  entityType: VaultExtractedEntityType;
  patterns: RegExp[];
  captureGroup?: number; // Which regex group holds the value (default 1)
};

const ENTITY_PATTERNS: EntityPattern[] = [
  {
    entityType: "person",
    patterns: [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b(?:\s+(?:said|confirmed|escalated|noted|mentioned|flagged|raised|requested|approved|rejected|is blocking|is the owner|is responsible))/,
      /(?:owner|lead|pm|sponsor|contact|from|by|with):\s+([A-Z][a-z]+ [A-Z][a-z]+)\b/i,
    ],
  },
  {
    entityType: "organization",
    patterns: [
      /\b([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)\s+(?:team|group|division|org|department|vendor|client|partner)\b/i,
    ],
  },
  {
    entityType: "risk",
    patterns: [
      /\brisk[:\s]+([^.;,\n]{10,80})/i,
      /\bat risk[:\s]+([^.;,\n]{10,80})/i,
      /\bmay impact[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "blocker",
    patterns: [
      /\bblocker[:\s]+([^.;,\n]{10,80})/i,
      /\bblocked (?:by|on|until)[:\s]+([^.;,\n]{10,80})/i,
      /\bcannot proceed (?:until|because|due to)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "decision",
    patterns: [
      /\b(?:decided|decision|signed off|we agreed)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "dependency",
    patterns: [
      /\bdepends? on[:\s]+([^.;,\n]{10,80})/i,
      /\bwaiting (?:on|for)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "commitment",
    patterns: [
      /\bcommitted? (?:to|that)[:\s]+([^.;,\n]{10,80})/i,
      /\bpromised? (?:to|that)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "deliverable",
    patterns: [
      /\bdeliver(?:able|y)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "date",
    patterns: [
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?)\b/i,
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
      /\b(Q[1-4]\s+\d{4})\b/i,
      /\b(next (?:week|month|quarter|sprint|release))\b/i,
    ],
  },
  {
    entityType: "approval",
    patterns: [
      /\b(?:approval|sign-?off) (?:required|needed|from|by)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "financial_constraint",
    patterns: [
      /\b(?:budget|cost|funding|financial constraint)[:\s]+([^.;,\n]{10,80})/i,
      /(\$[\d,]+(?:k|m|b)?)\b/i,
    ],
  },
  {
    entityType: "technical_constraint",
    patterns: [
      /\btechnical constraint[:\s]+([^.;,\n]{10,80})/i,
      /\btech debt[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
  {
    entityType: "governance_event",
    patterns: [
      /\b(?:governance review|audit event|compliance breach)[:\s]+([^.;,\n]{10,80})/i,
    ],
  },
];

function tryExtract(
  pattern: RegExp,
  line: string,
  entityType: VaultExtractedEntityType,
): VaultExtractedEntity | null {
  const match = line.match(pattern);
  if (!match) return null;
  const value = (match[1] ?? match[0]).trim().slice(0, 120);
  if (value.length < 4) return null;
  return {
    entityType,
    value,
    excerpt: line.slice(0, 200),
    confidence: 0.65,
  };
}

export function extractEntities(lines: string[]): VaultExtractedEntity[] {
  const results: VaultExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    for (const { entityType, patterns } of ENTITY_PATTERNS) {
      for (const pattern of patterns) {
        const entity = tryExtract(pattern, line, entityType);
        if (!entity) continue;
        const key = `${entityType}:${entity.value.toLowerCase().slice(0, 60)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(entity);
      }
    }
  }

  return results.slice(0, 80);
}
