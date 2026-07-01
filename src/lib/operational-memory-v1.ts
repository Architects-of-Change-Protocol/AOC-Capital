import { OperationalMemoryCandidateContract, OperationalMemoryEntryContract } from "@/lib/contracts";

export const MEMORY_TYPES = [
  "risks",
  "blockers",
  "decisions",
  "stakeholders",
  "action_items",
  "unresolved_questions",
  "dependencies",
  "milestones",
  "escalations",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];
export type MemorySourceType = "upload" | "copilot_message" | "ingestion_summary" | "manual";
export type MemoryStatus = "active" | "resolved";

export type OperationalMemoryEntry = {
  id: string;
  companyId: string;
  projectId: string | null;
  memoryType: MemoryType;
  memoryText: string;
  status: MemoryStatus;
  sourceType: MemorySourceType;
  sourceReference: string;
  createdAt: string;
};

const KEYWORDS: Record<MemoryType, RegExp[]> = {
  risks: [/\brisk\b/i, /may impact/i, /\bthreat\b/i, /\bat risk\b/i, /\brisk identified\b/i],
  blockers: [/\bblocker\b/i, /\bblocked\b/i, /cannot proceed/i, /blocking\s+(?:us|the|delivery|progress)/i],
  decisions: [/\bdecision\b/i, /\bdecided\b/i, /\bapproved\b/i, /\bsigned off\b/i, /\bwe agreed\b/i],
  stakeholders: [/stakeholder/i, /\bsponsor\b/i, /owner:/i, /\bvendor\b/i, /\bclient\b/i, /\bexecutive\b/i],
  action_items: [/action item/i, /\btodo\b/i, /we need to/i, /next step/i, /\baction required\b/i],
  unresolved_questions: [/open question/i, /\bunknown\b/i, /\bunclear\b/i, /\bpending decision\b/i, /\bstill unclear\b/i],
  dependencies: [/\bdependency\b/i, /depends on/i, /waiting on/i, /\bwaiting for\b/i, /\bpending from\b/i],
  milestones: [/\bmilestone\b/i, /\bgo-live\b/i, /\bdeadline\b/i, /\blaunch\b/i, /\bphase\s+\d/i, /\brelease\s+\d/i],
  escalations: [/\bescalat/i, /executive review/i, /raise to/i, /escalation\s+needed/i],
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const cleanLine = (line: string) => line.replace(/^[\-•\d.)\s]+/, "").trim();

