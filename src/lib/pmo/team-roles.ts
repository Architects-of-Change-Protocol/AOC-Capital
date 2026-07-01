export type PmoTeamRole =
  | "PMO_OWNER"
  | "PMO_ADMIN"
  | "PROJECT_MANAGER"
  | "PROGRAM_MANAGER"
  | "PORTFOLIO_MANAGER"
  | "EXECUTIVE_VIEWER"
  | "TECHNICAL_LEAD"
  | "RESOURCE_MANAGER"
  | "FINANCE_OWNER"
  | "STAKEHOLDER"
  | "VIEWER";

export type PmoDomainFocus =
  | "scope"
  | "timeline"
  | "cost"
  | "quality"
  | "resources"
  | "stakeholders"
  | "executive-reporting"
  | "portfolio-governance";

export type PmoRolePermissions = {
  canInviteMembers: boolean;
  canEditGovernance: boolean;
  canCreateProjects: boolean;
  canManageProjects: boolean;
  canViewExecutiveSynthesis: boolean;
  canAccessFinancialData: boolean;
  canModifyAgentConfig: boolean;
  canViewPortfolio: boolean;
  canUploadOperationalDocs: boolean;
};

export type PmoRoleMeta = {
  role: PmoTeamRole;
  label: string;
  description: string;
  authorityLevel: number; // 1 (lowest) – 10 (highest)
  permissions: PmoRolePermissions;
};

const FULL_PERMISSIONS: PmoRolePermissions = {
  canInviteMembers: true,
  canEditGovernance: true,
  canCreateProjects: true,
  canManageProjects: true,
  canViewExecutiveSynthesis: true,
  canAccessFinancialData: true,
  canModifyAgentConfig: true,
  canViewPortfolio: true,
  canUploadOperationalDocs: true,
};

