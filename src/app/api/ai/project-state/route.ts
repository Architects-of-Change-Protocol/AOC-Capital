import { NextResponse } from "next/server";
import { getProjectState } from "@/lib/ai/project-state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() || "demo-project";

  try {
    const state = await getProjectState(projectId);

    return NextResponse.json({
      projectId,
      ...state,
      examples: {
        healthy: {
          healthScore: 82,
          riskLevel: "low",
          stakeholderAlignment: 84,
          executionMomentum: 79,
          topIssues: ["No major issues detected."],
          recommendedActions: ["Maintain concise daily updates with owner + ETA."],
        },
        atRisk: {
          healthScore: 38,
          riskLevel: "high",
          stakeholderAlignment: 46,
          executionMomentum: 35,
          topIssues: [
            "Risk trend is worsening across recent communications.",
            "No project communication in over 72 hours.",
            "Blame-heavy language is elevating stakeholder friction.",
          ],
          recommendedActions: [
            "Send a reset update with explicit owner, decision, and next milestone date.",
            "Post a concise progress checkpoint to restore execution visibility.",
            "Replace blame wording with fact-based impact statements and requests.",
          ],
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to derive project state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