export function extractOperationalMemoryCandidates(input: { text: string; sourceType: MemorySourceType; sourceReference: string; }) {
  const lines = input.text
    .split(/\n+/)
    .map(cleanLine)
    .filter((line) => line.length >= 14)
    .slice(0, 120);

  const candidates: Array<{
    memoryType: MemoryType;
    memoryText: string;
    sourceType: MemorySourceType;
    sourceReference: string;
    status: MemoryStatus;
  }> = [];

  for (const line of lines) {
    // Detect resolution before keyword matching to avoid false active entries
    const resolvedLine = /\b(resolved|closed|completed|done|fixed|addressed|no\s+longer\s+blocking)\b/i.test(line);

    for (const memoryType of MEMORY_TYPES) {
      if (KEYWORDS[memoryType].some((pattern) => pattern.test(line))) {
        // Suppress noise: short lines without operational substance
        const hasOperationalSubstance = line.length >= 20 && /[A-Za-z]{4,}/.test(line);
        if (!hasOperationalSubstance) continue;

        candidates.push({
          memoryType,
          memoryText: line.slice(0, 400),
          sourceType: input.sourceType,
          sourceReference: input.sourceReference,
          status: resolvedLine ? "resolved" : "active",
        });
      }
    }
  }

  const seen = new Set<string>();
  const deduped = candidates.filter((candidate) => {
    const key = `${candidate.memoryType}:${normalize(candidate.memoryText)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const validated = deduped.filter((c) => {
    const result = OperationalMemoryCandidateContract(c);
    if (!result.ok) {
      console.warn("[contracts] memory_candidate_invalid", { errors: result.errors });
      return false;
    }
    return true;
  });
  return validated;
}

export async function appendOperationalMemory(input: {
  companyId: string;
  projectId: string | null;
  entries: Array<{ memoryType: MemoryType; memoryText: string; sourceType: MemorySourceType; sourceReference: string; status: MemoryStatus }>;
}) {
  if (input.entries.length === 0) return [];
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const incomingTexts = input.entries.map((item) => item.memoryText);
  const { data: existing } = await supabase
    .from("operational_memory_entries")
    .select("memory_type, memory_text")
    .eq("company_id", input.companyId)
    .eq("project_id", input.projectId)
    .in("memory_text", incomingTexts);

  const existingKeys = new Set((existing ?? []).map((row) => `${row.memory_type}:${normalize(row.memory_text)}`));

  const rows = input.entries
    .filter((entry) => !existingKeys.has(`${entry.memoryType}:${normalize(entry.memoryText)}`))
    .map((entry) => ({
      company_id: input.companyId,
      project_id: input.projectId,
      memory_type: entry.memoryType,
      memory_text: entry.memoryText,
      status: entry.status,
      source_type: entry.sourceType,
      source_reference: entry.sourceReference,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("operational_memory_entries")
    .insert(rows)
    .select("id, company_id, project_id, memory_type, memory_text, status, source_type, source_reference, created_at");

  if (error) throw new Error(`Unable to persist operational memory entries: ${error.message}`);
  return (data ?? []).map(validateAndMapRow).filter((e): e is OperationalMemoryEntry => e !== null);
}

type OperationalMemoryRow = { id: string; company_id: string; project_id: string | null; memory_type: MemoryType; memory_text: string; status: MemoryStatus; source_type: MemorySourceType; source_reference: string; created_at: string; };

const mapRow = (row: OperationalMemoryRow): OperationalMemoryEntry => ({
  id: row.id,
  companyId: row.company_id,
  projectId: row.project_id,
  memoryType: row.memory_type,
  memoryText: row.memory_text,
  status: row.status,
  sourceType: row.source_type,
  sourceReference: row.source_reference,
  createdAt: row.created_at,
});

function validateAndMapRow(row: OperationalMemoryRow): OperationalMemoryEntry | null {
  const mapped = mapRow(row);
  const result = OperationalMemoryEntryContract(mapped);
  if (!result.ok) {
    console.warn("[contracts] operational_memory_entry_invalid", {
      errors: result.errors,
      rowId: row.id ?? "unknown",
    });
    return null;
  }
  return result.data as OperationalMemoryEntry;
}

export async function getOperationalMemory(input: {
  companyId: string;
  projectId: string | null;
  memoryTypes?: MemoryType[];
  unresolvedOnly?: boolean;
  limit?: number;
}) {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("operational_memory_entries")
    .select("id, company_id, project_id, memory_type, memory_text, status, source_type, source_reference, created_at")
    .eq("company_id", input.companyId)
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 40);

  if (input.memoryTypes?.length) query = query.in("memory_type", input.memoryTypes);
  if (input.unresolvedOnly) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) throw new Error(`Unable to read operational memory entries: ${error.message}`);
  return (data ?? []).map(validateAndMapRow).filter((e): e is OperationalMemoryEntry => e !== null);
}

// Compute operational relevance score for an entry.
// Blockers and escalations: older unresolved = higher persistence concern.
// Decisions and risks: recency matters more.
function scoreContinuityEntry(entry: OperationalMemoryEntry, now: number): number {
  const ageDays = Math.max(0, (now - Date.parse(entry.createdAt)) / 86_400_000);

  switch (entry.memoryType) {
    case "blockers":
    case "escalations":
      // Persistent unresolved items are operationally high-priority
      return Math.min(100, 30 + ageDays * 7);
    case "risks":
      // Recent risks are more actionable than stale ones
      return Math.max(5, 80 - ageDays * 4);
    case "decisions":
      // Decisions are most useful when recent
      return Math.max(5, 70 - ageDays * 3);
    case "stakeholders":
      // Stakeholder signals that keep appearing are more significant
      return Math.max(5, 60 - ageDays * 2);
    default:
      return Math.max(5, 50 - ageDays * 2);
  }
}

export async function buildContinuityContext(companyId: string, projectId: string | null) {
  // Fetch a larger window so temporal scoring has material to rank
  const entries = await getOperationalMemory({ companyId, projectId, unresolvedOnly: true, limit: 60 });
  const now = Date.now();

  type ScoredEntry = { entry: OperationalMemoryEntry; ageDays: number; score: number };

  const scored: ScoredEntry[] = entries.map((entry: OperationalMemoryEntry) => ({
    entry,
    ageDays: Math.floor(Math.max(0, (now - Date.parse(entry.createdAt)) / 86_400_000)),
    score: scoreContinuityEntry(entry, now),
  }));

  const grouped = new Map<MemoryType, ScoredEntry[]>();
  for (const type of MEMORY_TYPES) grouped.set(type, []);
  for (const item of scored) {
    const bucket = grouped.get(item.entry.memoryType);
    if (bucket) bucket.push(item);
  }

  // Sort each bucket by relevance score and take up to 5 (up from 3)
  const take = (type: MemoryType): OperationalMemoryEntry[] =>
    (grouped.get(type) ?? [])
      .sort((a: ScoredEntry, b: ScoredEntry) => b.score - a.score)
      .slice(0, 5)
      .map((item: ScoredEntry) => item.entry);

  // Unresolved: top 12 by combined relevance (up from 8)
  const unresolvedRanked = scored
    .sort((a: ScoredEntry, b: ScoredEntry) => b.score - a.score)
    .slice(0, 12)
    .map((item: ScoredEntry) => item.entry);

  return {
    risks: take("risks"),
    blockers: take("blockers"),
    decisions: take("decisions"),
    stakeholders: take("stakeholders"),
    unresolved: unresolvedRanked,
  };
}
