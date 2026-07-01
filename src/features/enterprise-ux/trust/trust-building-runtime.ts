import type {
  TrustNarrative,
  TrustSignal,
  TrustSignalType,
} from "../types/enterprise-ux-types";

export function buildTrustNarratives(
  insightId: string,
  signalOrigins: string[],
  uncertaintyStatements: string[],
  governanceBoundaries: string[],
  assumptions: string[],
  knowledgeGaps: string[]
): TrustNarrative {
  return {
    insightId,
    whyGenerated:
      `This insight was generated because PMFreak detected correlated signals from: ${signalOrigins.join(", ")}. ` +
      `The correlation met the confidence threshold required to surface an operational observation.`,
    signalOrigins,
    uncertaintyStatement:
      uncertaintyStatements.length > 0
        ? uncertaintyStatements.join(" ")
        : "PMFreak does not have sufficient signal to assess uncertainty for this insight. Treat it with appropriate caution.",
    governanceBoundaries,
    assumptions,
    knowledgeGaps,
  };
}

export function retrieveTrustSignals(context: {
  workspaceId: string;
  hasProjects: boolean;
  hasIngestion: boolean;
  hasConnectors: boolean;
}): TrustSignal[] {
  const signals: TrustSignal[] = [];
  const now = new Date().toISOString();

  signals.push({
    id: `ts-workspace-scope-${context.workspaceId}`,
    signalType: "governance_boundary",
    label: "Workspace isolation active",
    explanation:
      "All operational signals, insights, and memory are scoped to your workspace. No data crosses tenant boundaries.",
    sourceLineage: "Workspace governance configuration",
    uncertaintyLevel: "low",
    governanceBoundary:
      "Workspace-level tenant isolation. Enforced at the database row-security level.",
    whatPMFreakDoesNotKnow:
      "PMFreak cannot see activity in other workspaces or organizations.",
    generatedAt: now,
  });

  if (context.hasIngestion) {
    signals.push({
      id: `ts-signal-lineage-${context.workspaceId}`,
      signalType: "insight_origin",
      label: "Signal lineage preserved",
      explanation:
        "Every insight generated in your workspace can be traced to the specific ingested signals that informed it.",
      sourceLineage: "Ingestion pipeline — source attribution preserved on write",
      uncertaintyLevel: "low",
      governanceBoundary: null,
      whatPMFreakDoesNotKnow:
        "PMFreak cannot determine signal quality from signal volume alone. Low-quality or sparse ingestion produces lower-confidence insights.",
      generatedAt: now,
    });
  }

  if (!context.hasIngestion) {
    signals.push({
      id: `ts-no-ingestion-${context.workspaceId}`,
      signalType: "knowledge_gap",
      label: "No signals ingested yet",
      explanation:
        "PMFreak currently has no operational signals to work with. All insights shown are empty states, not operational intelligence.",
      sourceLineage: "Absence of ingestion activity",
      uncertaintyLevel: "high",
      governanceBoundary: null,
      whatPMFreakDoesNotKnow:
        "PMFreak knows nothing about your operational state until signals are ingested. It cannot infer from silence.",
      generatedAt: now,
    });
  }

  if (context.hasConnectors) {
    signals.push({
      id: `ts-connector-attribution-${context.workspaceId}`,
      signalType: "signal_source",
      label: "Connector source attribution active",
      explanation:
        "Each federated connector maintains its own source attribution. You can see which system contributed each signal.",
      sourceLineage: "Connector federation layer — per-connector lineage tags",
      uncertaintyLevel: "low",
      governanceBoundary:
        "Connector data is isolated to the configuring workspace. No cross-tenant connector correlation occurs.",
      whatPMFreakDoesNotKnow:
        "PMFreak cannot assess signal quality from connectors it has not processed. New connectors require time to build confidence.",
      generatedAt: now,
    });
  }

  signals.push({
    id: `ts-assumption-declaration-${context.workspaceId}`,
    signalType: "assumption_declaration",
    label: "Operational assumptions declared",
    explanation:
      "PMFreak makes explicit assumptions when generating insights. These assumptions are listed alongside every insight that relies on them.",
    sourceLineage: "Insight generation pipeline — assumption logging",
    uncertaintyLevel: "medium",
    governanceBoundary: null,
    whatPMFreakDoesNotKnow:
      "PMFreak cannot know whether its assumptions match your organizational reality. Review assumptions on each insight.",
    generatedAt: now,
  });

  signals.push({
    id: `ts-uncertainty-disclosure-${context.workspaceId}`,
    signalType: "uncertainty_disclosure",
    label: "Bounded uncertainty disclosed on all insights",
    explanation:
      "PMFreak discloses confidence levels and knowledge gaps on every insight it generates. It does not claim false certainty.",
    sourceLineage: "Core platform design principle",
    uncertaintyLevel: "low",
    governanceBoundary: null,
    whatPMFreakDoesNotKnow:
      "PMFreak cannot quantify what it does not know about your specific organizational context. Uncertainty disclosures reflect known unknowns, not unknown unknowns.",
    generatedAt: now,
  });

  return signals;
}

export function retrieveGovernanceExplanations(): Array<{
  concept: string;
  explanation: string;
  boundaryDescription: string;
}> {
  return [
    {
      concept: "Tenant Isolation",
      explanation:
        "Your workspace is completely isolated from all other PMFreak workspaces at the database level. Operational data cannot leak across organizational boundaries.",
      boundaryDescription:
        "Row-level security enforced at the Supabase database layer for all operational tables.",
    },
    {
      concept: "Role-Scoped Visibility",
      explanation:
        "What you see in PMFreak depends on your role. Viewers see sanitized summaries. PMs see full operational detail. Admins and owners can configure governance boundaries.",
      boundaryDescription:
        "Role enforcement at API route level and UI rendering level.",
    },
    {
      concept: "Source Lineage",
      explanation:
        "Every operational insight includes a traceable path back to the signals that informed it. Lineage cannot be modified after ingestion.",
      boundaryDescription: "Immutable source attribution logged at ingestion time.",
    },
    {
      concept: "Approval Boundaries",
      explanation:
        "PMFreak's autonomous intervention runtime requires human authorization before executing any recommended action. No intervention bypasses human approval.",
      boundaryDescription:
        "Governance approval gates enforced in the intervention runtime for all action types.",
    },
    {
      concept: "Bounded Uncertainty",
      explanation:
        "PMFreak explicitly states what it does not know alongside every insight. It never claims certainty it does not have.",
      boundaryDescription:
        "Uncertainty disclosure is a core design constraint, not an optional feature.",
    },
  ];
}
