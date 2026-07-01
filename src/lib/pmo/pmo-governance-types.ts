export type PmoType =
  | "internal"
  | "client-delivery"
  | "consulting"
  | "startup-product"
  | "enterprise-portfolio";

export type Language = "english" | "spanish" | "bilingual";

export type GovernanceStyle = "lightweight" | "standard" | "strict-enterprise";

export type ApprovalModel =
  | "pm-only"
  | "pm-pmo-lead"
  | "pm-finance-technical"
  | "executive-approval";

export type ReportingCadence = "weekly" | "biweekly" | "monthly";

export type EscalationCadence =
  | "as-needed"
  | "weekly-review"
  | "formal-escalation-board";

export type ReviewFrequency = "weekly" | "biweekly" | "monthly" | "per-milestone";

export type EscalationSeverity = "low" | "medium" | "high" | "critical";

export type TimeThreshold = "same-day" | "24-hours" | "48-hours" | "1-week";

export type SuggestedTone = "diplomatic" | "direct" | "executive" | "urgent";

export type PMORole = {
  id: string;
  roleName: string;
  personName: string;
  email: string;
  responsibility: string;
  approvalAuthority: boolean;
  escalationAuthority: boolean;
};

export type DeliveryControl = {
  id: string;
  name: string;
  enabled: boolean;
  ownerRole: string;
  reviewFrequency: ReviewFrequency;
  requiredEvidence: string;
  escalationThreshold: string;
};

export type EscalationRule = {
  id: string;
  triggerName: string;
  enabled: boolean;
  severity: EscalationSeverity;
  firstAction: string;
  escalateToRole: string;
  timeThreshold: TimeThreshold;
  suggestedTone: SuggestedTone;
};

export type PMOIdentity = {
  name: string;
  organization: string;
  pmoType: PmoType | "";
  industry: string;
  language: Language | "";
  timeZone: string;
};

export type PMOGovernanceModel = {
  governanceStyle: GovernanceStyle | "";
  approvalModel: ApprovalModel | "";
  reportingCadence: ReportingCadence | "";
  escalationCadence: EscalationCadence | "";
};

export type PMOGovernanceSkeleton = {
  identity: PMOIdentity;
  governanceModel: PMOGovernanceModel;
  roles: PMORole[];
  deliveryControls: DeliveryControl[];
  escalationRules: EscalationRule[];
  createdAt: string;
  updatedAt: string;
};
