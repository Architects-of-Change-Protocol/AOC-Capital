export type RuntimeAuthoritySource = "enterprise-runtime" | "policy-simulation" | "compatibility-adapter";

export type RuntimeScope = {
  tenantId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
};

export type RuntimeMetadata = {
  source: "pmfreak-runtime-consumer" | "sdk-route" | "runtime-wrapper";
  routeId: string;
  requestId?: string;
  environment?: string;
  status?: string;
  requiredApprovalType?: string | null;
  reviewerRoleRequired?: string | null;
  trace?: Record<string, unknown>;
  scope?: RuntimeScope;
  evaluatedAt?: string;
  extra?: Record<string, unknown>;
};