export const PMO_ROLE_META: Record<PmoTeamRole, PmoRoleMeta> = {
  PMO_OWNER: {
    role: "PMO_OWNER",
    label: "PMO Owner",
    description: "Full governance authority. Controls all configuration, agent policy, and team access.",
    authorityLevel: 10,
    permissions: FULL_PERMISSIONS,
  },
  PMO_ADMIN: {
    role: "PMO_ADMIN",
    label: "PMO Admin",
    description: "Operational authority. Can invite members, manage projects, and modify governance.",
    authorityLevel: 9,
    permissions: {
      canInviteMembers: true,
      canEditGovernance: true,
      canCreateProjects: true,
      canManageProjects: true,
      canViewExecutiveSynthesis: true,
      canAccessFinancialData: true,
      canModifyAgentConfig: true,
      canViewPortfolio: true,
      canUploadOperationalDocs: true,
    },
  },
  PORTFOLIO_MANAGER: {
    role: "PORTFOLIO_MANAGER",
    label: "Portfolio Manager",
    description: "Oversees portfolio-level governance, programme arbitration, and investment alignment.",
    authorityLevel: 8,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: true,
      canCreateProjects: true,
      canManageProjects: true,
      canViewExecutiveSynthesis: true,
      canAccessFinancialData: true,
      canModifyAgentConfig: false,
      canViewPortfolio: true,
      canUploadOperationalDocs: true,
    },
  },
  PROGRAM_MANAGER: {
    role: "PROGRAM_MANAGER",
    label: "Programme Manager",
    description: "Coordinates interdependencies across multiple projects. Manages delivery outcomes.",
    authorityLevel: 7,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: true,
      canManageProjects: true,
      canViewExecutiveSynthesis: true,
      canAccessFinancialData: true,
      canModifyAgentConfig: false,
      canViewPortfolio: true,
      canUploadOperationalDocs: true,
    },
  },
  FINANCE_OWNER: {
    role: "FINANCE_OWNER",
    label: "Finance Owner",
    description: "Responsible for budget oversight, cost governance, and financial reporting.",
    authorityLevel: 7,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: false,
      canViewExecutiveSynthesis: true,
      canAccessFinancialData: true,
      canModifyAgentConfig: false,
      canViewPortfolio: true,
      canUploadOperationalDocs: true,
    },
  },
  PROJECT_MANAGER: {
    role: "PROJECT_MANAGER",
    label: "Project Manager",
    description: "Manages delivery of individual projects. Full control over assigned project scope.",
    authorityLevel: 6,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: true,
      canManageProjects: true,
      canViewExecutiveSynthesis: false,
      canAccessFinancialData: false,
      canModifyAgentConfig: false,
      canViewPortfolio: false,
      canUploadOperationalDocs: true,
    },
  },
  TECHNICAL_LEAD: {
    role: "TECHNICAL_LEAD",
    label: "Technical Lead",
    description: "Provides delivery intelligence on technical risk, quality, and timeline dependencies.",
    authorityLevel: 5,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: true,
      canViewExecutiveSynthesis: false,
      canAccessFinancialData: false,
      canModifyAgentConfig: false,
      canViewPortfolio: false,
      canUploadOperationalDocs: true,
    },
  },
  RESOURCE_MANAGER: {
    role: "RESOURCE_MANAGER",
    label: "Resource Manager",
    description: "Manages capacity, allocation, and team availability across projects.",
    authorityLevel: 5,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: false,
      canViewExecutiveSynthesis: false,
      canAccessFinancialData: false,
      canModifyAgentConfig: false,
      canViewPortfolio: true,
      canUploadOperationalDocs: true,
    },
  },
  EXECUTIVE_VIEWER: {
    role: "EXECUTIVE_VIEWER",
    label: "Executive Viewer",
    description: "Senior stakeholder with read-only access to executive synthesis and portfolio reporting.",
    authorityLevel: 4,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: false,
      canViewExecutiveSynthesis: true,
      canAccessFinancialData: true,
      canModifyAgentConfig: false,
      canViewPortfolio: true,
      canUploadOperationalDocs: false,
    },
  },
  STAKEHOLDER: {
    role: "STAKEHOLDER",
    label: "Stakeholder",
    description: "Business stakeholder with visibility into relevant project status and governance outcomes.",
    authorityLevel: 3,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: false,
      canViewExecutiveSynthesis: false,
      canAccessFinancialData: false,
      canModifyAgentConfig: false,
      canViewPortfolio: false,
      canUploadOperationalDocs: false,
    },
  },
  VIEWER: {
    role: "VIEWER",
    label: "Viewer",
    description: "Read-only access to permitted project and governance data.",
    authorityLevel: 1,
    permissions: {
      canInviteMembers: false,
      canEditGovernance: false,
      canCreateProjects: false,
      canManageProjects: false,
      canViewExecutiveSynthesis: false,
      canAccessFinancialData: false,
      canModifyAgentConfig: false,
      canViewPortfolio: false,
      canUploadOperationalDocs: false,
    },
  },
};

export const PMO_ROLES_ORDERED: PmoTeamRole[] = [
  "PMO_OWNER",
  "PMO_ADMIN",
  "PORTFOLIO_MANAGER",
  "PROGRAM_MANAGER",
  "FINANCE_OWNER",
  "PROJECT_MANAGER",
  "TECHNICAL_LEAD",
  "RESOURCE_MANAGER",
  "EXECUTIVE_VIEWER",
  "STAKEHOLDER",
  "VIEWER",
];

export const PMO_DOMAIN_FOCUS_META: Record<PmoDomainFocus, { label: string; description: string }> = {
  scope: { label: "Scope", description: "Delivery boundaries, change control, and requirements management" },
  timeline: { label: "Timeline", description: "Schedule, milestones, and critical path analysis" },
  cost: { label: "Cost", description: "Budget tracking, financial forecasting, and cost control" },
  quality: { label: "Quality", description: "Standards, review gates, and defect governance" },
  resources: { label: "Resources", description: "Capacity planning, allocation, and team management" },
  stakeholders: { label: "Stakeholders", description: "Engagement, communications, and political risk" },
  "executive-reporting": { label: "Executive Reporting", description: "Portfolio synthesis and senior leadership briefings" },
  "portfolio-governance": { label: "Portfolio Governance", description: "Investment decisions and programme arbitration" },
};

export const PMO_DOMAIN_FOCUS_OPTIONS: PmoDomainFocus[] = [
  "scope",
  "timeline",
  "cost",
  "quality",
  "resources",
  "stakeholders",
  "executive-reporting",
  "portfolio-governance",
];
