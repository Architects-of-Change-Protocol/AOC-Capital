export type ScopeType = "closed" | "open" | "iterative" | "discovery";

export type ProjectIdentity = {
  projectName: string;
  clientOrganization: string;
  projectType: string;
  contractCode: string;
  pmAssigned: string;
  technicalLead: string;
  targetDeliveryDate: string;
};

export type DeliveryContext = {
  problemStatement: string;
  mainDeliverable: string;
  externalDependencies: string;
  contractualMilestones: string;
  scopeType: ScopeType;
};

export type GovernanceSkeleton = {
  raidInitialized: boolean;
  stakeholdersInitialized: boolean;
  deliveryCadenceInitialized: boolean;
  reportingStructureInitialized: boolean;
  escalationMapInitialized: boolean;
  healthBaselineInitialized: boolean;
};

export type IntelligenceDiscovery = {
  unknowns: string;
  requirementsDefined: boolean | null;
  pendingClientDependencies: string;
  pendingAccesses: string;
  vendorDependencies: string;
  financialBlockers: string;
};

export type ProjectOnboardingPayload = {
  identity: ProjectIdentity;
  deliveryContext: DeliveryContext;
  governance: GovernanceSkeleton;
  discovery: IntelligenceDiscovery;
  createdAt: string;
};

export const PROJECT_TYPES = [
  { value: "software-delivery", label: "Software Delivery", desc: "Product or platform engineering" },
  { value: "infrastructure", label: "Infrastructure", desc: "Cloud, network, or systems work" },
  { value: "digital-transformation", label: "Digital Transformation", desc: "Org-wide change programme" },
  { value: "consulting-engagement", label: "Consulting Engagement", desc: "Client advisory or delivery" },
  { value: "regulatory-compliance", label: "Regulatory / Compliance", desc: "Audit, certification, or mandate" },
  { value: "data-analytics", label: "Data & Analytics", desc: "Data platform, BI, or AI initiative" },
  { value: "process-improvement", label: "Process Improvement", desc: "Operational efficiency programme" },
  { value: "other", label: "Other", desc: "Custom or unclassified initiative" },
] as const;

export const SCOPE_TYPES: Array<{ value: ScopeType; label: string; desc: string }> = [
  { value: "closed", label: "Closed Scope", desc: "Fixed requirements, defined contract" },
  { value: "open", label: "Open Scope", desc: "Evolving requirements, flexible delivery" },
  { value: "iterative", label: "Iterative", desc: "Phased delivery, sprint-based" },
  { value: "discovery", label: "Under Discovery", desc: "Requirements still being defined" },
];

export const DEFAULT_GOVERNANCE: GovernanceSkeleton = {
  raidInitialized: true,
  stakeholdersInitialized: true,
  deliveryCadenceInitialized: true,
  reportingStructureInitialized: true,
  escalationMapInitialized: true,
  healthBaselineInitialized: true,
};
