import type {
  DiagnosticCategory,
  EnterpriseUXDiagnosticIssue,
  EnterpriseUXDiagnosticsReport,
  OnboardingState,
} from "../types/enterprise-ux-types";

export function buildEnterpriseUXDiagnosticsReport(
  onboardingState: OnboardingState | null,
  context: {
    workspaceId: string;
    hasProjects: boolean;
    hasIngestion: boolean;
    hasConnectors: boolean;
    hasWarRoomAccess: boolean;
    hasExecutiveDigest: boolean;
  }
): EnterpriseUXDiagnosticsReport {
  const issues: EnterpriseUXDiagnosticIssue[] = [];

  // Onboarding blockers
  if (!onboardingState || onboardingState.cognitionReadiness === "uninitialized") {
    issues.push({
      id: "diag-onboarding-not-started",
      category: "onboarding_blocker",
      severity: "blocking",
      description:
        "Workspace onboarding has not been started. Operational cognition is unavailable.",
      recommendation:
        "Guide the user through workspace bootstrap to establish the governance boundary and first operational context.",
      affectedRoute: "/getting-started",
    });
  }

  if (!context.hasProjects) {
    issues.push({
      id: "diag-no-projects",
      category: "onboarding_blocker",
      severity: "blocking",
      description:
        "No projects exist. Survivability modeling, war-room activation, and first-value insights are all unavailable.",
      recommendation:
        "Surface the project bootstrap UX with educational context about why project creation unlocks operational cognition.",
      affectedRoute: "/projects",
    });
  }

  // Trust blockers
  if (!context.hasIngestion) {
    issues.push({
      id: "diag-no-ingestion",
      category: "trust_blocker",
      severity: "blocking",
      description:
        "No operational signals have been ingested. All visible metrics reflect empty state, not operational intelligence.",
      recommendation:
        "Surface bounded-uncertainty empty states that honestly explain the absence of data rather than showing empty dashboards.",
      affectedRoute: "/input-hub",
    });
  }

  // Empty state confusion risks
  if (!context.hasIngestion && context.hasWarRoomAccess) {
    issues.push({
      id: "diag-war-room-empty-confusion",
      category: "empty_state_confusion",
      severity: "warning",
      description:
        "User accessed the war-room before any signals were ingested. An empty war-room without explanation may erode trust.",
      recommendation:
        "Display the first war-room experience guide with explainers for operational pulse, survivability, and propagation concepts.",
      affectedRoute: "/command-center",
    });
  }

  // Connector confusion risks
  if (!context.hasConnectors) {
    issues.push({
      id: "diag-no-connector-context",
      category: "connector_confusion",
      severity: "info",
      description:
        "No connector intentions have been declared. Users may not understand the federation value of PMFreak's connector architecture.",
      recommendation:
        "Surface connector onboarding UX with federation value explanations and governance context. Do not require OAuth to deliver educational value.",
      affectedRoute: "/getting-started",
    });
  }

  // War room overload risks
  if (context.hasIngestion && context.hasWarRoomAccess && !onboardingState?.completedStepIds.includes("war-room-access")) {
    issues.push({
      id: "diag-war-room-no-orientation",
      category: "war_room_overload",
      severity: "warning",
      description:
        "User accessed the war-room without completing the war-room orientation step. Operational concepts may be misunderstood.",
      recommendation:
        "Surface the guided war-room experience with concept explainers for operational pulse, survivability, and propagation.",
      affectedRoute: "/command-center",
    });
  }

  // Cognition misunderstanding risks
  if (!onboardingState?.completedStepIds.includes("first-project")) {
    issues.push({
      id: "diag-guided-cognition-not-started",
      category: "cognition_misunderstanding",
      severity: "info",
      description:
        "Guided cognition tour has not been started. Users may not understand what PMFreak's operational cognition actually does.",
      recommendation:
        "Surface the guided cognition experience early in the onboarding flow to set accurate expectations.",
      affectedRoute: "/getting-started",
    });
  }

  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const blockingCount = issues.filter((i) => i.severity === "blocking").length;

  const overallReadiness =
    blockingCount > 0
      ? "not_ready"
      : warningCount > 0
        ? "partial"
        : "ready";

  return {
    generatedAt: new Date().toISOString(),
    issues,
    warningCount,
    blockingCount,
    overallReadiness,
  };
}

export function retrieveIssuesByCategory(
  report: EnterpriseUXDiagnosticsReport,
  category: DiagnosticCategory
): EnterpriseUXDiagnosticIssue[] {
  return report.issues.filter((i) => i.category === category);
}
