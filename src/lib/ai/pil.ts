import { createSupabaseServerClient } from "@/lib/db/supabase-server";

type SuggestionType = "risk" | "delay" | "clarity" | "escalation";
type SuggestionPriority = "low" | "medium" | "high";

type MessageAnalysisSignal = {
  created_at: string;
  tone_score: number;
  blame_score: number;
  ambiguity_score: number;
  overall_risk: number;
};

type Suggestion = {
  type: SuggestionType;
  message: string;
  priority: SuggestionPriority;
};

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const getRiskTrend = (recent: MessageAnalysisSignal[]) => {
  if (recent.length < 4) return "unknown" as const;

  const newestFirst = recent.slice(0, 8);
  const oldestFirst = [...newestFirst].reverse();
  const midpoint = Math.max(1, Math.floor(oldestFirst.length / 2));

  const older = oldestFirst.slice(0, midpoint).map((row) => row.overall_risk);
  const newer = oldestFirst.slice(midpoint).map((row) => row.overall_risk);

  const delta = average(newer) - average(older);

  if (delta >= 0.1) return "worsening" as const;
  if (delta <= -0.1) return "improving" as const;
  return "stable" as const;
};

const getBlamePattern = (recent: MessageAnalysisSignal[]) => {
  if (recent.length < 4) return "unknown" as const;

  const newest = recent.slice(0, 4).map((row) => row.blame_score);
  const older = recent.slice(4, 8).map((row) => row.blame_score);

  if (older.length === 0) return "unknown" as const;

  const delta = average(newest) - average(older);

  if (delta >= 0.12) return "increasing" as const;
  if (delta <= -0.12) return "decreasing" as const;
  return "stable" as const;
};

const buildSuggestions = ({
  recent,
  inactivityMs,
}: {
  recent: MessageAnalysisSignal[];
  inactivityMs: number | null;
}): Suggestion[] => {
  if (!recent.length) {
    return [
      {
        type: "clarity",
        message: "No project message analysis found yet. Analyze at least one message to unlock proactive coaching.",
        priority: "low",
      },
    ];
  }

  const riskTrend = getRiskTrend(recent);
  const blamePattern = getBlamePattern(recent);

  const latest = recent[0];
  const suggestions: Suggestion[] = [];

  if (latest.overall_risk >= 0.72 || riskTrend === "worsening") {
    suggestions.push({
      type: "risk",
      message: "Communication risk is trending up. Reframe the next update with neutral language and explicit asks.",
      priority: latest.overall_risk >= 0.8 ? "high" : "medium",
    });
  }

  if (latest.ambiguity_score >= 0.62) {
    suggestions.push({
      type: "clarity",
      message: "Recent messages are ambiguous. Add owner, date, and concrete next step in your next note.",
      priority: latest.ambiguity_score >= 0.75 ? "high" : "medium",
    });
  }

  if (blamePattern === "increasing" || latest.blame_score >= 0.7) {
    suggestions.push({
      type: "escalation",
      message: "Blame language is increasing. Escalate with a fact-based status summary before sentiment degrades.",
      priority: "high",
    });
  }

  if (inactivityMs !== null && inactivityMs >= HOURS_72) {
    suggestions.push({
      type: "delay",
      message: "No recent project communication in 72+ hours. Send a brief progress checkpoint to prevent perceived delay.",
      priority: "medium",
    });
  } else if (inactivityMs !== null && inactivityMs >= HOURS_24) {
    suggestions.push({
      type: "delay",
      message: "No communication in the last 24 hours. Consider a quick update to keep stakeholders aligned.",
      priority: "low",
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      type: "clarity",
      message: "Project signals are stable. Keep messages concise with clear owners and dates.",
      priority: "low",
    });
  }

  return suggestions;
};

export const analyzeProjectState = async (projectId: string) => {
  const scopedProjectId = projectId.trim() || "demo-project";
  const supabase = createSupabaseServerClient();

  const { data: recentData, error: recentError } = await supabase
    .from("message_analyses")
    .select("created_at, tone_score, blame_score, ambiguity_score, overall_risk")
    .eq("project_id", scopedProjectId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (recentError) {
    throw recentError;
  }

  const recent = (recentData ?? []) as MessageAnalysisSignal[];
  const inactivityMs = recent[0] ? Date.now() - new Date(recent[0].created_at).getTime() : null;

  const nextSuggestions = buildSuggestions({ recent, inactivityMs });

  await supabase.from("project_suggestions").update({ dismissed: true }).eq("project_id", scopedProjectId).eq("dismissed", false);

  if (nextSuggestions.length) {
    await supabase.from("project_suggestions").insert(
      nextSuggestions.map((suggestion) => ({
        project_id: scopedProjectId,
        type: suggestion.type,
        message: suggestion.message,
        priority: suggestion.priority,
        created_at: new Date().toISOString(),
        dismissed: false,
      })),
    );
  }

  return nextSuggestions;
};
