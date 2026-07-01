import { createSupabaseServerClient } from "@/lib/db/supabase-server";

type RiskLevel = "low" | "medium" | "high";

type MessageSignal = {
  created_at: string;
  blame_score: number;
  ambiguity_score: number;
  overall_risk: number;
};

type SuggestionSignal = {
  type: "risk" | "delay" | "clarity" | "escalation";
  priority: "low" | "medium" | "high";
  message: string;
  created_at: string;
};

export type ProjectState = {
  healthScore: number;
  riskLevel: RiskLevel;
  stakeholderAlignment: number;
  executionMomentum: number;
  topIssues: string[];
  recommendedActions: string[];
  signals: {
    riskTrend: "improving" | "stable" | "worsening" | "unknown";
    inactivity: "active" | "stale-24h" | "stale-72h" | "unknown";
    ambiguity: "low" | "medium" | "high" | "unknown";
    blame: "low" | "medium" | "high" | "unknown";
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

const getRiskTrend = (messages: MessageSignal[]) => {
  if (messages.length < 4) return "unknown" as const;
  const points = messages.slice(0, 8).reverse();
  const split = Math.max(1, Math.floor(points.length / 2));
  const early = avg(points.slice(0, split).map((m) => m.overall_risk));
  const late = avg(points.slice(split).map((m) => m.overall_risk));
  const delta = late - early;

  if (delta >= 0.1) return "worsening" as const;
  if (delta <= -0.1) return "improving" as const;
  return "stable" as const;
};

const getInactivity = (messages: MessageSignal[]) => {
  if (!messages.length) return "unknown" as const;
  const elapsedMs = Date.now() - new Date(messages[0].created_at).getTime();

  if (elapsedMs >= 72 * 60 * 60 * 1000) return "stale-72h" as const;
  if (elapsedMs >= 24 * 60 * 60 * 1000) return "stale-24h" as const;
  return "active" as const;
};

const toBand = (score: number) => {
  if (score >= 0.72) return "high" as const;
  if (score >= 0.5) return "medium" as const;
  return "low" as const;
};

const deriveIssues = ({
  riskTrend,
  inactivity,
  ambiguity,
  blame,
}: {
  riskTrend: ReturnType<typeof getRiskTrend>;
  inactivity: ReturnType<typeof getInactivity>;
  ambiguity: ReturnType<typeof toBand> | "unknown";
  blame: ReturnType<typeof toBand> | "unknown";
}) => {
  const issues: string[] = [];

  if (riskTrend === "worsening") issues.push("Risk trend is worsening across recent communications.");
  if (inactivity === "stale-72h") issues.push("No project communication in over 72 hours.");
  else if (inactivity === "stale-24h") issues.push("No project communication in the last 24 hours.");
  if (ambiguity === "high") issues.push("Messages are highly ambiguous and likely to cause misalignment.");
  if (blame === "high") issues.push("Blame-heavy language is elevating stakeholder friction.");

  return issues;
};

const deriveActions = ({
  issues,
  suggestions,
}: {
  issues: string[];
  suggestions: SuggestionSignal[];
}) => {
  const actions = new Set<string>();

  if (issues.some((issue) => issue.includes("worsening"))) {
    actions.add("Send a reset update with explicit owner, decision, and next milestone date.");
  }
  if (issues.some((issue) => issue.includes("72 hours") || issue.includes("24 hours"))) {
    actions.add("Post a concise progress checkpoint to restore execution visibility.");
  }
  if (issues.some((issue) => issue.includes("ambiguous"))) {
    actions.add("Use a structured status format: blocker, owner, ETA, ask.");
  }
  if (issues.some((issue) => issue.includes("Blame-heavy"))) {
    actions.add("Replace blame wording with fact-based impact statements and requests.");
  }

  suggestions.slice(0, 3).forEach((suggestion) => actions.add(suggestion.message));

  if (actions.size === 0) {
    actions.add("Signals are stable. Maintain daily concise updates with clear ownership.");
  }

  return Array.from(actions).slice(0, 5);
};

export const getProjectState = async (projectId: string): Promise<ProjectState> => {
  const scopedProjectId = projectId.trim() || "demo-project";
  const supabase = createSupabaseServerClient();

  const [{ data: messages, error: messageError }, { data: suggestions, error: suggestionError }] = await Promise.all([
    supabase
      .from("message_analyses")
      .select("created_at, blame_score, ambiguity_score, overall_risk")
      .eq("project_id", scopedProjectId)
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("project_suggestions")
      .select("type, priority, message, created_at")
      .eq("project_id", scopedProjectId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (messageError) throw messageError;
  if (suggestionError) throw suggestionError;

  const recentMessages = ((messages ?? []) as MessageSignal[]).slice(0, 8);
  const activeSuggestions = (suggestions ?? []) as SuggestionSignal[];

  const latestRisk = recentMessages[0]?.overall_risk ?? 0.35;
  const avgAmbiguity = recentMessages.length ? avg(recentMessages.map((m) => m.ambiguity_score)) : 0.35;
  const avgBlame = recentMessages.length ? avg(recentMessages.map((m) => m.blame_score)) : 0.2;

  const riskTrend = getRiskTrend(recentMessages);
  const inactivity = getInactivity(recentMessages);
  const ambiguity = recentMessages.length ? toBand(avgAmbiguity) : "unknown";
  const blame = recentMessages.length ? toBand(avgBlame) : "unknown";

  let riskPoints = latestRisk * 100;
  if (riskTrend === "worsening") riskPoints += 12;
  if (riskTrend === "improving") riskPoints -= 8;
  if (inactivity === "stale-24h") riskPoints += 10;
  if (inactivity === "stale-72h") riskPoints += 20;
  if (ambiguity === "medium") riskPoints += 7;
  if (ambiguity === "high") riskPoints += 14;
  if (blame === "medium") riskPoints += 7;
  if (blame === "high") riskPoints += 14;
  riskPoints += activeSuggestions.filter((s) => s.priority === "high").length * 4;

  const normalizedRisk = clamp(Math.round(riskPoints), 0, 100);
  const healthScore = 100 - normalizedRisk;
  const stakeholderAlignment = clamp(Math.round((1 - (avgAmbiguity * 0.6 + avgBlame * 0.4)) * 100), 0, 100);
  const executionMomentum = clamp(
    Math.round(100 - (inactivity === "stale-72h" ? 35 : inactivity === "stale-24h" ? 18 : 5) - latestRisk * 25),
    0,
    100,
  );

  const topIssues = deriveIssues({ riskTrend, inactivity, ambiguity, blame }).slice(0, 3);
  const recommendedActions = deriveActions({ issues: topIssues, suggestions: activeSuggestions });

  return {
    healthScore,
    riskLevel: normalizedRisk >= 70 ? "high" : normalizedRisk >= 45 ? "medium" : "low",
    stakeholderAlignment,
    executionMomentum,
    topIssues,
    recommendedActions,
    signals: { riskTrend, inactivity, ambiguity, blame },
  };
};
