import type { OnboardingStep } from "../types/enterprise-ux-types";

export function buildOnboardingChecklist(): OnboardingStep[] {
  return [
    // workspace_readiness
    {
      id: "workspace-name",
      category: "workspace_readiness",
      label: "Name your workspace",
      description: "Give your operational workspace a name that reflects your team or program.",
      explanation:
        "The workspace is the boundary within which PMFreak coordinates operational memory, governance, and project signals. A clear name anchors trust and attribution.",
      governanceNote:
        "Workspace identity is used for source lineage. Renaming after ingestion may affect attribution clarity.",
      estimatedImpact:
        "Establishes the governance boundary for all operational signals.",
      trustImplication:
        "All insights will be attributed to this workspace. Transparency starts here.",
      status: "pending",
      order: 1,
      skippable: false,
    },
    {
      id: "governance-expectations",
      category: "governance_readiness",
      label: "Declare governance expectations",
      description: "Specify what approval and delegation expectations your organization has.",
      explanation:
        "PMFreak uses governance boundaries to ensure that operational coordination does not bypass human decision authority. Declaring expectations early prevents governance drift.",
      governanceNote:
        "Governance expectations cannot be retroactively applied to already-ingested signals without re-processing.",
      estimatedImpact:
        "Ensures operational intelligence remains aligned with organizational decision authority.",
      trustImplication:
        "Users will see governance boundaries on all interventions and insights. Builds trust in automated coordination.",
      status: "pending",
      order: 2,
      skippable: true,
    },

    // project_readiness
    {
      id: "first-project",
      category: "project_readiness",
      label: "Create your first project",
      description: "Add a project that PMFreak will track for operational signals.",
      explanation:
        "Projects are the primary unit of operational coordination. PMFreak builds survivability models, escalation paths, and memory around project boundaries.",
      governanceNote:
        "Project creation is tenant-scoped. Projects cannot be shared across workspaces without explicit federation configuration.",
      estimatedImpact:
        "Enables operational pulse tracking, survivability modeling, and first-value insights.",
      trustImplication:
        "First project unlocks the war-room and operational memory. This is the primary trust milestone.",
      status: "pending",
      order: 3,
      skippable: false,
    },

    // connector_readiness
    {
      id: "connector-intention",
      category: "connector_readiness",
      label: "Select connector intentions",
      description: "Indicate which systems you plan to federate (Jira, Slack, GitHub, Calendar).",
      explanation:
        "Connector federation allows PMFreak to correlate operational pressure across systems while preserving source lineage and governance boundaries. You do not need live OAuth yet — declaring intentions is sufficient to unlock educational guidance.",
      governanceNote:
        "No real data is ingested until OAuth is configured and explicitly authorized.",
      estimatedImpact:
        "Unlocks federation value explanations, lineage preview, and connector-specific empty-state guidance.",
      trustImplication:
        "Connector intentions are visible to workspace admins for governance transparency.",
      status: "pending",
      order: 4,
      skippable: true,
    },

    // ingestion_readiness
    {
      id: "first-ingestion",
      category: "ingestion_readiness",
      label: "Complete first operational ingestion",
      description:
        "Ingest your first operational signal — a meeting note, blocker, or status update.",
      explanation:
        "Operational ingestion is how PMFreak begins building contextual memory. The first ingestion triggers survivability modeling and begins populating the war-room with real operational signals.",
      governanceNote:
        "Ingested content is stored with workspace-scoped isolation. It cannot be accessed outside tenant boundaries.",
      estimatedImpact:
        "Unlocks war-room operational pulse, first survivability signal, and first operational narrative.",
      trustImplication:
        "PMFreak will disclose what it knows, what it inferred, and what it does not know — starting from this ingestion.",
      status: "pending",
      order: 5,
      skippable: false,
    },

    // war_room_readiness
    {
      id: "war-room-access",
      category: "war_room_readiness",
      label: "Access the operational war-room",
      description: "Visit the Command Center to see your first operational view.",
      explanation:
        "The war-room consolidates survivability signals, escalation paths, intervention recommendations, and operational narratives. First access is guided to reduce intimidation.",
      governanceNote:
        "War-room visibility is role-scoped. Viewers see sanitized summaries. PMs and admins see full operational detail.",
      estimatedImpact:
        "Completes the operational cognition loop: ingestion → memory → insight → action.",
      trustImplication:
        "All war-room insights include source lineage and uncertainty disclosures.",
      status: "pending",
      order: 6,
      skippable: false,
    },

    // executive_readiness
    {
      id: "executive-digest",
      category: "executive_readiness",
      label: "Generate first executive digest",
      description:
        "Produce your first executive-facing operational summary from live signals.",
      explanation:
        "The executive digest translates operational complexity into stakeholder-appropriate narratives. It includes uncertainty disclosures and governance boundaries to prevent over-reliance on automated summaries.",
      governanceNote:
        "Executive digests are generated from real ingested signals, not fabricated. Uncertainty is always disclosed.",
      estimatedImpact:
        "Completes first-value cycle and enables executive stakeholder communication.",
      trustImplication:
        "Executives receive bounded-certainty language. PMFreak does not claim false operational omniscience.",
      status: "pending",
      order: 7,
      skippable: true,
    },
  ];
}
